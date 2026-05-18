import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "@tanstack/react-router";
import { Shell } from "@/components/app/Shell";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_app")({ component: AuthGate });

function AuthGate() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && !session) navigate({ to: "/login" });
  }, [loading, session, navigate]);
  if (loading || !session) {
    return <div className="min-h-screen grid place-items-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-primary"/></div>;
  }
  return <Shell />;
}

// keep redirect helper available for typed throws elsewhere
export { redirect };
