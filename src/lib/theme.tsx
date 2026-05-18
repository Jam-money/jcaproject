import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";
const Ctx = createContext<{ theme: Theme; toggle: () => void } | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  useEffect(() => {
    const stored = (typeof localStorage !== "undefined" && localStorage.getItem("theme")) as Theme | null;
    const initial = stored ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(initial);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try { localStorage.setItem("theme", theme); } catch {}
  }, [theme]);
  return <Ctx.Provider value={{ theme, toggle: () => setTheme(t => (t === "dark" ? "light" : "dark")) }}>{children}</Ctx.Provider>;
}
export function useTheme() {
  const v = useContext(Ctx);
  if (!v) throw new Error("ThemeProvider missing");
  return v;
}
