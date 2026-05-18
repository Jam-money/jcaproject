import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import type { TaskRow, TaskStatus, TaskPriority, ProfileRow } from "@/lib/db";
import { logAudit, PRIORITY_META, STATUS_META } from "@/lib/db";
import { useAuth } from "@/lib/auth";

export function TaskDialog({ open, onOpenChange, task }: {
  open: boolean; onOpenChange: (o: boolean) => void; task: TaskRow | null;
}) {
  const { role, user } = useAuth();
  const isAdmin = role === "admin";
  const [title, setTitle] = useState(""); const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("pending"); const [priority, setPriority] = useState<TaskPriority>("medium");
  const [progress, setProgress] = useState(0); const [due, setDue] = useState(""); const [assignedTo, setAssignedTo] = useState<string>("");
  const [profiles, setProfiles] = useState<ProfileRow[]>([]); const [comments, setComments] = useState<any[]>([]); const [newComment, setNewComment] = useState("");
  const [busy, setBusy] = useState(false);
  const canEditAll = isAdmin;
  const canUpdateProgress = isAdmin || task?.assigned_to === user?.id;

  useEffect(() => {
    if (!open) return;
    void (async () => {
      const { data } = await supabase.from("profiles").select("*");
      setProfiles(data ?? []);
    })();
  }, [open]);

  useEffect(() => {
    if (task) {
      setTitle(task.title); setDescription(task.description ?? ""); setStatus(task.status); setPriority(task.priority);
      setProgress(task.progress); setAssignedTo(task.assigned_to ?? ""); setDue(task.due_date ? format(new Date(task.due_date), "yyyy-MM-dd'T'HH:mm") : "");
      void loadComments(task.id);
    } else {
      setTitle(""); setDescription(""); setStatus("pending"); setPriority("medium"); setProgress(0); setAssignedTo(""); setDue(""); setComments([]);
    }
  }, [task, open]);

  const loadComments = async (tid: string) => {
    const { data } = await supabase.from("task_comments").select("*, profiles:user_id(full_name)").eq("task_id", tid).order("created_at");
    setComments(data ?? []);
  };

  const save = async () => {
    setBusy(true);
    const payload: any = {
      title, description, status, priority, progress,
      assigned_to: assignedTo || null,
      due_date: due ? new Date(due).toISOString() : null,
    };
    if (status === "completed") payload.progress = 100;
    let res;
    if (task) {
      // assignee can only update progress/status; RLS enforces but limit client too
      if (!canEditAll) {
        const limited: any = { status, progress };
        if (status === "completed") limited.progress = 100;
        res = await supabase.from("tasks").update(limited).eq("id", task.id).select().single();
      } else {
        res = await supabase.from("tasks").update(payload).eq("id", task.id).select().single();
      }
    } else {
      res = await supabase.from("tasks").insert({ ...payload, created_by: user!.id }).select().single();
    }
    setBusy(false);
    if (res.error) return toast.error(res.error.message);
    await logAudit("task", res.data.id, task ? "updated" : "created", { title, status });
    if (task && assignedTo && assignedTo !== task.assigned_to && canEditAll) {
      await supabase.from("notifications").insert({ user_id: assignedTo, title: "New task assigned", body: title, link: "/tasks" });
    }
    toast.success(task ? "Task updated" : "Task created");
    onOpenChange(false);
  };
  const del = async () => {
    if (!task) return; setBusy(true);
    const { error } = await supabase.from("tasks").delete().eq("id", task.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    await logAudit("task", task.id, "deleted", { title: task.title });
    toast.success("Task deleted"); onOpenChange(false);
  };
  const addComment = async () => {
    if (!task || !newComment.trim()) return;
    const { error } = await supabase.from("task_comments").insert({ task_id: task.id, user_id: user!.id, body: newComment.trim() });
    if (error) return toast.error(error.message);
    setNewComment(""); await loadComments(task.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{task ? "Task details" : "New task"}</DialogTitle></DialogHeader>
        <div className="grid md:grid-cols-[1fr_240px] gap-4">
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Title</Label><Input value={title} onChange={e=>setTitle(e.target.value)} disabled={!canEditAll && !!task}/></div>
            <div className="space-y-1.5"><Label>Description</Label><Textarea rows={4} value={description} onChange={e=>setDescription(e.target.value)} disabled={!canEditAll && !!task}/></div>
            {task && (
              <div className="pt-2 border-t border-border">
                <Label className="mb-2 block">Updates & comments</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {comments.length === 0 && <p className="text-xs text-muted-foreground">No comments yet.</p>}
                  {comments.map(c => (
                    <div key={c.id} className="text-sm p-2 rounded-lg bg-muted">
                      <div className="text-xs text-muted-foreground mb-0.5">{c.profiles?.full_name ?? "User"} · {format(new Date(c.created_at), "MMM d, p")}</div>
                      {c.body}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <Input placeholder="Write an update…" value={newComment} onChange={e=>setNewComment(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addComment()}/>
                  <Button variant="outline" onClick={addComment}>Post</Button>
                </div>
              </div>
            )}
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Status</Label>
              <Select value={status} onValueChange={v=>{ const s = v as TaskStatus; setStatus(s); if (s==="completed") setProgress(100); }} disabled={!canUpdateProgress && !!task}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>{(["pending","ongoing","completed"] as TaskStatus[]).map(s=><SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Priority</Label>
              <Select value={priority} onValueChange={v=>setPriority(v as TaskPriority)} disabled={!canEditAll && !!task}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>{(["low","medium","high","urgent"] as TaskPriority[]).map(s=><SelectItem key={s} value={s}>{PRIORITY_META[s].label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Due</Label>
              <Input type="datetime-local" value={due} onChange={e=>setDue(e.target.value)} disabled={!canEditAll && !!task}/>
            </div>
            <div className="space-y-1.5"><Label>Assign to</Label>
              <Select value={assignedTo || "_none"} onValueChange={v=>setAssignedTo(v==="_none"?"":v)} disabled={!canEditAll && !!task}>
                <SelectTrigger><SelectValue placeholder="Unassigned"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Unassigned</SelectItem>
                  {profiles.map(p=> <SelectItem key={p.id} value={p.id}>{p.full_name ?? p.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Progress · {progress}%</Label>
              <Slider value={[progress]} onValueChange={v=>setProgress(v[0])} max={100} step={5} disabled={!canUpdateProgress && !!task}/>
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2">
          {task && canEditAll && <Button variant="destructive" onClick={del} disabled={busy}>Delete</Button>}
          <Button variant="outline" onClick={()=>onOpenChange(false)}>Cancel</Button>
          {(canEditAll || (canUpdateProgress && task)) && <Button onClick={save} disabled={busy || !title}>{task ? "Save" : "Create"}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
