import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Dumbbell, ClipboardList, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", icon: Dumbbell, label: "Übungen" },
  { to: "/plans", icon: ClipboardList, label: "Pläne" },
  { to: "/calendar", icon: CalendarDays, label: "Kalender" },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto max-w-3xl px-4 py-3">
          <h1 className="text-lg font-bold tracking-tight flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-primary" />
            Gym Book
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur-sm">
        <div className="mx-auto max-w-3xl flex justify-around py-2">
          {navItems.map(({ to, icon: Icon, label }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-1.5 text-xs transition-colors rounded-lg",
                pathname === to ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
