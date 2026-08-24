import "server-only";
import { requireInstagramConfig } from "./instagram-config";
import { decryptSecret } from "./instagram-crypto";
import { nextContainerAction, PublishMediaSchema } from "./instagram-domain";
import { MetaApiError, MetaInstagramClient } from "./meta-instagram";
import { createAdminClient } from "./supabase/admin";

type JobRow = { id:string; workspace_id:string; payload:Record<string,unknown>; attempts:number; max_attempts:number };

async function failJob(job:JobRow,scheduleId:string,code:string,message:string,reconnect=false){
  const admin=createAdminClient();
  await Promise.all([
    admin.from("jobs").update({status:"FAILED",attempts:job.attempts+1,completed_at:new Date().toISOString(),error_code:code,error_message:message,progress:{stage:"PUBLISH_FAILED",percent:100}}).eq("id",job.id),
    admin.from("post_schedules").update({status:"PUBLISH_FAILED",last_error_code:code,last_error_message:message,updated_at:new Date().toISOString()}).eq("id",scheduleId),
    admin.from("notifications").insert({workspace_id:job.workspace_id,kind:"PUBLISH_FAILED",title:reconnect?"Instagramの再接続が必要です":"Instagram投稿を確認してください",action_url:"/operate"}),
  ]);
}

export async function processOneInstagramPublishJob() {
  const admin=createAdminClient();
  const now=new Date().toISOString();
  const {data:candidate,error:findError}=await admin.from("jobs").select("id,workspace_id,payload,attempts,max_attempts").eq("type","INSTAGRAM_PUBLISH").eq("status","QUEUED").lte("scheduled_at",now).order("scheduled_at",{ascending:true}).limit(1).maybeSingle();
  if(findError)throw findError;if(!candidate)return{status:"IDLE" as const};
  const {data:job,error:claimError}=await admin.from("jobs").update({status:"RUNNING",started_at:now,lease_expires_at:new Date(Date.now()+10*60*1000).toISOString(),progress:{stage:"VALIDATING_APPROVAL",percent:10}}).eq("id",candidate.id).eq("status","QUEUED").select("id,workspace_id,payload,attempts,max_attempts").maybeSingle();
  if(claimError)throw claimError;if(!job)return{status:"RACE_LOST" as const};
  const typedJob=job as JobRow;const scheduleId=String(typedJob.payload.scheduleId??"");
  try{
    const {data:schedule}=await admin.from("post_schedules").select("id,workspace_id,content_item_id,content_version_id,instagram_account_id,media_asset_ids,approval_id,status,meta_container_id,external_media_id,publish_payload").eq("id",scheduleId).eq("workspace_id",typedJob.workspace_id).maybeSingle();
    if(!schedule?.approval_id||!["SCHEDULED","PUBLISHING"].includes(schedule.status))throw new Error("approved_schedule_required");
    const [{data:approval},{data:account},{data:capabilities},{data:version},{data:assets}]=await Promise.all([
      admin.from("approvals").select("decision,subject_version").eq("id",schedule.approval_id).maybeSingle(),
      admin.from("instagram_accounts").select("external_account_id,connection_status,token_ciphertext,token_expires_at").eq("id",schedule.instagram_account_id).maybeSingle(),
      admin.from("instagram_capabilities").select("publishing,reels,carousel").eq("instagram_account_id",schedule.instagram_account_id).maybeSingle(),
      admin.from("content_versions").select("payload").eq("id",schedule.content_version_id).maybeSingle(),
      admin.from("media_assets").select("id,storage_bucket,storage_key,media_type,is_customer_media").in("id",schedule.media_asset_ids),
    ]);
    if(approval?.decision!=="APPROVED"||approval.subject_version!==schedule.content_version_id)throw new Error("approval_version_mismatch");
    if(!account?.token_ciphertext||account.connection_status!=="CONNECTED"||new Date(account.token_expires_at)<=new Date())throw new Error("token_reconnect_required");
    if(!capabilities?.publishing)throw new Error("publishing_capability_required");
    if(!version||!assets||assets.length!==schedule.media_asset_ids.length)throw new Error("approved_media_missing");
    const config=requireInstagramConfig();const client=new MetaInstagramClient(decryptSecret(account.token_ciphertext,config.encryptionKey),config.apiVersion);
    let containerId=schedule.meta_container_id as string|null;
    if(!containerId){
      const urls:string[]=[];for(const asset of assets){const {data,error}=await admin.storage.from(asset.storage_bucket||"video-assets").createSignedUrl(asset.storage_key,60*60);if(error||!data?.signedUrl)throw new Error("signed_media_url_failed");urls.push(data.signedUrl);}
      const contentType=String(schedule.publish_payload.contentType??"");
      const publishInput=PublishMediaSchema.parse({kind:contentType==="REELS"?"REELS":"CAROUSEL",mediaUrls:urls,mediaTypes:assets.map((asset)=>asset.media_type.startsWith("video/")?"VIDEO":"IMAGE"),caption:String(version.payload.caption??""),shareToFeed:true});
      containerId=await client.preparePublication(account.external_account_id,publishInput);
      await Promise.all([
        admin.from("post_schedules").update({status:"PUBLISHING",meta_container_id:containerId,updated_at:new Date().toISOString()}).eq("id",scheduleId),
        admin.from("jobs").update({status:"QUEUED",scheduled_at:new Date(Date.now()+60_000).toISOString(),progress:{stage:"CONTAINER_PROCESSING",percent:45},lease_expires_at:null}).eq("id",typedJob.id),
      ]);
      return{status:"CONTAINER_CREATED" as const,jobId:typedJob.id,containerId};
    }
    const containerStatus=await client.getContainerStatus(containerId);const action=nextContainerAction(containerStatus);
    if(action==="POLL_LATER"){
      await admin.from("jobs").update({status:"QUEUED",scheduled_at:new Date(Date.now()+60_000).toISOString(),progress:{stage:"CONTAINER_PROCESSING",percent:60},lease_expires_at:null}).eq("id",typedJob.id);
      return{status:"POLL_LATER" as const,jobId:typedJob.id};
    }
    if(action==="FAIL")throw new Error(`container_${containerStatus.toLowerCase()}`);
    let mediaId=schedule.external_media_id as string|null;
    if(action==="PUBLISH"){
      mediaId=await client.publishContainer(account.external_account_id,containerId);
      await admin.from("post_schedules").update({external_media_id:mediaId,updated_at:new Date().toISOString()}).eq("id",scheduleId);
    }
    if(!mediaId)throw new Error("published_media_id_recovery_required");
    const media=await client.getPublishedMedia(mediaId);
    const {data:published,error:publishStoreError}=await admin.from("published_posts").upsert({workspace_id:typedJob.workspace_id,instagram_account_id:schedule.instagram_account_id,content_item_id:schedule.content_item_id,content_version_id:schedule.content_version_id,publish_job_id:typedJob.id,external_media_id:mediaId,permalink:media.permalink??null,published_at:media.timestamp??new Date().toISOString()},{onConflict:"instagram_account_id,external_media_id"}).select("id").single();
    if(publishStoreError)throw publishStoreError;
    await Promise.all([
      admin.from("jobs").update({status:"SUCCEEDED",completed_at:new Date().toISOString(),progress:{stage:"PUBLISHED",percent:100},lease_expires_at:null}).eq("id",typedJob.id),
      admin.from("post_schedules").update({status:"PUBLISHED",updated_at:new Date().toISOString(),last_error_code:null,last_error_message:null}).eq("id",scheduleId),
      admin.from("content_items").update({status:"PUBLISHED"}).eq("id",schedule.content_item_id),
      admin.from("audit_logs").insert({workspace_id:typedJob.workspace_id,action:"instagram.publish.succeeded",subject_type:"published_post",subject_id:published.id,metadata:{jobId:typedJob.id,contentVersionId:schedule.content_version_id}}),
    ]);
    return{status:"PUBLISHED" as const,jobId:typedJob.id,mediaId,permalink:media.permalink??null};
  }catch(error){
    const reconnect=error instanceof MetaApiError?(error.status===401||error.status===403||error.code===190):error instanceof Error&&error.message==="token_reconnect_required";
    const code=error instanceof MetaApiError?`META_${error.code??error.status}`:error instanceof Error?error.message:"UNKNOWN";
    await failJob(typedJob,scheduleId,code,reconnect?"Instagramの再接続が必要です。":"投稿処理を完了できませんでした。",reconnect);
    return{status:"FAILED" as const,jobId:typedJob.id,code};
  }
}
