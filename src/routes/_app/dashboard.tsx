import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, isToday, isAfter, parseISO, addDays } from "date-fns";
import { CalendarDays, Clock, Video, CalendarCheck2 } from "lucide-react";
import { EVENT_TYPE_LABELS, type EventRow } from "@/lib/db";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_app/dashboard")({ component: Dashboard });

function Dashboard() {
  const { profile, role } = useAuth();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: e } = await supabase.from("events").select("*").gte("end_time", new Date().toISOString()).order("start_time");
      setEvents(e ?? []); setLoading(false);
    };
    void load();
    const ch = supabase.channel("dash")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, load)
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, []);

  const todayEvents = events.filter(e => isToday(parseISO(e.start_time)));
  const upcoming    = events.slice(0, 5);
  const thisWeek    = events.filter(e => { const d = parseISO(e.start_time); return isAfter(d, new Date()) && d <= addDays(new Date(), 7); });
  const withLink    = events.filter(e => !!(e as any).meeting_link);

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-semibold">Good {greet()}, {profile?.full_name?.split(" ")[0] ?? "there"}</h1>
        <p className="text-sm text-muted-foreground mt-1">Here's what's on the Regional Director's plate {role === "admin" ? "to coordinate" : "today"}.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={CalendarDays}   label="Today's schedule" value={todayEvents.length} sub={`${events.length} upcoming total`}  tone="info"/>
        <Stat icon={Clock}          label="This week"         value={thisWeek.length}    sub="events scheduled"                   tone="warning"/>
        <Stat icon={Video}          label="Online meetings"   value={withLink.length}    sub="with meeting link"                  tone="success"/>
        <Stat icon={CalendarCheck2} label="Total upcoming"    value={events.length}      sub="all future events"                  tone="destructive"/>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Today's schedule</h2>
            <Link to="/calendar" className="text-sm text-primary hover:underline">View calendar</Link>
          </div>
          {loading ? <Skeleton/> : todayEvents.length === 0 ? (
            <Empty icon={CalendarDays} title="Nothing on today" sub="Your calendar is clear."/>
          ) : (
            <ul className="space-y-3">
              {todayEvents.map(ev => <ScheduleItem key={ev.id} ev={ev}/>)}
            </ul>
          )}
        </Card>

        <Card className="p-6 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Upcoming meetings</h2>
            <Link to="/meetings" className="text-sm text-primary hover:underline">All meetings</Link>
          </div>
          {upcoming.length === 0 ? <Empty icon={CalendarDays} title="No upcoming meetings" sub="Add one from the Meetings page."/> : (
            <ul className="divide-y divide-border">
              {upcoming.map(ev => (
                <li key={ev.id} className="py-3 flex items-center gap-4">
                  <div className="w-14 text-center rounded-lg bg-primary-soft text-primary py-2">
                    <div className="text-[10px] uppercase tracking-wide">{format(parseISO(ev.start_time),"MMM")}</div>
                    <div className="text-lg font-bold leading-none">{format(parseISO(ev.start_time),"d")}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{ev.title}</div>
                    <div className="text-xs text-muted-foreground">{format(parseISO(ev.start_time),"p")} · {ev.location ?? "—"}</div>
                  </div>
                  <Badge variant="outline">{EVENT_TYPE_LABELS[ev.event_type] ?? ev.event_type}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function greet() { const h = new Date().getHours(); return h < 12 ? "morning" : h < 18 ? "afternoon" : "evening"; }

function Stat({ icon: Icon, label, value, sub, tone }: { icon: any; label: string; value: number; sub: string; tone: "info"|"warning"|"success"|"destructive" }) {
  const toneClass = { info: "bg-info/15 text-info", warning: "bg-warning/20 text-warning-foreground", success: "bg-success/15 text-success", destructive: "bg-destructive/15 text-destructive" }[tone];
  return (
    <Card className="p-4 shadow-soft hover:shadow-elevated transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="text-2xl font-bold mt-1">{value}</div>
          <div className="text-xs text-muted-foreground mt-1">{sub}</div>
        </div>
        <div className={`h-10 w-10 rounded-lg grid place-items-center ${toneClass}`}><Icon className="h-5 w-5"/></div>
      </div>
    </Card>
  );
}
function ScheduleItem({ ev }: { ev: EventRow }) {
  return (
    <li className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
      <Clock className="h-4 w-4 text-primary"/>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{ev.title}</div>
        <div className="text-xs text-muted-foreground">{format(parseISO(ev.start_time),"p")} – {format(parseISO(ev.end_time),"p")} · {ev.location ?? "—"}</div>
      </div>
      <Badge variant="outline" className="text-xs">{EVENT_TYPE_LABELS[ev.event_type] ?? ev.event_type}</Badge>
    </li>
  );
}
function Empty({ icon: Icon, title, sub }: { icon: any; title: string; sub: string }) {
  return <div className="text-center py-8 text-muted-foreground"><Icon className="h-8 w-8 mx-auto mb-2 opacity-50"/><div className="text-sm font-medium text-foreground">{title}</div><div className="text-xs">{sub}</div></div>;
}
function Skeleton() { return <div className="space-y-2">{[1,2,3].map(i=><div key={i} className="h-12 rounded-lg bg-muted animate-pulse"/>)}</div>; }
