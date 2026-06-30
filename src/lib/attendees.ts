import type { CSSProperties } from "react";

export const ATTENDEES = [
  { value: "RD",    label: "RD",    dot: "#ef4444", bg: "#fef2f2", text: "#b91c1c", border: "#fca5a5", hex: "#ef4444" },
  { value: "JBT",   label: "JBT",   dot: "#eab308", bg: "#fefce8", text: "#854d0e", border: "#fde047", hex: "#eab308" },
  { value: "SOCD",  label: "SOCD",  dot: "#22c55e", bg: "#f0fdf4", text: "#15803d", border: "#86efac", hex: "#22c55e" },
  { value: "CRASD", label: "CRASD", dot: "#3b82f6", bg: "#eff6ff", text: "#1d4ed8", border: "#93c5fd", hex: "#3b82f6" },
  { value: "SBB",   label: "SBB",   dot: "#f97316", bg: "#fff7ed", text: "#c2410c", border: "#fdba74", hex: "#f97316" },
] as const;

export type AttendeeValue = string; // dept codes ("RD","JBT","SOCD","CRASD") OR staff ids ("staff:luperte")
export type RSVPStatus    = "yes" | "no" | "maybe" | null;
export type RSVPMap       = Partial<Record<string, RSVPStatus>>;

// ── Individual staff ─────────────────────────────────────────────────────────
export interface StaffMember {
  id: string;          // unique key, e.g. "staff:luperte"
  email: string;
  fullName: string;     // "Luperte, Jessie C."
  position: string;     // "Statistical Specialist II"
  abbrev: string;       // "SS II"
  department: "SOCD" | "CRASD";
}

function s(
  id: string,
  email: string,
  fullName: string,
  position: string,
  abbrev: string,
  department: "SOCD" | "CRASD"
): StaffMember {
  return { id: `staff:${id}`, email, fullName, position, abbrev, department };
}

export const STAFF: StaffMember[] = [
  // ── CRASD (head: JBT — Tuason, Jose Jr. B.) ──
  s("alalong",    "elaineclaire.alalong@psa.gov.ph",   "Alalong, Elaine Claire D.",   "Accountant III",               "Acct III", "CRASD"),
  s("luperte",    "jessie.luperte@psa.gov.ph",         "Luperte, Jessie C.",          "Statistical Specialist II",    "SS II",    "CRASD"),
  s("oppus",      "johnmichael.oppus@psa.gov.ph",      "Oppus, John Michael C.",      "Administrative Officer IV",    "AO IV",    "CRASD"),
  s("gimeno",     "nellester.gimeno@psa.gov.ph",       "Gimeno, Neil Lester A.",      "Administrative Officer IV",    "AO IV",    "CRASD"),
  s("batallones", "maryjane.batallones@psa.gov.ph",    "Batallones, Mary Jane A.",    "Administrative Officer III",   "AO III",   "CRASD"),
  s("pino",       "margiemae.pino@psa.gov.ph",         "Pino, Margie Mae L.",         "Administrative Officer III",   "AO III",   "CRASD"),
  s("cartilla",   "kristinekhaye.cartilla@psa.gov.ph", "Cartilla, Kristine Khaye J.", "Administrative Assistant III", "AA III",   "CRASD"),
  s("hinaut",     "jimmy.hinaut@psa.gov.ph",           "Hinaut, Jimmy V.",            "Administrative Assistant II",  "AA II",    "CRASD"),
  s("lomopog",    "lovely.lomopog@psa.gov.ph",         "Lomopog, Lovely H.",          "Administrative Aide VI",       "AA VI",    "CRASD"),
  s("agnes",      "jayveecedric.agnes@psa.gov.ph",     "Agnes, Jayvee Cedric A.",     "Administrative Aide VI",       "AA VI",    "CRASD"),
  s("obra",       "h.obra@psa.gov.ph",                 "Obra, Harvey C.",             "Registration Officer III",     "RO III",   "CRASD"),
  s("fabroa",     "m.fabroa@psa.gov.ph",               "Fabroa, Magdalino Jr.",       "Administrative Aide III",      "AA III",   "CRASD"),

  // ── SOCD (head: RD — Balagbis, Sarah B.) ──
  s("castro",       "brendalynn.castro@psa.gov.ph",      "Castro, Brenda Lynn M.",     "Supervising Statistical Specialist", "SSS",   "SOCD"),
  s("capadera",      "donagay.capareda@psa.gov.ph",       "Capareda, Donagay G.",       "Senior Statistical Specialist",      "Sr. SS", "SOCD"),
  s("gallopin",       "cristine.gallopin@psa.gov.ph",      "Gallopin, Cristine T.",      "Senior Statistical Specialist",      "Sr. SS", "SOCD"),
  s("lagarbe",         "aldemar.lagarbe@psa.gov.ph",        "Lagarbe, Aldemar A.",        "Statistical Specialist II",          "SS II",  "SOCD"),
  s("laspobres",       "genelyn.laspobres@psa.gov.ph",      "Laspobres, Genelyn B.",      "Statistical Specialist II",          "SS II",  "SOCD"),
  s("emano",           "jucris.emano@psa.gov.ph",           "Emano, Jucris S.",           "Statistical Specialist II",          "SS II",  "SOCD"),
  s("cempron",         "applesweet.cempron@psa.gov.ph",     "Cempron, Apple Sweet S.",    "Statistical Specialist II",          "SS II",  "SOCD"),
  s("sajulan",         "marklouis.sajulan@psa.gov.ph",      "Sajulan, Mark Louis D.",     "Information Systems Analyst I",      "ISA I",  "SOCD"),
  s("llido",           "joy.llido@psa.gov.ph",              "Llido, Joy E.",              "Information Officer I",              "IO I",   "SOCD"),
  s("gambuta",         "gracelove.gambuta@psa.gov.ph",      "Gambuta, Grace Love",        "Statistical Analyst",                "SA",     "SOCD"),
  s("adanteoppus",     "michahjoy.adanteoppus@psa.gov.ph",  "Adante-Oppus, Micah Joy A.", "Statistical Analyst",                "SA",     "SOCD"),
  s("sabelita",        "janvincent.sabelita@psa.gov.ph",    "Sabelita, Jan Vincent",      "Assistant Statistician",             "AS",     "SOCD"),
  s("hinampas",        "karolmae.hinampas@psa.gov.ph",      "Hinampas, Karol Mae S.",     "Assistant Statistician",             "AS",     "SOCD"),
];

export function staffByDept(dept: "SOCD" | "CRASD"): StaffMember[] {
  return STAFF.filter(x => x.department === dept);
}

export function findStaff(id: string): StaffMember | undefined {
  return STAFF.find(x => x.id === id);
}

/** Short tag label used on pills, e.g. "SS II LUPERTE" */
export function staffTag(member: StaffMember): string {
  const lastName = member.fullName.split(",")[0].trim().toUpperCase();
  return `${member.abbrev} ${lastName}`;
}

/** Resolves a chip's display label for ANY attendee value (dept code or staff id) */
export function labelForValue(value: string): string {
  const dept = ATTENDEES.find(a => a.value === value);
  if (dept) return dept.label;
  const staff = findStaff(value);
  if (staff) return staffTag(staff);
  return value;
}

/** Resolves color tokens for any attendee value, inheriting dept color for staff */
export function colorForValue(value: string): typeof ATTENDEES[number] {
  const dept = ATTENDEES.find(a => a.value === value);
  if (dept) return dept;
  const staff = findStaff(value);
  if (staff) {
    const parent = ATTENDEES.find(a => a.value === staff.department);
    if (parent) return parent;
  }
  return ATTENDEES[0];
}

/**
 * Returns attendees whose color should appear on the calendar bar.
 * Only RD's "no" removes a color — everyone else always shows.
 */
export function activeAttendees(attendees: string[], rsvpMap: RSVPMap): string[] {
  return attendees.filter(a => {
    if (a === "RD") return rsvpMap["RD"] !== "no";
    return true;
  });
}

/**
 * Builds the CSS background style for a calendar pill based on active attendees.
 * Colors are de-duped so picking many staff from the same dept doesn't
 * produce many repeated stripes of the same color.
 */
export function attendeePillStyle(attendees: string[], rsvpMap: RSVPMap): CSSProperties {
  if (!attendees || attendees.length === 0) {
    return { background: "#818cf8" }; // nobody invited — neutral indigo
  }

  const active = activeAttendees(attendees, rsvpMap);

  if (active.length === 0) {
    return { background: "#94a3b8" }; // everyone invited declined
  }

  const colors = Array.from(new Set(active.map(a => colorForValue(a).hex)));

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
export function attendeePillStyle_single(value: string) {
  const a = colorForValue(value);
  return { background: a.bg, color: a.text, borderColor: a.border, dotColor: a.dot };
}
