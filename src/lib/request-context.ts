import "server-only";
import { createClient } from "./supabase/server";

export class RequestContextError extends Error {
  constructor(readonly status: 401 | 403, message: string) { super(message); }
}

export async function requireWorkspaceContext() {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new RequestContextError(401, "Authentication required.");
  const { data: membership, error: membershipError } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userData.user.id)
    .limit(1)
    .maybeSingle();
  if (membershipError || !membership) throw new RequestContextError(403, "Workspace membership required.");
  return { supabase, userId: userData.user.id, workspaceId: membership.workspace_id as string };
}
