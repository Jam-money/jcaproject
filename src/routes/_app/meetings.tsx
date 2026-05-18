import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, MapPin, Clock, Search } from "lucide-react";
import { format, parseISO, isPast } from "date-fns";
import { EventDialog } from "@/components/app/EventDialog";
import { useAuth } from "@/lib/auth";
import type { EventRow } from "@/lib/db";

export const Route = createFileRoute("/_app/meetings")({ component: Meetings });

function Meetings() {
  const { role } = useAuth();
  const canEdit = role === "admin";
  const [events, setEvents] = useState<EventRow[]>([]);
  const [q, setQ] = useState(""); const [open, setOpen] = useState(false); const [editing, setEditing] = useState<EventRow | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("events").select("*").order("start_time", { ascending: false });
      setEvents(data ?? []);
    };
    void load();
    const ch = supabase.channel("meet").on("postgres_changes", { event: "*", schema: "public", table: "events" }, load).subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, []);

  const filtered = events.filter(e => !q || e.title.toLowerCase().includes(q.toLowerCase()) || (e.location ?? "").toLowerCase().includes(q.toLowerCase()));
  const upcoming = filtered.filter(e => !isPast(parseISO(e.end_time)));
  const past = filtered.filter(e => isPast(parseISO(e.end_time)));

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Meetings & schedule</h1>
          <p className="text-sm text-muted-foreground">Full agenda for the Regional Director.</p>
        </div>
        {canEdit && <Button onClick={()=>{setEditing(null); setOpen(true);}}><Plus className="h-4 w-4 mr-1"/>Schedule</Button>}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
        <Input placeholder="Search meetings…" value={q} onChange={e=>setQ(e.target.value)} className="pl-9"/>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Upcoming · {upcoming.length}</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {upcoming.map(ev => <MeetingCard key={ev.id} ev={ev} onClick={()=>{setEditing(ev); setOpen(true);}}/>)}
          {upcoming.length === 0 && <p className="text-sm text-muted-foreground">No upcoming meetings.</p>}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Past · {past.length}</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {past.slice(0,12).map(ev => <MeetingCard key={ev.id} ev={ev} onClick={()=>{setEditing(ev); setOpen(true);}} muted/>)}
          {past.length === 0 && <p className="text-sm text-muted-foreground">No past meetings.</p>}
        </div>
      </section>

      <EventDialog open={open} onOpenChange={setOpen} event={editing} canEdit={canEdit}/>
    </div>
  );
}

function MeetingCard({ ev, onClick, muted }: { ev: EventRow; onClick: () => void; muted?: boolean }) {
  return (
    <Card onClick={onClick} className={`p-4 cursor-pointer hover:shadow-elevated transition-all shadow-soft ${muted ? "opacity-70" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-medium">{ev.title}</h3>
        <Badge variant="outline" className="capitalize shrink-0">{ev.event_type}</Badge>
      </div>
      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-2"><Clock className="h-3.5 w-3.5"/>{format(parseISO(ev.start_time),"EEE, MMM d · p")} – {format(parseISO(ev.end_time),"p")}</div>
        {ev.location && <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5"/>{ev.location}</div>}
      </div>
      {ev.description && <p className="text-sm mt-2 line-clamp-2">{ev.description}</p>}
    </Card>
  );
}
