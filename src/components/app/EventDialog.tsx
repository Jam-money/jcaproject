import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { EventRow, EventType } from "@/lib/db";
import { logAudit } from "@/lib/db";
import { format } from "date-fns";
import { ChevronDown, X } from "lucide-react";

// ── Attendee config ──────────────────────────────────────────────────────────
const ATTENDEES = [
  { value: "RD",    label: "RD",    dot: "#ef4444", bg: "#fef2f2", text: "#b91c1c", border: "#fca5a5" },
  { value: "JBT",   label: "JBT",   dot: "#eab308", bg: "#fefce8", text: "#854d0e", border: "#fde047" },
  { value: "SOCD",  label: "SOCD",  dot: "#22c55e", bg: "#f0fdf4", text: "#15803d", border: "#86efac" },
  { value: "CRASD", label: "CRASD", dot: "#3b82f6", bg: "#eff6ff", text: "#1d4ed8", border: "#93c5fd" },
] as const;

type AttendeeValue = typeof ATTENDEES[number]["value"];

// ── Attendee multi-select component ──────────────────────────────────────────
function AttendeeSelect({
  value,
  onChange,
  disabled,
}: {
  value: AttendeeValue[];
  onChange: (v: AttendeeValue[]) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (v: AttendeeValue) => {
    onChange(value.includes(v) ? value.filter(x => x !== v) : [...value, v]);
  };

  const remove = (v: AttendeeValue, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter(x => x !== v));
  };

  return (
    <div ref={ref} className="relative">
      {/* Trigger box */}
      <div
        onClick={() => !disabled && setOpen(o => !o)}
        className={[
          "min-h-[38px] w-full flex flex-wrap gap-1.5 items-center px-3 py-1.5 rounded-md border border-input bg-background text-sm",
          disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:border-ring/50",
        ].join(" ")}
      >
        {value.length === 0 && (
          <span className="text-muted-foreground">Select attendees…</span>
        )}

        {value.map(v => {
          const a = ATTENDEES.find(x => x.value === v)!;
          return (
            <span
              key={v}
              style={{ background: a.bg, color: a.text, borderColor: a.border }}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border"
            >
              <span style={{ background: a.dot }} className="w-2 h-2 rounded-full shrink-0" />
              {a.label}
              {!disabled && (
                <button
                  type="button"
                  onClick={e => remove(v, e)}
                  className="ml-0.5 opacity-60 hover:opacity-100"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          );
        })}

        {!disabled && (
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground ml-auto shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          />
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md overflow-hidden">
          {ATTENDEES.map(a => {
            const selected = value.includes(a.value);
            return (
              <div
                key={a.value}
                onClick={() => toggle(a.value)}
                className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer text-sm transition-colors select-none
                  ${selected ? "bg-muted/70" : "hover:bg-muted/40"}`}
              >
                {/* Colored dot */}
                <span
                  style={{ background: a.dot }}
                  className="w-3 h-3 rounded-full shrink-0"
                />
                {/* Pill */}
                <span
                  style={{ background: a.bg, color: a.text, borderColor: a.border }}
                  className="px-2 py-0.5 rounded-full text-xs font-semibold border"
                >
                  {a.label}
                </span>
                {/* Checkmark */}
                {selected && (
                  <span className="ml-auto text-primary font-bold text-xs">✓</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main dialog ───────────────────────────────────────────────────────────────
export function EventDialog({ open, onOpenChange, event, defaultDate, canEdit }: {
  open: boolean; onOpenChange: (o: boolean) => void; event: EventRow | null;
  defaultDate?: Date; canEdit: boolean;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<EventType>("meeting");
  const [location, setLocation] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [notes, setNotes] = useState("");
  const [attendees, setAttendees] = useState<AttendeeValue[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description ?? "");
      setType(event.event_type);
      setLocation(event.location ?? "");
      setNotes(event.notes ?? "");
      setAttendees((event as any).attendees ?? []);
      setStart(format(new Date(event.start_time), "yyyy-MM-dd'T'HH:mm"));
      setEnd(format(new Date(event.end_time), "yyyy-MM-dd'T'HH:mm"));
    } else {
      const d = defaultDate ?? new Date();
      const s = new Date(d); s.setHours(9, 0, 0, 0);
      const e = new Date(d); e.setHours(10, 0, 0, 0);
      setTitle(""); setDescription(""); setType("meeting");
      setLocation(""); setNotes(""); setAttendees([]);
      setStart(format(s, "yyyy-MM-dd'T'HH:mm"));
      setEnd(format(e, "yyyy-MM-dd'T'HH:mm"));
    }
  }, [event, defaultDate, open]);

  const save = async () => {
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    const payload = {
      title,
      description,
      event_type: type,
      location,
      notes,
      attendees,                                        // ← saved to DB
      start_time: new Date(start).toISOString(),
      end_time:   new Date(end).toISOString(),
    };
    let res;
    if (event) res = await supabase.from("events").update(payload).eq("id", event.id).select().single();
    else        res = await supabase.from("events").insert({ ...payload, created_by: user!.id }).select().single();
    setBusy(false);
    if (res.error) return toast.error(res.error.message);
    await logAudit("event", res.data.id, event ? "updated" : "created", { title });
    toast.success(event ? "Event updated" : "Event created");
    onOpenChange(false);
  };

  const del = async () => {
    if (!event) return;
    setBusy(true);
    const { error } = await supabase.from("events").delete().eq("id", event.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    await logAudit("event", event.id, "deleted", { title: event.title });
    toast.success("Event deleted");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{event ? (canEdit ? "Edit event" : "View event") : "New event"}</DialogTitle>
        </DialogHeader>

        <fieldset disabled={!canEdit} className="space-y-3">
          {/* Title */}
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} />
          </div>

          {/* Type + Location */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={v => setType(v as EventType)} disabled={!canEdit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                  <SelectItem value="schedule">Schedule</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Input value={location} onChange={e => setLocation(e.target.value)} />
            </div>
          </div>

          {/* Start + End */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start</Label>
              <Input type="datetime-local" value={start} onChange={e => setStart(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>End</Label>
              <Input type="datetime-local" value={end} onChange={e => setEnd(e.target.value)} />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notes / agenda</Label>
            <Textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          {/* Who will attend ← NEW */}
          <div className="space-y-1.5">
            <Label>Who will attend</Label>
            <AttendeeSelect
              value={attendees}
              onChange={setAttendees}
              disabled={!canEdit}
            />
          </div>
        </fieldset>

        <DialogFooter className="gap-2">
          {event && canEdit && (
            <Button variant="destructive" onClick={del} disabled={busy}>Delete</Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {canEdit ? "Cancel" : "Close"}
          </Button>
          {canEdit && (
            <Button onClick={save} disabled={busy || !title || !start || !end}>
              {event ? "Save" : "Create"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
