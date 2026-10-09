import { supabase } from "@/integrations/supabase/client";

/**
 * Returns the in-app path (and search params) a notification should open.
 * Old event notifications were saved with a bare "/calendar" link, so we recover the
 * event by title ("You're invited: <title>" / `For event "<title>"`) to still open its dialog.
 */
export async function resolveNotifLink(n: { link?: string | null; title?: string | null; body?: string | null }): Promise<{ path: string; search: Record<string, string> } | null> {
  if (!n.link) return null;
  const [path, qs] = String(n.link).split("?");
  const search: Record<string, string> = qs ? Object.fromEntries(new URLSearchParams(qs)) : {};
  if (path === "/calendar" && !search.open) {
    const title = n.title?.match(/^You're invited: (.+)$/)?.[1] ?? n.body?.match(/For event "(.+?)"/)?.[1];
    if (title) {
      const { data } = await supabase.from("events").select("id").eq("title", title).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (data?.id) search.open = data.id;
    }
  }
  return { path, search };
}
