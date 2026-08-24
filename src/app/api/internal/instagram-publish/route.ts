import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { processOneInstagramPublishJob } from "@/lib/instagram-publish-worker";
import { isAutoPublishEnabled } from "@/lib/runtime-config";

function authorized(request:Request){const expected=process.env.CRON_SECRET;const actual=request.headers.get("authorization")?.replace(/^Bearer\s+/i,"")??"";if(!expected||!actual)return false;const a=Buffer.from(actual);const e=Buffer.from(expected);return a.length===e.length&&timingSafeEqual(a,e);}
export async function POST(request:Request){if(!authorized(request))return NextResponse.json({error:"Unauthorized"},{status:401});if(!isAutoPublishEnabled())return NextResponse.json({error:"Publishing disabled"},{status:409});try{return NextResponse.json(await processOneInstagramPublishJob());}catch(error){console.error("instagram_publish_worker_failed",error instanceof Error?error.name:"unknown");return NextResponse.json({error:"Worker unavailable"},{status:503});}}
