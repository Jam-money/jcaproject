import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FileDown, History } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { TaskRow, EventRow } from "@/lib/db";
import { STATUS_META, PRIORITY_META } from "@/lib/db";

export const Route = createFileRoute("/_app/reports")({ component: Reports });

function Reports() {
  const [tasks, setTasks] = useState<TaskRow[]>([]); const [events, setEvents] = useState<EventRow[]>([]); const [logs, setLogs] = useState<any[]>([]);
  useEffect(() => {
    void (async () => {
      const [{ data: t }, { data: e }, { data: a }] = await Promise.all([
        supabase.from("tasks").select("*"),
        supabase.from("events").select("*").order("start_time"),
        supabase.from("audit_logs").select("*, profiles:actor_id(full_name)").order("created_at", { ascending: false }).limit(30),
      ]);
      setTasks(t ?? []); setEvents(e ?? []); setLogs(a ?? []);
    })();
  }, []);

  const byStatus = (s: any) => tasks.filter(t => t.status === s).length;
  const total = tasks.length || 1;
  const completion = Math.round((byStatus("completed") / total) * 100);

  const exportPDF = () => {
    if (typeof window !== "undefined") window.print();
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-semibold">Reports & history</h1><p className="text-sm text-muted-foreground">Office performance summary.</p></div>
        <Button onClick={exportPDF}><FileDown className="h-4 w-4 mr-1"/>Export PDF</Button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-5 shadow-soft">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Overall completion</div>
          <div className="text-4xl font-bold mt-2">{completion}%</div>
          <Progress value={completion} className="mt-3 h-2"/>
        </Card>
        <Card className="p-5 shadow-soft">
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-3">Task breakdown</div>
          <ul className="space-y-2">
            {(["pending","ongoing","completed"] as const).map(s => (
              <li key={s} className="flex items-center justify-between text-sm"><span className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${STATUS_META[s].dot}`}/>{STATUS_META[s].label}</span><span className="font-medium">{byStatus(s)}</span></li>
            ))}
          </ul>
        </Card>
        <Card className="p-5 shadow-soft">
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-3">By priority</div>
          <ul className="space-y-2">
            {(["urgent","high","medium","low"] as const).map(p => (
              <li key={p} className="flex items-center justify-between text-sm"><span>{PRIORITY_META[p].label}</span><span className="font-medium">{tasks.filter(t=>t.priority===p).length}</span></li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="p-6 shadow-soft">
        <h2 className="font-semibold mb-3">Full schedule</h2>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b border-border"><th className="py-2">Title</th><th>Type</th><th>Start</th><th>Location</th></tr></thead>
          <tbody>
            {events.slice(0,30).map(e => (
              <tr key={e.id} className="border-b border-border/50"><td className="py-2 font-medium">{e.title}</td><td className="capitalize text-muted-foreground">{e.event_type}</td><td className="text-muted-foreground">{format(parseISO(e.start_time),"MMM d, p")}</td><td className="text-muted-foreground">{e.location ?? "—"}</td></tr>
            ))}
            {events.length === 0 && <tr><td className="py-4 text-muted-foreground" colSpan={4}>No events.</td></tr>}
          </tbody>
        </table>
      </Card>

      <Card className="p-6 shadow-soft">
        <h2 className="font-semibold mb-3 flex items-center gap-2"><History className="h-4 w-4"/>Audit log</h2>
        <ul className="space-y-2 text-sm">
          {logs.map(l => (
            <li key={l.id} className="flex items-start gap-3 py-2 border-b border-border/50">
              <span className="text-xs text-muted-foreground whitespace-nowrap mt-0.5">{format(parseISO(l.created_at),"MMM d, p")}</span>
              <span className="flex-1"><span className="font-medium">{l.profiles?.full_name ?? "Someone"}</span> {l.action.replace("_"," ")} {l.entity} {l.details?.title ? `"${l.details.title}"` : ""}</span>
            </li>
          ))}
          {logs.length === 0 && <li className="text-muted-foreground">No activity recorded.</li>}
        </ul>
      </Card>
    </div>
  );
}
