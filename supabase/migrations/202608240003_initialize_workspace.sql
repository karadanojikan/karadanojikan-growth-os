-- Authenticated users can create their first workspace exactly once.
create or replace function public.initialize_workspace(p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  created_workspace_id uuid;
begin
  if current_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if exists(select 1 from public.workspace_members where user_id = current_user_id) then
    raise exception 'workspace already exists' using errcode = '23505';
  end if;
  if char_length(trim(p_name)) < 1 or char_length(trim(p_name)) > 80 then
    raise exception 'invalid workspace name' using errcode = '22023';
  end if;

  insert into public.profiles(id) values(current_user_id) on conflict(id) do nothing;
  insert into public.workspaces(name) values(trim(p_name)) returning id into created_workspace_id;
  insert into public.workspace_members(workspace_id,user_id,role) values(created_workspace_id,current_user_id,'owner');
  insert into public.brand_profiles(workspace_id,concept,audience,tone,forbidden_claims)
  values(
    created_workspace_id,
    '40代から、自分の身体をやさしく整え、毎日を軽やかに楽しむためのボディメイク',
    '40代前後の女性',
    '["優しい","落ち着いている","前向き","信頼できる","親しみやすい"]'::jsonb,
    '["必ず治る","絶対改善","身体への劣等感を煽る表現"]'::jsonb
  );
  insert into public.audit_logs(workspace_id,actor_user_id,action,subject_type,subject_id)
  values(created_workspace_id,current_user_id,'workspace.created','workspace',created_workspace_id::text);
  return created_workspace_id;
end;
$$;

revoke all on function public.initialize_workspace(text) from public, anon;
grant execute on function public.initialize_workspace(text) to authenticated;
