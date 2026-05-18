import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { format, isToday, isAfter, parseISO, addDays } from "date-fns";
import { CalendarDays, CheckCircle2, ListTodo, Clock, AlertTriangle, TrendingUp, Activity } from "lucide-react";
import { STATUS_META, PRIORITY_META, type TaskRow, type EventRow } from "@/lib/db";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_app/dashboard")({ component: Dashboard });

function Dashboard() {
  const { profile, role } = useAuth();
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [{ data: t }, { data: e }] = await Promise.all([
        supabase.from("tasks").select("*").order("created_at", { ascending: false }),
        supabase.from("events").select("*").gte("end_time", new Date().toISOString()).order("start_time"),
      ]);
      setTasks(t ?? []); setEvents(e ?? []); setLoading(false);
    };
    void load();
    const ch = supabase.channel("dash")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, load)
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, []);

  const todayEvents = events.filter(e => isToday(parseISO(e.start_time)));
  const upcoming = events.slice(0, 5);
  const pending = tasks.filter(t => t.status === "pending");
  const ongoing = tasks.filter(t => t.status === "ongoing");
  const completed = tasks.filter(t => t.status === "completed");
  const priority = [...tasks].filter(t => t.status !== "completed" && (t.priority === "urgent" || t.priority === "high"))
    .sort((a,b) => (a.priority === "urgent" ? -1 : 1)).slice(0,5);
  const completionRate = tasks.length ? Math.round((completed.length / tasks.length) * 100) : 0;

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-semibold">Good {greet()}, {profile?.full_name?.split(" ")[0] ?? "there"}</h1>
        <p className="text-sm text-muted-foreground mt-1">Here's what's on the Regional Director's plate {role === "admin" ? "to coordinate" : "today"}.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={CalendarDays} label="Today's schedule" value={todayEvents.length} sub={`${upcoming.length} upcoming`} tone="info"/>
        <Stat icon={ListTodo}     label="Pending tasks"    value={pending.length}     sub={`${ongoing.length} ongoing`} tone="warning"/>
        <Stat icon={CheckCircle2} label="Completed"        value={completed.length}   sub={`${completionRate}% rate`} tone="success"/>
        <Stat icon={AlertTriangle}label="Priority"         value={priority.length}    sub="High & urgent" tone="destructive"/>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-2 shadow-soft">
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
            <h2 className="font-semibold">Priority tasks</h2>
            <Link to="/tasks" className="text-sm text-primary hover:underline">All tasks</Link>
          </div>
          {priority.length === 0 ? <Empty icon={AlertTriangle} title="No urgent items" sub="Great work."/> : (
            <ul className="space-y-3">
              {priority.map(t => (
                <li key={t.id} className="flex items-start gap-3 p-3 rounded-lg border border-border hover:border-primary/40 transition-colors">
                  <span className={`mt-1 h-2 w-2 rounded-full ${STATUS_META[t.status].dot}`}/>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{t.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{t.due_date ? `Due ${format(parseISO(t.due_date),"MMM d")}` : "No due date"}</div>
                  </div>
                  <Badge className={PRIORITY_META[t.priority].color + " border-0 text-[10px]"}>{PRIORITY_META[t.priority].label}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-2 shadow-soft">
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
                  <Badge variant="outline" className="capitalize">{ev.event_type}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-6 shadow-soft">
          <h2 className="font-semibold mb-4 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary"/>Monthly performance</h2>
          <div className="space-y-4">
            <Bar label="Completion" value={completionRate} tone="success"/>
            <Bar label="On time" value={onTimeRate(tasks)} tone="info"/>
            <Bar label="In progress" value={tasks.length ? Math.round((ongoing.length / tasks.length)*100) : 0} tone="warning"/>
          </div>
          <div className="mt-6 pt-4 border-t border-border">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2"><Activity className="h-4 w-4 text-primary"/>Recent activity</h3>
            <ActivityFeed tasks={tasks}/>
          </div>
        </Card>
      </div>
    </div>
  );
}

function greet() { const h = new Date().getHours(); return h < 12 ? "morning" : h < 18 ? "afternoon" : "evening"; }
function onTimeRate(tasks: TaskRow[]) {
  const done = tasks.filter(t => t.status === "completed" && t.due_date);
  if (!done.length) return 0;
  const ot = done.filter(t => isAfter(parseISO(t.due_date!), parseISO(t.updated_at))).length;
  return Math.round((ot / done.length) * 100);
}

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
      <Badge variant="outline" className="capitalize text-xs">{ev.event_type}</Badge>
    </li>
  );
}
function Bar({ label, value, tone }: { label: string; value: number; tone: "success"|"info"|"warning" }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5"><span className="text-muted-foreground">{label}</span><span className="font-medium">{value}%</span></div>
      <Progress value={value} className="h-2"/>
    </div>
  );
}
function ActivityFeed({ tasks }: { tasks: TaskRow[] }) {
  const recent = [...tasks].sort((a,b) => b.updated_at.localeCompare(a.updated_at)).slice(0,4);
  if (!recent.length) return <p className="text-xs text-muted-foreground">No recent activity.</p>;
  return (
    <ul className="space-y-2">
      {recent.map(t => (
        <li key={t.id} className="text-xs flex items-start gap-2">
          <span className={`mt-1 h-1.5 w-1.5 rounded-full ${STATUS_META[t.status].dot}`}/>
          <div className="flex-1"><span className="font-medium">{t.title}</span> <span className="text-muted-foreground">marked {STATUS_META[t.status].label.toLowerCase()}</span><div className="text-muted-foreground/70">{format(parseISO(t.updated_at), "MMM d, p")}</div></div>
        </li>
      ))}
    </ul>
  );
}
function Empty({ icon: Icon, title, sub }: { icon: any; title: string; sub: string }) {
  return <div className="text-center py-8 text-muted-foreground"><Icon className="h-8 w-8 mx-auto mb-2 opacity-50"/><div className="text-sm font-medium text-foreground">{title}</div><div className="text-xs">{sub}</div></div>;
}
function Skeleton() { return <div className="space-y-2">{[1,2,3].map(i=><div key={i} className="h-12 rounded-lg bg-muted animate-pulse"/>)}</div>; }
// keep addDays imported for tree-shake safety
void addDays;
