// src/lib/attendees.ts
import type { CSSProperties } from "react";

export const ATTENDEES = [
  { value: "RD",    label: "RD",    dot: "#ef4444", bg: "#fef2f2", text: "#b91c1c", border: "#fca5a5", hex: "#ef4444" },
  { value: "JBT",   label: "JBT",   dot: "#eab308", bg: "#fefce8", text: "#854d0e", border: "#fde047", hex: "#eab308" },
  { value: "SOCD",  label: "SOCD",  dot: "#22c55e", bg: "#f0fdf4", text: "#15803d", border: "#86efac", hex: "#22c55e" },
  { value: "CRASD", label: "CRASD", dot: "#3b82f6", bg: "#eff6ff", text: "#1d4ed8", border: "#93c5fd", hex: "#3b82f6" },
] as const;

export type AttendeeValue = typeof ATTENDEES[number]["value"];
export type RSVPStatus    = "yes" | "no" | "maybe" | null;
export type RSVPMap       = Partial<Record<AttendeeValue, RSVPStatus>>;

/**
 * Returns attendees whose color should appear on the calendar bar.
 * Only RD's "no" removes a color — all other attendees always show.
 */
export function activeAttendees(attendees: AttendeeValue[], rsvpMap: RSVPMap): AttendeeValue[] {
  return attendees.filter(a => {
    if (a === "RD") return rsvpMap["RD"] !== "no";
    return true; // JBT, SOCD, CRASD always show — they can't RSVP
  });
}

/**
 * Builds the CSS background style for a calendar pill
 * based on active attendees (RD excluded only if he said "no").
 */
export function attendeePillStyle(
  attendees: AttendeeValue[],
  rsvpMap: RSVPMap
): CSSProperties {
  const active = activeAttendees(attendees, rsvpMap);

  if (active.length === 0) {
    return { background: "#94a3b8" }; // all gone → grey
  }

  const colors = active.map(a => ATTENDEES.find(x => x.value === a)!.hex);

  if (colors.length === 1) return { background: colors[0] };

  const stops: string[] = [];
  colors.forEach((hex, i) => {
    const from = ((i / colors.length) * 100).toFixed(1);
    const to   = (((i + 1) / colors.length) * 100).toFixed(1);
    stops.push(`${hex} ${from}%`, `${hex} ${to}%`);
  });
  return { background: `linear-gradient(90deg, ${stops.join(", ")})` };
}

/** Helper to get attendee pill inline styles for use outside the calendar */
export function attendeePillStyle_single(value: AttendeeValue) {
  const a = ATTENDEES.find(x => x.value === value)!;
  return { background: a.bg, color: a.text, borderColor: a.border, dotColor: a.dot };
}