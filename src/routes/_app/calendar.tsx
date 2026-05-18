import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { addDays, addMonths, addWeeks, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, parseISO, startOfDay, startOfMonth, startOfWeek, subMonths, subWeeks } from "date-fns";
import { EventDialog } from "@/components/app/EventDialog";
import { useAuth } from "@/lib/auth";
import type { EventRow } from "@/lib/db";

export const Route = createFileRoute("/_app/calendar")({ component: CalendarPage });

type View = "month" | "week" | "day";

function CalendarPage() {
  const { role } = useAuth();
  const canEdit = role === "admin";
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState(new Date());
  const [events, setEvents] = useState<EventRow[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EventRow | null>(null);
  const [defaultDate, setDefaultDate] = useState<Date | undefined>();

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("events").select("*").order("start_time");
      setEvents(data ?? []);
    };
    void load();
    const ch = supabase.channel("cal").on("postgres_changes", { event: "*", schema: "public", table: "events" }, load).subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, []);

  const days = useMemo(() => {
    if (view === "month") return eachDayOfInterval({ start: startOfWeek(startOfMonth(cursor)), end: endOfWeek(endOfMonth(cursor)) });
    if (view === "week")  return eachDayOfInterval({ start: startOfWeek(cursor), end: endOfWeek(cursor) });
    return [cursor];
  }, [cursor, view]);

  const evByDay = (d: Date) => events.filter(e => isSameDay(parseISO(e.start_time), d));

  const nav = (dir: -1 | 1) => {
    if (view === "month") setCursor(dir === 1 ? addMonths(cursor, 1) : subMonths(cursor, 1));
    else if (view === "week") setCursor(dir === 1 ? addWeeks(cursor, 1) : subWeeks(cursor, 1));
    else setCursor(addDays(cursor, dir));
  };

  const openNew = (d?: Date) => { setEditing(null); setDefaultDate(d); setDialogOpen(true); };
  const openEdit = (e: EventRow) => { setEditing(e); setDialogOpen(true); };

  // DnD: admins move events between days (changes the date but keeps time)
  const onDrop = async (id: string, target: Date) => {
    if (!canEdit) return;
    const ev = events.find(e => e.id === id); if (!ev) return;
    const s = parseISO(ev.start_time), e = parseISO(ev.end_time);
    const ns = new Date(target); ns.setHours(s.getHours(), s.getMinutes());
    const ne = new Date(target); ne.setHours(e.getHours(), e.getMinutes());
    await supabase.from("events").update({ start_time: ns.toISOString(), end_time: ne.toISOString() }).eq("id", id);
  };

  return (
    <div className="space-y-4 max-w-7xl">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Calendar</h1>
          <p className="text-sm text-muted-foreground">{format(cursor, view === "day" ? "EEEE, MMM d, yyyy" : "MMMM yyyy")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={view} onValueChange={v=>setView(v as View)}>
            <TabsList><TabsTrigger value="day">Day</TabsTrigger><TabsTrigger value="week">Week</TabsTrigger><TabsTrigger value="month">Month</TabsTrigger></TabsList>
          </Tabs>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={()=>nav(-1)}><ChevronLeft className="h-4 w-4"/></Button>
            <Button variant="outline" size="sm" onClick={()=>setCursor(new Date())}>Today</Button>
            <Button variant="outline" size="icon" onClick={()=>nav(1)}><ChevronRight className="h-4 w-4"/></Button>
          </div>
          {canEdit && <Button onClick={()=>openNew()}><Plus className="h-4 w-4 mr-1"/>New event</Button>}
        </div>
      </div>

      <Card className="shadow-soft overflow-hidden">
        {view === "month" && (
          <>
            <div className="grid grid-cols-7 bg-muted/50 text-xs font-medium text-muted-foreground">
              {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=><div key={d} className="px-2 py-2 text-center">{d}</div>)}
            </div>
            <div className="grid grid-cols-7">
              {days.map(d => {
                const inMonth = isSameMonth(d, cursor);
                const evs = evByDay(d);
                const today = isSameDay(d, startOfDay(new Date()));
                return (
                  <div key={d.toISOString()}
                    onDragOver={canEdit ? e=>e.preventDefault() : undefined}
                    onDrop={canEdit ? e=>{ const id = e.dataTransfer.getData("text/plain"); void onDrop(id, d); } : undefined}
                    onClick={() => canEdit && openNew(d)}
                    className={`min-h-[110px] p-2 border-t border-r border-border ${canEdit ? "cursor-pointer hover:bg-muted/40" : ""} ${inMonth ? "" : "bg-muted/20 text-muted-foreground"}`}>
                    <div className={`text-xs font-semibold mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full ${today ? "bg-primary text-primary-foreground" : ""}`}>{format(d,"d")}</div>
                    <div className="space-y-1">
                      {evs.slice(0,3).map(ev => (
                        <div key={ev.id} draggable={canEdit}
                          onDragStart={e=>e.dataTransfer.setData("text/plain", ev.id)}
                          onClick={e=>{e.stopPropagation(); openEdit(ev);}}
                          className="text-[11px] truncate px-1.5 py-0.5 rounded bg-primary-soft text-primary border border-primary/20 hover:bg-primary/15">
                          <span className="font-medium">{format(parseISO(ev.start_time),"HH:mm")}</span> {ev.title}
                        </div>
                      ))}
                      {evs.length > 3 && <div className="text-[10px] text-muted-foreground">+{evs.length - 3} more</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {view !== "month" && (
          <div className="divide-y divide-border">
            {days.map(d => {
              const evs = evByDay(d);
              return (
                <div key={d.toISOString()} className="grid grid-cols-[120px_1fr]">
                  <div className="p-4 bg-muted/40 border-r border-border">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">{format(d,"EEE")}</div>
                    <div className="text-2xl font-bold">{format(d,"d")}</div>
                    <div className="text-xs text-muted-foreground">{format(d,"MMM")}</div>
                  </div>
                  <div className="p-3 space-y-2 min-h-[120px]"
                    onDragOver={canEdit ? e=>e.preventDefault() : undefined}
                    onDrop={canEdit ? e=>{ const id = e.dataTransfer.getData("text/plain"); void onDrop(id, d); } : undefined}>
                    {evs.length === 0 && <div className="text-xs text-muted-foreground h-full grid place-items-center">No events</div>}
                    {evs.map(ev => (
                      <button key={ev.id} draggable={canEdit}
                        onDragStart={e=>e.dataTransfer.setData("text/plain", ev.id)}
                        onClick={()=>openEdit(ev)}
                        className="w-full text-left px-3 py-2 rounded-lg bg-primary-soft text-primary border border-primary/20 hover:bg-primary/15 transition-colors">
                        <div className="font-medium text-sm">{ev.title}</div>
                        <div className="text-xs opacity-80">{format(parseISO(ev.start_time),"p")} – {format(parseISO(ev.end_time),"p")} · {ev.location ?? "—"}</div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <EventDialog open={dialogOpen} onOpenChange={setDialogOpen} event={editing} defaultDate={defaultDate} canEdit={canEdit}/>
    </div>
  );
}
