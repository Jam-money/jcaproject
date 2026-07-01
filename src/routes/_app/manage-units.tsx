import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Navigate } from "@tanstack/react-router";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/manage-units")({ component: ManageUnitsPage });

type AppUnit = "CRASD" | "SOCD";

interface Row {
  id: string;
  full_name: string | null;
  email: string | null;
  position: string | null;
  unit: AppUnit | null;
}

function ManageUnitsPage() {
  const { role } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (role !== "admin") return;
    const load = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,full_name,email,position,unit")
        .order("full_name");
      if (error) {
        toast.error("Failed to load users");
      } else {
        setRows((data ?? []) as Row[]);
      }
      setLoading(false);
    };
    void load();
  }, [role]);

  // Guard: only admins can access this page
  if (role !== "admin") {
    return <Navigate to="/calendar" />;
  }

  const updateUnit = async (userId: string, unit: AppUnit) => {
    const { error } = await supabase.from("profiles").update({ unit }).eq("id", userId);
    if (error) {
      toast.error("Failed to update unit");
      return;
    }
    setRows(prev => prev.map(r => (r.id === userId ? { ...r, unit } : r)));
    toast.success("Unit updated");
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold">Manage Units</h1>
        <p className="text-sm text-muted-foreground">
          Assign each user to CRASD or SOCD. Users only see calendar events from their own unit.
        </p>
      </div>

      <Card className="shadow-soft">
        <div className="divide-y divide-border">
          {loading && (
            <div className="p-6 text-sm text-muted-foreground">Loading users…</div>
          )}
          {!loading && rows.length === 0 && (
            <div className="p-6 text-sm text-muted-foreground">No users found.</div>
          )}
          {rows.map(r => (
            <div key={r.id} className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <div className="font-medium text-sm truncate">{r.full_name || "—"}</div>
                <div className="text-xs text-muted-foreground truncate">{r.email}</div>
                {r.position && (
                  <div className="text-xs text-muted-foreground truncate">{r.position}</div>
                )}
              </div>
              <Select
                value={r.unit ?? undefined}
                onValueChange={v => void updateUnit(r.id, v as AppUnit)}
              >
                <SelectTrigger className="w-36 shrink-0">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CRASD">CRASD</SelectItem>
                  <SelectItem value="SOCD">SOCD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
