import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
};

function EditCell({ value, onChange, center }: { value: string; onChange: (v: string) => void; center?: boolean }) {
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
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [rows, setRows] = useState<MsorafRow[]>([]);
  const [rdName, setRdName] = useState("Dr. _____________, Regional Director");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const start = startOfMonth(cursor);
      const end   = endOfMonth(cursor);

      const [{ data: events }, { data: roleRows }] = await Promise.all([
        supabase.from("events").select("*")
          .gte("start_time", start.toISOString())
          .lte("start_time", end.toISOString())
          .order("start_time"),
        supabase.from("user_roles").select("user_id").eq("role", "director").limit(1),
      ]);

      if (roleRows?.[0]?.user_id) {
        const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", roleRows[0].user_id).single();
        if (prof?.full_name) setRdName(`${prof.full_name}, Regional Director`);
      }

      const mapped: MsorafRow[] = (events ?? []).map(ev => ({
        id: ev.id,
        dateLabel: format(parseISO(ev.start_time), "dd (EEE)"),
        dateSort:  format(parseISO(ev.start_time), "yyyy-MM-dd"),
        activity:  ev.title,
        objective: ev.description ?? "",
        eventTime: `${format(parseISO(ev.start_time), "h:mma")}-${format(parseISO(ev.end_time), "h:mma")}`,
        departure: "N/A",
        arrival:   "N/A",
        venue:     ev.location ?? "N/A",
        remarks:   ev.notes ?? "",
      }));

      setRows(mapped);
      setLoading(false);
    };
    void load();
  }, [cursor]);

  const update = (id: string, field: keyof MsorafRow, val: string) =>
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: val } : r));

  const addRow = () => setRows(prev => [...prev, {
    id: `manual-${Date.now()}`,
    dateLabel: "",
    dateSort:  format(cursor, "yyyy-MM-01"),
    activity:  "",
    objective: "",
    eventTime: "",
    departure: "N/A",
    arrival:   "N/A",
    venue:     "",
    remarks:   "",
  }]);

  const deleteRow = (id: string) => setRows(prev => prev.filter(r => r.id !== id));

  // Group rows by dateSort for rowspan
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

  return (
    <div className="space-y-3">
      {/* Toolbar — hidden on print */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4"/></Button>
          <span className="font-semibold w-36 text-center">{format(cursor, "MMMM yyyy")}</span>
          <Button variant="outline" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4"/></Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={addRow}><Plus className="h-4 w-4 mr-1"/>Add Row</Button>
          <Button size="sm" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1"/>Print / Export</Button>
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
                    {loading ? "Loading events…" : "No events this month. Click 'Add Row' to add manually."}
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
                    <button onClick={() => deleteRow(row.id)} className="text-red-400 hover:text-red-600 text-lg font-bold leading-none">×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
