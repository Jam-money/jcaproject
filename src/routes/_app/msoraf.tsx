import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { format, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { Printer, Plus, ChevronLeft, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_app/msoraf")({ component: MSORAF });

type MsorafRow = {
  id: string;
  dateLabel: string;
  dateSort: string;
  activity: string;
  objective: string;
  eventTime: string;
  departure: string;
  arrival: string;
  venue: string;
  remarks: string;
  isSaving?: boolean;
};

// Map component row -> DB columns
function toDbPayload(row: MsorafRow, userId: string) {
  return {
    date_label: row.dateLabel,
    date_sort:  row.dateSort,
    activity:   row.activity,
    objective:  row.objective,
    event_time: row.eventTime,
    departure:  row.departure,
    arrival:    row.arrival,
    venue:      row.venue,
    remarks:    row.remarks,
    user_id:    userId,
  };
}

// Map DB row -> component row
function fromDb(r: Record<string, string>): MsorafRow {
  return {
    id:        r.id,
    dateLabel: r.date_label ?? "",
    dateSort:  r.date_sort  ?? "",
    activity:  r.activity   ?? "",
    objective: r.objective  ?? "",
    eventTime: r.event_time ?? "",
    departure: r.departure  ?? "N/A",
    arrival:   r.arrival    ?? "N/A",
    venue:     r.venue      ?? "",
    remarks:   r.remarks    ?? "",
  };
}

function EditCell({
  value,
  onChange,
  center,
}: {
  value: string;
  onChange: (v: string) => void;
  center?: boolean;
}) {
  return (
    <div
      contentEditable
      suppressContentEditableWarning
      className={`min-h-[1rem] outline-none focus:bg-yellow-50 rounded whitespace-pre-wrap ${center ? "text-center" : ""}`}
      onBlur={e => onChange(e.currentTarget.textContent ?? "")}
      dangerouslySetInnerHTML={{ __html: value }}
    />
  );
}

function MSORAF() {
  const { role } = useAuth();

  // Hard guard: only admin/director can access MSORAF, even via direct URL.
  if (role !== "admin" && role !== "director") {
    return <Navigate to="/calendar" />;
  }

  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [rows, setRows] = useState<MsorafRow[]>([]);
  const [rdName, setRdName] = useState("Dr. _____________, Regional Director");
  const [loading, setLoading] = useState(true);
  const [currentUserName, setCurrentUserName] = useState("");
  const userIdRef = useRef<string | null>(null);

  // -- Load rows for the current month --
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const start = startOfMonth(cursor);
      const end   = endOfMonth(cursor);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      userIdRef.current = user?.id ?? null;

      // Fetch the logged-in user's display name for the signature block
      if (user?.id) {
        const { data: myProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .maybeSingle();
        if (myProfile?.full_name) setCurrentUserName(myProfile.full_name);
      }

      const [{ data: savedRows }, { data: roleRows }] = await Promise.all([
        // Load persisted msoraf rows for this month, scoped to the current user
        supabase
          .from("msoraf_rows")
          .select("*")
          .eq("user_id", user?.id ?? "")
          .gte("date_sort", format(start, "yyyy-MM-dd"))
          .lte("date_sort", format(end,   "yyyy-MM-dd"))
          .order("date_sort")
          .order("created_at"),
        supabase.from("user_roles").select("user_id").eq("role", "director").limit(1),
      ]);

      // Director name
      if (roleRows?.[0]?.user_id) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", roleRows[0].user_id)
          .maybeSingle();
        if (prof?.full_name) setRdName(`${prof.full_name}, Regional Director`);
      }

      if (savedRows && savedRows.length > 0) {
        // We have saved rows -- use them
        setRows(savedRows.map(fromDb));
      } else {
        // No saved rows yet -- seed from events table, but ONLY events created
        // by an admin or director. Staff-created events are never recorded in MSORAF.
        const { data: events } = await supabase
          .from("events")
          .select("*")
          .gte("start_time", start.toISOString())
          .lte("start_time", end.toISOString())
          .order("start_time");

        let eligibleEvents = events ?? [];

        if (eligibleEvents.length > 0) {
          // Look up the role of every distinct event creator in one query
          const creatorIds = Array.from(
            new Set(eligibleEvents.map(ev => ev.created_by).filter(Boolean))
          );
          const { data: creatorRoles } = await supabase
            .from("user_roles")
            .select("user_id, role")
            .in("user_id", creatorIds);

          const roleByUser: Record<string, string> = {};
          (creatorRoles ?? []).forEach(r => { roleByUser[r.user_id] = r.role; });

          eligibleEvents = eligibleEvents.filter(ev => {
            const creatorRole = roleByUser[ev.created_by];
            return creatorRole === "admin" || creatorRole === "director";
          });
        }

        const mapped: MsorafRow[] = eligibleEvents.map(ev => ({
          id:        `pending-${ev.id}`,   // temp id until inserted
          dateLabel: format(parseISO(ev.start_time), "dd (EEE)"),
          dateSort:  format(parseISO(ev.start_time), "yyyy-MM-dd"),
          activity:  ev.title,
          objective: ev.description ?? "",
          eventTime: `${format(parseISO(ev.start_time), "h:mma")}-${format(parseISO(ev.end_time), "h:mma")}`,
          departure: "N/A",
          arrival:   "N/A",
          venue:     ev.location ?? "N/A",
          remarks:   ev.notes   ?? "",
        }));

        setRows(mapped);

        // Auto-insert event-seeded rows into msoraf_rows so they persist
        if (mapped.length > 0 && userIdRef.current) {
          const { data: inserted } = await supabase
            .from("msoraf_rows")
            .insert(mapped.map(r => toDbPayload(r, userIdRef.current!)))
            .select();

          if (inserted) {
            // Replace temp ids with real DB ids
            const idMap: Record<string, string> = {};
            inserted.forEach((dbRow, i) => { idMap[mapped[i].id] = dbRow.id; });
            setRows(prev => prev.map(r => ({ ...r, id: idMap[r.id] ?? r.id })));
          }
        }
      }

      setLoading(false);
    };
    void load();
  }, [cursor]);

  // -- Update a single field and save to DB --
  const update = async (id: string, field: keyof MsorafRow, val: string) => {
    // Optimistic local update
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: val } : r));

    // Persist to DB
    const dbField: Record<string, string> = {
      dateLabel: "date_label",
      dateSort:  "date_sort",
      activity:  "activity",
      objective: "objective",
      eventTime: "event_time",
      departure: "departure",
      arrival:   "arrival",
      venue:     "venue",
      remarks:   "remarks",
    };

    await supabase
      .from("msoraf_rows")
      .update({ [dbField[field]]: val })
      .eq("id", id);
  };

  // -- Add a blank row, insert into DB immediately --
  const addRow = async () => {
    if (!userIdRef.current) return;

    const tempId = `pending-${Date.now()}`;
    const newRow: MsorafRow = {
      id:        tempId,
      dateLabel: "",
      dateSort:  format(cursor, "yyyy-MM-01"),
      activity:  "",
      objective: "",
      eventTime: "",
      departure: "N/A",
      arrival:   "N/A",
      venue:     "",
      remarks:   "",
    };

    // Show row instantly
    setRows(prev => [...prev, newRow]);

    // Insert into DB and swap temp id for real id
    const { data } = await supabase
      .from("msoraf_rows")
      .insert(toDbPayload(newRow, userIdRef.current))
      .select()
      .maybeSingle();

    if (data) {
      setRows(prev => prev.map(r => r.id === tempId ? { ...r, id: data.id } : r));
    }
  };

  // -- Delete row from DB --
  const deleteRow = async (id: string) => {
    // Remove from UI instantly
    setRows(prev => prev.filter(r => r.id !== id));

    // Skip DB delete for rows not yet persisted
    if (!id.startsWith("pending-")) {
      await supabase.from("msoraf_rows").delete().eq("id", id);
    }
  };

  // -- Group rows by date for rowspan --
  const dateGroups: Record<string, MsorafRow[]> = {};
  for (const row of rows) {
    if (!dateGroups[row.dateSort]) dateGroups[row.dateSort] = [];
    dateGroups[row.dateSort].push(row);
  }
  const flatRows = Object.values(dateGroups).flatMap(group =>
    group.map((row, i) => ({ ...row, isFirst: i === 0, span: group.length }))
  );

  const prevMonth = () => setCursor(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setCursor(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const handlePrint = () => {
    const doc = document.getElementById("msoraf-doc");
    if (!doc) return;

    const printWindow = window.open("", "_blank", "width=1200,height=800");
    if (!printWindow) return;

    // Collect all stylesheets from the current page
    const styles = Array.from(document.styleSheets)
      .map(sheet => {
        try {
          return Array.from(sheet.cssRules).map(r => r.cssText).join("\n");
        } catch {
          return sheet.href ? `@import url("${sheet.href}");` : "";
        }
      })
      .join("\n");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8"/>
          <title>MSORAF - ${format(cursor, "MMMM yyyy")}</title>
          <style>
            ${styles}
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { margin: 0; padding: 16px; background: white; font-family: sans-serif; }
            @media print {
              @page { size: A4 landscape; margin: 10mm; }
              body { padding: 0; }
            }
          </style>
        </head>
        <body>${doc.outerHTML}</body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    // Wait for images to load before printing
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4"/></Button>
          <span className="font-semibold w-36 text-center">{format(cursor, "MMMM yyyy")}</span>
          <Button variant="outline" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4"/></Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={addRow}><Plus className="h-4 w-4 mr-1"/>Add Row</Button>
          <Button size="sm" onClick={handlePrint}><Printer className="h-4 w-4 mr-1"/>Print / Export</Button>
        </div>
      </div>

      {/* Document */}
      <div className="bg-white text-black overflow-x-auto border border-gray-300 shadow" id="msoraf-doc">
        <div className="min-w-[900px] p-5">

          {/* PSA Header */}
          <div className="flex items-center px-12 pb-2 mb-2 border-b-2 border-gray-500 gap-3">
            <img src="/psa-seal.png" alt="PSA Seal" className="h-16 w-16 object-contain shrink-0" />
            <img src="/Picture1.png" alt="Philippine Statistics Authority Region X" className="h-14 object-contain max-w-[280px]" />
            <img src="/bagong-pilipinas.webp" alt="Bagong Pilipinas" className="h-16 object-contain shrink-0" />
          </div>

          {/* Document Title */}
          <div className="text-center my-3 leading-snug">
            <div className="font-bold text-[13px] uppercase tracking-wide">
              Monthly Schedule of Office Related Activities and Functions (MSORAF)
            </div>
            <div className="text-[11px] mt-0.5">
              of{" "}
              <span
                contentEditable
                suppressContentEditableWarning
                className="outline-none border-b border-dashed border-gray-400 focus:bg-yellow-50"
                onBlur={e => setRdName(e.currentTarget.textContent ?? rdName)}
                dangerouslySetInnerHTML={{ __html: rdName }}
              />
            </div>
            <div className="text-[11px]">For the Month of {format(cursor, "MMMM yyyy")}</div>
          </div>

          {/* Table */}
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr>
                <th rowSpan={2} className="border border-gray-500 p-1 text-center bg-gray-100 align-middle w-[7%] leading-tight">
                  DATES<br/>AND DAY
                </th>
                <th rowSpan={2} className="border border-gray-500 p-1 text-center bg-gray-100 align-middle w-[16%] leading-tight">
                  ACTIVITIES/MEETINGS/<br/>FUNCTIONS/APPOINTMENTS
                </th>
                <th rowSpan={2} className="border border-gray-500 p-1 text-center bg-gray-100 align-middle w-[22%] leading-tight">
                  BRIEF OBJECTIVE<br/>
                  <span className="font-normal italic">(limits to 1-2 objectives only)</span>
                </th>
                <th rowSpan={2} className="border border-gray-500 p-1 text-center bg-gray-100 align-middle w-[8%] leading-tight">
                  EVENT'S<br/>TIME
                </th>
                <th colSpan={2} className="border border-gray-500 p-1 text-center bg-gray-100 w-[12%] leading-tight">
                  SCHEDULE/MODE OF TRAVEL<br/>
                  <span className="font-normal">(if applicable)</span>
                </th>
                <th rowSpan={2} className="border border-gray-500 p-1 text-center bg-gray-100 align-middle w-[17%] leading-tight">
                  VENUE AND LOCATION<br/>
                  <span className="font-normal">(exact address)</span>
                </th>
                <th rowSpan={2} className="border border-gray-500 p-1 text-center bg-gray-100 align-middle w-[13%] leading-tight">
                  REMARKS<br/>
                  <span className="font-normal italic text-[9px]">(state if undertaken and brief outputs and recommendations, if applicable)</span>
                </th>
                <th rowSpan={2} className="border border-gray-500 p-1 bg-gray-100 w-[5%] print:hidden"></th>
              </tr>
              <tr>
                <th className="border border-gray-500 p-1 text-center bg-gray-100">Departure</th>
                <th className="border border-gray-500 p-1 text-center bg-gray-100">Arrival</th>
              </tr>
            </thead>
            <tbody>
              {flatRows.length === 0 && (
                <tr>
                  <td colSpan={9} className="border border-gray-500 p-6 text-center text-gray-400 text-xs">
                    {loading ? "Loading events..." : "No events this month. Click 'Add Row' to add manually."}
                  </td>
                </tr>
              )}
              {flatRows.map(row => (
                <tr key={row.id} className="align-top">
                  {row.isFirst && (
                    <td rowSpan={row.span} className="border border-gray-500 p-1 text-center align-middle font-medium">
                      <EditCell value={row.dateLabel} onChange={v => update(row.id, "dateLabel", v)} center />
                    </td>
                  )}
                  <td className="border border-gray-500 p-1 min-h-[2rem]">
                    <EditCell value={row.activity} onChange={v => update(row.id, "activity", v)} />
                  </td>
                  <td className="border border-gray-500 p-1">
                    <EditCell value={row.objective} onChange={v => update(row.id, "objective", v)} />
                  </td>
                  <td className="border border-gray-500 p-1 text-center">
                    <EditCell value={row.eventTime} onChange={v => update(row.id, "eventTime", v)} center />
                  </td>
                  <td className="border border-gray-500 p-1 text-center">
                    <EditCell value={row.departure} onChange={v => update(row.id, "departure", v)} center />
                  </td>
                  <td className="border border-gray-500 p-1 text-center">
                    <EditCell value={row.arrival} onChange={v => update(row.id, "arrival", v)} center />
                  </td>
                  <td className="border border-gray-500 p-1">
                    <EditCell value={row.venue} onChange={v => update(row.id, "venue", v)} />
                  </td>
                  <td className="border border-gray-500 p-1">
                    <EditCell value={row.remarks} onChange={v => update(row.id, "remarks", v)} />
                  </td>
                  <td className="border border-gray-500 p-1 text-center align-middle print:hidden">
                    <button
                      onClick={() => deleteRow(row.id)}
                      className="text-red-400 hover:text-red-600 text-lg font-bold leading-none"
                    >x</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Note */}
          <p className="text-[9px] mt-3 leading-snug">
            (Note: <strong>Indicate all activities/meetings/functions/appointments from Monday-Friday including weekends and holidays, regardless of length and period. Use separate sheet/s when necessary.</strong>)
          </p>

          {/* Signature Block */}
          <div className="flex justify-between mt-6 text-[10px]">
            {/* Plotted/Organized by */}
            <div className="w-[30%] flex flex-col items-start">
              <div className="font-semibold mb-8">Plotted/Organized by:</div>
              <div className="text-center w-fit">
                <div className="border-b border-black pb-0.5 font-bold uppercase tracking-wide">
                  {currentUserName || "___________________________"}
                </div>
                <div className="text-[9px] mt-0.5">Administrative Assistant I</div>
              </div>
            </div>

            {/* Reviewed and Approved by */}
            <div className="w-[30%] flex flex-col items-center">
              <div className="font-semibold mb-8">Reviewed and Approved by:</div>
              <div className="text-center">
                <div
                  contentEditable
                  suppressContentEditableWarning
                  className="border-b border-black pb-0.5 font-bold uppercase tracking-wide outline-none focus:bg-yellow-50 block"
                >
                  JOSE B. TUASON, JR.
                </div>
                <div className="text-[9px] mt-0.5">Chief Administrative Officer</div>
              </div>
            </div>

            {/* Verified by */}
            <div className="w-[30%] flex flex-col items-end">
              <div className="font-semibold mb-8">Verified by:</div>
              <div className="text-center">
                <div
                  contentEditable
                  suppressContentEditableWarning
                  className="border-b border-black pb-0.5 font-bold uppercase tracking-wide outline-none focus:bg-yellow-50 block"
                >
                  DR. JANITH C. AVES, CE
                </div>
                <div className="text-[9px] mt-0.5">Regional Director</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}