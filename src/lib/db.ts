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

export const EVENT_TYPE_LABELS: Record<string, string> = {
  meeting:                    "Meeting",
  event:                      "Event",
  training_conduct:           "Training (Conduct)",
  personal:                   "Personal",
  attendance_to_meeting:      "Attendance to Meeting/Activities",
  competency_based_interview: "Competency Based Interview",
  investigation:              "Investigation",
  senior_staff_meeting:       "Senior Staff Meeting",
  data_processing:            "Data Processing",
  directorate_meeting:        "Directorate Meeting",
  kasalan_ng_bayan:           "Kasalan ng Bayan",
  mobile_serbisyo_caravan:    "Mobile Serbisyo Caravan",
  one_stop_shop:              "One Stop Shop",
  robac_meeting:              "ROBAC Meeting",
  national_data_review:       "National Data Review",
  regional_data_review:       "Regional Data Review",
  field_supervision:          "Field Supervision",
  press_conference:           "Press Conference",
  official_business:          "Official Business",
  interagency_meeting:        "Interagency Meeting",
  courtesy_visit:             "Courtesy Visit",
  lcro_audit:                 "LCRO Audit",
  on_leave:                   "On Leave",
};

export const EVENT_TYPE_BADGE: Record<string, string> = {
  meeting:                    "bg-blue-100 text-blue-700 border border-blue-200",
  event:                      "bg-green-100 text-green-700 border border-green-200",
  training_conduct:           "bg-purple-100 text-purple-700 border border-purple-200",
  personal:                   "bg-pink-100 text-pink-700 border border-pink-200",
  attendance_to_meeting:      "bg-sky-100 text-sky-700 border border-sky-200",
  competency_based_interview: "bg-violet-100 text-violet-700 border border-violet-200",
  investigation:              "bg-red-100 text-red-700 border border-red-200",
  senior_staff_meeting:       "bg-blue-100 text-blue-700 border border-blue-200",
  data_processing:            "bg-teal-100 text-teal-700 border border-teal-200",
  directorate_meeting:        "bg-indigo-100 text-indigo-700 border border-indigo-200",
  kasalan_ng_bayan:           "bg-rose-100 text-rose-700 border border-rose-200",
  mobile_serbisyo_caravan:    "bg-orange-100 text-orange-700 border border-orange-200",
  one_stop_shop:              "bg-lime-100 text-lime-700 border border-lime-200",
  robac_meeting:              "bg-amber-100 text-amber-700 border border-amber-200",
  national_data_review:       "bg-cyan-100 text-cyan-700 border border-cyan-200",
  regional_data_review:       "bg-emerald-100 text-emerald-700 border border-emerald-200",
  field_supervision:          "bg-orange-100 text-orange-700 border border-orange-200",
  press_conference:           "bg-rose-100 text-rose-700 border border-rose-200",
  official_business:          "bg-slate-100 text-slate-700 border border-slate-200",
  interagency_meeting:        "bg-indigo-100 text-indigo-700 border border-indigo-200",
  courtesy_visit:             "bg-cyan-100 text-cyan-700 border border-cyan-200",
  lcro_audit:                 "bg-red-100 text-red-700 border border-red-200",
  on_leave:                   "bg-gray-100 text-gray-600 border border-gray-300",
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