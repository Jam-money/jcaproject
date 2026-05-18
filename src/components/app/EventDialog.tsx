import { useEffect, useState } from "react";
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

export function EventDialog({ open, onOpenChange, event, defaultDate, canEdit }: {
  open: boolean; onOpenChange: (o: boolean) => void; event: EventRow | null;
  defaultDate?: Date; canEdit: boolean;
}) {
  const [title, setTitle] = useState(""); const [description, setDescription] = useState("");
  const [type, setType] = useState<EventType>("meeting"); const [location, setLocation] = useState("");
  const [start, setStart] = useState(""); const [end, setEnd] = useState(""); const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (event) {
      setTitle(event.title); setDescription(event.description ?? ""); setType(event.event_type);
      setLocation(event.location ?? ""); setNotes(event.notes ?? "");
      setStart(format(new Date(event.start_time), "yyyy-MM-dd'T'HH:mm"));
      setEnd(format(new Date(event.end_time), "yyyy-MM-dd'T'HH:mm"));
    } else {
      const d = defaultDate ?? new Date();
      const s = new Date(d); s.setHours(9, 0, 0, 0);
      const e = new Date(d); e.setHours(10, 0, 0, 0);
      setTitle(""); setDescription(""); setType("meeting"); setLocation(""); setNotes("");
      setStart(format(s, "yyyy-MM-dd'T'HH:mm")); setEnd(format(e, "yyyy-MM-dd'T'HH:mm"));
    }
  }, [event, defaultDate, open]);

  const save = async () => {
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    const payload = { title, description, event_type: type, location, notes, start_time: new Date(start).toISOString(), end_time: new Date(end).toISOString() };
    let res;
    if (event) res = await supabase.from("events").update(payload).eq("id", event.id).select().single();
    else res = await supabase.from("events").insert({ ...payload, created_by: user!.id }).select().single();
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
    toast.success("Event deleted"); onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{event ? (canEdit ? "Edit event" : "View event") : "New event"}</DialogTitle></DialogHeader>
        <fieldset disabled={!canEdit} className="space-y-3">
          <div className="space-y-1.5"><Label>Title</Label><Input value={title} onChange={e=>setTitle(e.target.value)}/></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Type</Label>
              <Select value={type} onValueChange={v=>setType(v as EventType)} disabled={!canEdit}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                  <SelectItem value="schedule">Schedule</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Location</Label><Input value={location} onChange={e=>setLocation(e.target.value)}/></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Start</Label><Input type="datetime-local" value={start} onChange={e=>setStart(e.target.value)}/></div>
            <div className="space-y-1.5"><Label>End</Label><Input type="datetime-local" value={end} onChange={e=>setEnd(e.target.value)}/></div>
          </div>
          <div className="space-y-1.5"><Label>Description</Label><Textarea rows={2} value={description} onChange={e=>setDescription(e.target.value)}/></div>
          <div className="space-y-1.5"><Label>Notes / agenda</Label><Textarea rows={3} value={notes} onChange={e=>setNotes(e.target.value)}/></div>
        </fieldset>
        <DialogFooter className="gap-2">
          {event && canEdit && <Button variant="destructive" onClick={del} disabled={busy}>Delete</Button>}
          <Button variant="outline" onClick={()=>onOpenChange(false)}>{canEdit ? "Cancel" : "Close"}</Button>
          {canEdit && <Button onClick={save} disabled={busy || !title || !start || !end}>{event ? "Save" : "Create"}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
