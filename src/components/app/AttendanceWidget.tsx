import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Clock, LogIn, Coffee, LogOut, CheckCircle2 } from "lucide-react";

// ── Time window constants (minutes since midnight) ─────────────────────────
const toMin = (h: number, m = 0) => h * 60 + m;
const nowMin = () => { const d = new Date(); return toMin(d.getHours(), d.getMinutes()); };

const CHECK_IN_START  = toMin(8);
const CHECK_IN_END    = toMin(11, 59);
const BREAK_OUT_START = toMin(12);
const BREAK_IN_START  = toMin(12);
const BREAK_IN_END    = toMin(16, 59);
const CHECK_OUT_START = toMin(17);

type AttendanceRow = {
  id: string;
  user_id: string;
  attendance_date: string;
  check_in_time:   string | null;
  break_out_time:  string | null;
  break_in_time:   string | null;
  check_out_time:  string | null;
};

async function fetchToday(userId: string): Promise<AttendanceRow | null> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("attendance")
    .select("*")
    .eq("user_id", userId)
    .eq("attendance_date", today)
    .maybeSingle();
  if (error) throw error;
  return data;
}

function fmtTime(iso: string) {
  return format(new Date(iso), "h:mm a");
}

// ── Status badge ────────────────────────────────────────────────────────────
function StatusBadge({ label, color }: { label: string; color: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${color}`}>
      {label}
    </span>
  );
}

// ── Main widget ─────────────────────────────────────────────────────────────
export function AttendanceWidget({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [, tick] = useState(0);
  const today = new Date().toISOString().slice(0, 10);

  // Re-render every 30 s so window checks stay live
  useEffect(() => {
    const t = setInterval(() => tick(n => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  const { data: rec, isLoading } = useQuery({
    queryKey: ["attendance", userId, today],
    queryFn:  () => fetchToday(userId),
  });

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["attendance", userId] });
  }, [qc, userId]);

  const mn = nowMin();
  const hasCheckedIn  = !!rec?.check_in_time;
  const hasBrokenOut  = !!rec?.break_out_time;
  const hasBrokenIn   = !!rec?.break_in_time;
  const hasCheckedOut = !!rec?.check_out_time;

  const canCheckIn   = mn >= CHECK_IN_START  && mn <= CHECK_IN_END;
  const canBreakOut  = mn >= BREAK_OUT_START;
  const canBreakIn   = mn >= BREAK_IN_START  && mn <= BREAK_IN_END;
  const canCheckOut  = mn >= CHECK_OUT_START;
  const missedWindow = !hasCheckedIn && mn > CHECK_IN_END;

  const handleCheckIn = async () => {
    if (!canCheckIn) return;
    await supabase.from("attendance").insert({
      user_id: userId,
      attendance_date: today,
      check_in_time: new Date().toISOString(),
    });
    invalidate();
  };

  const handleBreakOut = async () => {
    if (!rec || !canBreakOut || hasBrokenOut) return;
    await supabase.from("attendance")
      .update({ break_out_time: new Date().toISOString() })
      .eq("id", rec.id);
    invalidate();
  };

  const handleBreakIn = async () => {
    if (!rec || !canBreakIn || hasBrokenIn) return;
    await supabase.from("attendance")
      .update({ break_in_time: new Date().toISOString() })
      .eq("id", rec.id);
    invalidate();
  };

  const handleCheckOut = async () => {
    if (!rec || !canCheckOut || hasCheckedOut) return;
    await supabase.from("attendance")
      .update({ check_out_time: new Date().toISOString() })
      .eq("id", rec.id);
    invalidate();
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border p-4 text-sm text-muted-foreground animate-pulse">
        Loading attendance…
      </div>
    );
  }

  // ── Day complete ──────────────────────────────────────────────────────────
  if (hasCheckedOut) {
    return (
      <div className="rounded-xl border border-border p-4 space-y-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          <h3 className="font-semibold text-sm">Attendance Complete</h3>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <TimeRow label="Check-in"   time={rec!.check_in_time!} />
          <TimeRow label="Break out"  time={rec!.break_out_time!} />
          <TimeRow label="Break in"   time={rec!.break_in_time} />
          <TimeRow label="Check-out"  time={rec!.check_out_time!} />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">WFH Attendance</h3>
        </div>
        <span className="text-xs text-muted-foreground">
          {format(new Date(), "EEEE, MMM d")}
        </span>
      </div>

      {/* Timeline */}
      <div className="space-y-2">

        {/* ── CHECK IN ── */}
        {!hasCheckedIn && !missedWindow && canCheckIn && (
          <ActionButton
            icon={<LogIn className="w-4 h-4" />}
            label="Check In"
            sublabel="Window: 8:00 – 11:59 AM"
            onClick={handleCheckIn}
            color="primary"
          />
        )}
        {!hasCheckedIn && !missedWindow && !canCheckIn && mn < CHECK_IN_START && (
          <InfoRow
            icon={<LogIn className="w-4 h-4" />}
            label="Check-in opens at 8:00 AM"
            color="muted"
          />
        )}
        {!hasCheckedIn && missedWindow && (
          <InfoRow
            icon={<LogIn className="w-4 h-4" />}
            label="Check-in window closed — marked absent"
            color="destructive"
          />
        )}
        {hasCheckedIn && (
          <DoneRow
            icon={<LogIn className="w-4 h-4" />}
            label="Checked in"
            time={rec!.check_in_time!}
            late={new Date(rec!.check_in_time!).getHours() >= 12}
          />
        )}

        {/* ── BREAK OUT ── */}
        {hasCheckedIn && !hasBrokenOut && canBreakOut && (
          <ActionButton
            icon={<Coffee className="w-4 h-4" />}
            label="Break Out"
            sublabel="Lunch break — click to start"
            onClick={handleBreakOut}
            color="amber"
          />
        )}
        {hasCheckedIn && !hasBrokenOut && !canBreakOut && (
          <InfoRow
            icon={<Coffee className="w-4 h-4" />}
            label="Break Out available at 12:00 PM"
            color="muted"
          />
        )}
        {hasBrokenOut && (
          <DoneRow
            icon={<Coffee className="w-4 h-4" />}
            label="Break out"
            time={rec!.break_out_time!}
          />
        )}

        {/* ── BREAK IN ── */}
        {hasBrokenOut && !hasBrokenIn && canBreakIn && (
          <ActionButton
            icon={<LogIn className="w-4 h-4" />}
            label="Break In"
            sublabel="Window: 12:00 – 4:59 PM"
            onClick={handleBreakIn}
            color="blue"
          />
        )}
        {hasBrokenOut && !hasBrokenIn && !canBreakIn && mn < BREAK_IN_START && (
          <InfoRow
            icon={<LogIn className="w-4 h-4" />}
            label="Break In opens at 12:00 PM"
            color="muted"
          />
        )}
        {hasBrokenOut && !hasBrokenIn && mn > BREAK_IN_END && (
          <InfoRow
            icon={<LogIn className="w-4 h-4" />}
            label="Break-in window closed"
            color="destructive"
          />
        )}
        {hasBrokenIn && (
          <DoneRow
            icon={<LogIn className="w-4 h-4" />}
            label="Break in"
            time={rec!.break_in_time!}
          />
        )}

        {/* ── CHECK OUT ── */}
        {hasCheckedIn && !hasCheckedOut && canCheckOut && (
          <ActionButton
            icon={<LogOut className="w-4 h-4" />}
            label="Check Out"
            sublabel="End of day — click to check out"
            onClick={handleCheckOut}
            color="primary"
          />
        )}
        {hasCheckedIn && !hasCheckedOut && !canCheckOut && (
          <InfoRow
            icon={<LogOut className="w-4 h-4" />}
            label="Check-out available at 5:00 PM"
            color="muted"
          />
        )}
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function TimeRow({ label, time }: { label: string; time: string | null }) {
  return (
    <div className="flex flex-col">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{time ? fmtTime(time) : "—"}</span>
    </div>
  );
}

function DoneRow({ icon, label, time, late }: {
  icon: React.ReactNode; label: string; time: string; late?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-green-500">{icon}</span>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium ml-auto">{fmtTime(time)}</span>
      {late && <span className="text-xs text-amber-500 font-medium">Late</span>}
    </div>
  );
}

function InfoRow({ icon, label, color }: {
  icon: React.ReactNode; label: string;
  color: "muted" | "destructive";
}) {
  return (
    <div className={`flex items-center gap-2 text-sm ${
      color === "destructive" ? "text-destructive" : "text-muted-foreground"
    }`}>
      {icon}
      <span>{label}</span>
    </div>
  );
}

function ActionButton({ icon, label, sublabel, onClick, color }: {
  icon: React.ReactNode; label: string; sublabel: string;
  onClick: () => void;
  color: "primary" | "amber" | "blue";
}) {
  const cls = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90",
    amber:   "bg-amber-500 text-white hover:bg-amber-600",
    blue:    "bg-blue-600 text-white hover:bg-blue-700",
  }[color];

  return (
    <button
      onClick={onClick}
      className={`w-full rounded-lg px-4 py-2.5 flex items-center gap-3 transition-colors ${cls}`}
    >
      {icon}
      <div className="text-left">
        <div className="font-semibold text-sm">{label}</div>
        <div className="text-xs opacity-80">{sublabel}</div>
      </div>
    </button>
  );
}