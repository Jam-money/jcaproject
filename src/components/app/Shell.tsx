import { Link, useLocation, Outlet, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Calendar, Users2, Bell, FileBarChart2,
  UserCircle2, LogOut, Sun, Moon, Menu, X, CalendarCheck2, Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/calendar", label: "Calendar", icon: Calendar },
  { to: "/meetings", label: "Meetings", icon: Users2 },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/reports", label: "Reports", icon: FileBarChart2 },
  { to: "/profile", label: "Profile", icon: UserCircle2 },
] as const;

export function Shell() {
  const { profile, role, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const loc = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => { setOpen(false); }, [loc.pathname]);

  useEffect(() => {
    if (!profile) return;
    const load = async () => {
      const { count } = await supabase.from("notifications").select("*", { count: "exact", head: true }).eq("read", false).eq("user_id", profile.id);
      setUnread(count ?? 0);
    };
    void load();
    const ch = supabase.channel("notif-count").on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, load).subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [profile]);

  const initials = (profile?.full_name || profile?.email || "?").split(" ").map(s=>s[0]).slice(0,2).join("").toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="h-16 flex items-center justify-between px-5 border-b border-sidebar-border">
          <Link to="/dashboard" className="flex items-center gap-2 font-semibold">
            <span className="grid place-items-center h-8 w-8 rounded-lg bg-primary text-primary-foreground"><CalendarCheck2 className="h-4 w-4"/></span>
            ORD
          </Link>
          <button className="lg:hidden" onClick={()=>setOpen(false)} aria-label="Close menu"><X className="h-5 w-5"/></button>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = loc.pathname.startsWith(to);
            return (
              <Link key={to} to={to}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/60"}`}>
                <Icon className="h-4 w-4" />
                <span className="flex-1">{label}</span>
                {to === "/notifications" && unread > 0 && (
                  <Badge variant="secondary" className="bg-primary text-primary-foreground border-0">{unread}</Badge>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
            <Avatar className="h-9 w-9"><AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground">{initials}</AvatarFallback></Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{profile?.full_name ?? "User"}</div>
              <div className="text-xs text-sidebar-foreground/70 capitalize">{role ?? "—"}</div>
            </div>
            <button onClick={async ()=>{ await signOut(); navigate({ to: "/login" }); }} className="p-2 hover:bg-sidebar-accent rounded-md" aria-label="Sign out"><LogOut className="h-4 w-4"/></button>
          </div>
        </div>
      </aside>

      {open && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={()=>setOpen(false)} />}

      {/* Main */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 h-16 flex items-center gap-3 px-4 sm:px-6 bg-background/80 backdrop-blur border-b border-border">
          <button className="lg:hidden p-2 -ml-2" onClick={()=>setOpen(true)} aria-label="Open menu"><Menu className="h-5 w-5"/></button>
          <div className="flex-1 max-w-md relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
            <input placeholder="Search events…" className="w-full h-10 pl-9 pr-3 rounded-lg bg-muted border border-transparent focus:border-ring focus:outline-none text-sm" />
          </div>
          <div className="flex-1 sm:hidden" />
          <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
            {theme === "dark" ? <Sun className="h-4 w-4"/> : <Moon className="h-4 w-4"/>}
          </Button>
          <Link to="/notifications" className="relative p-2 rounded-md hover:bg-muted">
            <Bell className="h-5 w-5"/>
            {unread > 0 && <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive"/>}
          </Link>
        </header>
        <main className="p-4 sm:p-6 lg:p-8 animate-fade-in-up"><Outlet /></main>
      </div>
    </div>
  );
}
