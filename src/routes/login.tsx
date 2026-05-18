import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { CalendarCheck2, Loader2 } from "lucide-react";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && session) navigate({ to: "/dashboard" }); }, [session, loading, navigate]);

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between gradient-primary text-primary-foreground p-12">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <CalendarCheck2 className="h-6 w-6" /> RD Office
        </div>
        <div>
          <h1 className="text-4xl font-bold leading-tight">Run the Regional Director's office with calm and clarity.</h1>
          <p className="mt-4 text-primary-foreground/85 max-w-md">
            Schedules, meetings and tasks — coordinated between the Director and the Secretariat in one professional workspace.
          </p>
        </div>
        <div className="text-xs text-primary-foreground/70">© {new Date().getFullYear()} Regional Director's Office</div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12 bg-background">
        <Card className="w-full max-w-md p-8 shadow-elevated animate-fade-in-up">
          <div className="flex items-center gap-2 mb-6 lg:hidden">
            <CalendarCheck2 className="h-6 w-6 text-primary" />
            <span className="font-semibold">RD Office</span>
          </div>
          <h2 className="text-2xl font-semibold">Welcome</h2>
          <p className="text-sm text-muted-foreground mb-6">Sign in to access your dashboard.</p>
          <SignInForm />
        </Card>
      </div>
    </div>
  );
}

function SignInForm() {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Signed in");
  };
  return (
    <form onSubmit={submit} className="space-y-4 mt-6">
      <div className="space-y-2"><Label>Email</Label><Input type="email" required value={email} onChange={e=>setEmail(e.target.value)} /></div>
      <div className="space-y-2"><Label>Password</Label><Input type="password" required value={password} onChange={e=>setPassword(e.target.value)} /></div>
      <Button type="submit" className="w-full" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin mr-2"/>}Sign in</Button>
    </form>
  );
}
