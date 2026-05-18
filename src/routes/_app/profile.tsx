import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/profile")({ component: Profile });

function Profile() {
  const { profile, role, refresh } = useAuth();
  const [name, setName] = useState(profile?.full_name ?? "");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!profile) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ full_name: name }).eq("id", profile.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    await refresh(); toast.success("Profile updated");
  };

  const initials = (name || profile?.email || "?").split(" ").map(s=>s[0]).slice(0,2).join("").toUpperCase();

  return (
    <div className="max-w-xl space-y-6">
      <div><h1 className="text-2xl font-semibold">Profile settings</h1><p className="text-sm text-muted-foreground">Update your details.</p></div>
      <Card className="p-6 space-y-5 shadow-soft">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16"><AvatarFallback className="bg-primary text-primary-foreground text-lg">{initials}</AvatarFallback></Avatar>
          <div>
            <div className="font-medium">{profile?.email}</div>
            <div className="text-xs text-muted-foreground capitalize">Role: {role}</div>
          </div>
        </div>
        <div className="space-y-1.5"><Label>Full name</Label><Input value={name} onChange={e=>setName(e.target.value)}/></div>
        <Button onClick={save} disabled={busy}>Save changes</Button>
      </Card>
    </div>
  );
}
