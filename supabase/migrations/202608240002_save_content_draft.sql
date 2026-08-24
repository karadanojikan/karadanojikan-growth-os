-- Atomic, RLS-aware content draft creation for authenticated workspace members.
create or replace function public.save_content_draft(
  p_workspace_id uuid,
  p_content_type text,
  p_objective text,
  p_topic text,
  p_payload jsonb,
  p_scheduled_for timestamptz
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_content_id uuid;
  created_version_id uuid;
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'workspace membership required' using errcode = '42501';
  end if;
  if p_objective not in ('GROWTH','TRUST','LIFESTYLE','CONVERSION') then
    raise exception 'invalid objective' using errcode = '22023';
  end if;

  insert into public.content_items (
    workspace_id, content_type, objective, topic, status, scheduled_for, created_by
  ) values (
    p_workspace_id, p_content_type, p_objective, p_topic, 'DRAFT', p_scheduled_for, (select auth.uid())
  ) returning id into created_content_id;

  insert into public.content_versions (
    workspace_id, content_item_id, version, payload, created_by
  ) values (
    p_workspace_id, created_content_id, 1, p_payload, (select auth.uid())
  ) returning id into created_version_id;

  update public.content_items set current_version_id = created_version_id where id = created_content_id;

  insert into public.audit_logs (workspace_id, actor_user_id, action, subject_type, subject_id, metadata)
  values (p_workspace_id, (select auth.uid()), 'content.draft.created', 'content_item', created_content_id::text, jsonb_build_object('version', 1));

  return created_content_id;
end;
$$;

revoke all on function public.save_content_draft(uuid,text,text,text,jsonb,timestamptz) from public, anon;
grant execute on function public.save_content_draft(uuid,text,text,text,jsonb,timestamptz) to authenticated;
