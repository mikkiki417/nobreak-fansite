// コメント承認用 Edge Function（Supabaseにデプロイ済み・パスワード認証）
// パスワードは public.nobreak_admin テーブル(service_roleのみ読める)に保存。
// デプロイ: Supabase MCP / CLI から。verify_jwt=false（本体でパスワード認証するため）。
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...cors, "content-type": "application/json" } });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); }
  const { password, action, id } = body || {};

  // パスワード照合（nobreak_admin は service_role のみアクセス可）
  const { data: adm } = await sb.from("nobreak_admin").select("password").eq("id", 1).maybeSingle();
  if (!adm || !password || password !== adm.password) return json({ error: "unauthorized" }, 401);

  if (action === "list") {
    const { data, error } = await sb.from("nobreak_comments")
      .select("id,created_at,entry_date,name,body,approved")
      .order("created_at", { ascending: false });
    if (error) return json({ error: error.message }, 500);
    return json({ comments: data });
  }
  if (action === "approve" || action === "unapprove") {
    if (!id) return json({ error: "no id" }, 400);
    const { error } = await sb.from("nobreak_comments").update({ approved: action === "approve" }).eq("id", id);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  }
  if (action === "delete") {
    if (!id) return json({ error: "no id" }, 400);
    const { error } = await sb.from("nobreak_comments").delete().eq("id", id);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  }
  return json({ error: "bad action" }, 400);
});
