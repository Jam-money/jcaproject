import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];
export type EventRow = Database["public"]["Tables"]["events"]["Row"];
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type TaskStatus = Database["public"]["Enums"]["task_status"];
export type TaskPriority = Database["public"]["Enums"]["task_priority"];
export type EventType = Database["public"]["Enums"]["event_type"];

export const STATUS_META: Record<TaskStatus, { label: string; color: string; dot: string }> = {
  pending:   { label: "Pending",   color: "bg-muted text-foreground",                       dot: "bg-muted-foreground" },
  ongoing:   { label: "Ongoing",   color: "bg-info/15 text-info-foreground border border-info/30", dot: "bg-info" },
  completed: { label: "Completed", color: "bg-success/15 text-success-foreground border border-success/30", dot: "bg-success" },
};

export const PRIORITY_META: Record<TaskPriority, { label: string; color: string }> = {
  low:    { label: "Low",    color: "bg-muted text-muted-foreground" },
  medium: { label: "Medium", color: "bg-info/15 text-info-foreground" },
  high:   { label: "High",   color: "bg-warning/20 text-warning-foreground" },
  urgent: { label: "Urgent", color: "bg-destructive/15 text-destructive border border-destructive/30" },
};

export async function logAudit(entity: string, entity_id: string | null, action: string, details: any = {}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("audit_logs").insert({ actor_id: user.id, entity, entity_id, action, details });
}
