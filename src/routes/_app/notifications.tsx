import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_app/notifications")({ component: Notifications });

function Notifications() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      setItems(data ?? []);
    };
    void load();
    const ch = supabase.channel("notif").on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, load).subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [user]);

  const markAll = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-semibold">Notifications</h1><p className="text-sm text-muted-foreground">Reminders, assignments and updates.</p></div>
        <Button variant="outline" onClick={markAll}><CheckCheck className="h-4 w-4 mr-1"/>Mark all read</Button>
      </div>
      {items.length === 0 && (
        <Card className="p-10 text-center text-muted-foreground"><Bell className="h-8 w-8 mx-auto mb-2 opacity-50"/>No notifications yet.</Card>
      )}
      <div className="space-y-2">
        {items.map(n => (
          <Card key={n.id} className={`p-4 flex items-start gap-3 ${n.read ? "opacity-70" : ""}`}>
            <span className={`mt-1.5 h-2 w-2 rounded-full ${n.read ? "bg-muted-foreground" : "bg-primary"}`}/>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium">{n.title}</div>
                <div className="text-xs text-muted-foreground">{format(parseISO(n.created_at), "MMM d, p")}</div>
              </div>
              {n.body && <p className="text-sm text-muted-foreground mt-1">{n.body}</p>}
              {n.link && <Link to={n.link} className="text-xs text-primary hover:underline mt-1 inline-block">Open</Link>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
