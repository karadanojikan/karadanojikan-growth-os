import { NextResponse } from "next/server";
import { z } from "zod";
import { RequestContextError, requireWorkspaceContext } from "@/lib/request-context";

const InputSchema = z.object({ accountId: z.string().uuid() });

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const { accountId } = InputSchema.parse({ accountId: form.get("accountId") });
    const { supabase } = await requireWorkspaceContext();
    const { error } = await supabase.rpc("disconnect_instagram_v1", { p_instagram_account_id: accountId });
    if (error) throw error;
    return NextResponse.redirect(new URL("/settings/instagram?result=disconnected", request.url), 303);
  } catch (error) {
    if (error instanceof RequestContextError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.redirect(new URL("/settings/instagram?result=failed", request.url), 303);
  }
}
