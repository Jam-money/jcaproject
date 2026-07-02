import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client"; // adjust to your actual client path

// Reads from the `attendance_status` VIEW (see attendance_schema.sql),
// which computes statuses live off the clock — no cron dependency,
// and always accurate whenever the admin opens the page.

type AttendanceStatusRow = {
  id: string;
  user_id: string;
  full_name: string;
  attendance_date: string;
  check_in_time: string | null;
  check_in_status: "not_checked_in" | "on_time" | "late" | "missed_window" | "absent";
  break_out_time: string | null;
  break_in_time: string | null;
  break_in_status: "not_broken_in" | "on_time" | "invalid";
  check_out_time: string | null;
  day_status: "In progress" | "Day complete" | "Absent / No check-in";
};

async function fetchAttendanceForDate(date: string): Promise<AttendanceStatusRow[]> {
  const { data, error } = await supabase
    .from("attendance_status")
    .select("*")
    .eq("attendance_date", date)
    .order("full_name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    on_time: "bg-green-500/15 text-green-500",
    late: "bg-yellow-500/15 text-yellow-500",
    missed_window: "bg-red-500/15 text-red-500",
    absent: "bg-red-500/15 text-red-500",
    not_checked_in: "bg-muted text-muted-foreground",
    not_broken_in: "bg-muted text-muted-foreground",
    invalid: "bg-red-500/15 text-red-500",
  };
  return map[status] ?? "bg-muted text-muted-foreground";
};

const dayStatusBadge = (status: string) => {
  const map: Record<string, string> = {
    "Day complete": "bg-green-500/15 text-green-500",
    "In progress": "bg-yellow-500/15 text-yellow-500",
    "Absent / No check-in": "bg-red-500/15 text-red-500",
  };
  return map[status] ?? "bg-muted text-muted-foreground";
};

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";

export function AdminAttendanceView({ date }: { date: string }) {
  const { data: rows, isLoading } = useQuery({
    queryKey: ["admin-attendance", date],
    queryFn: () => fetchAttendanceForDate(date),
  });

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left p-3">Employee</th>
            <th className="text-left p-3">Check-in</th>
            <th className="text-left p-3">Break-out</th>
            <th className="text-left p-3">Break-in</th>
            <th className="text-left p-3">Check-out</th>
            <th className="text-left p-3">Day status</th>
          </tr>
        </thead>
        <tbody>
          {rows?.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="p-3">
                <div className="font-medium">{r.full_name}</div>
              </td>
              <td className="p-3">
                <span className={`px-2 py-0.5 rounded-full text-xs ${statusBadge(r.check_in_status)}`}>
                  {fmt(r.check_in_time)}
                </span>
              </td>
              <td className="p-3 text-muted-foreground">{fmt(r.break_out_time)}</td>
              <td className="p-3">
                <span className={`px-2 py-0.5 rounded-full text-xs ${statusBadge(r.break_in_status)}`}>
                  {fmt(r.break_in_time)}
                </span>
              </td>
              <td className="p-3 text-muted-foreground">{fmt(r.check_out_time)}</td>
              <td className="p-3">
                <span className={`px-2 py-0.5 rounded-full text-xs ${dayStatusBadge(r.day_status)}`}>
                  {r.day_status}
                </span>
              </td>
            </tr>
          ))}
          {rows?.length === 0 && (
            <tr>
              <td colSpan={6} className="p-6 text-center text-muted-foreground">
                No attendance records for this date.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}