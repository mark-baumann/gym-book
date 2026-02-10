import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Flame, CalendarDays } from "lucide-react";
import { format, differenceInCalendarDays, isToday, isYesterday } from "date-fns";
import { de } from "date-fns/locale";
import Layout from "@/components/Layout";

export default function CalendarView() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const { data: sessions } = useQuery({
    queryKey: ["workout-sessions-calendar"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_sessions")
        .select("*, workout_sets(*, exercises(name, muscle_group))")
        .order("date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const trainingDates = useMemo(() => {
    if (!sessions) return new Set<string>();
    return new Set(sessions.map((s) => s.date));
  }, [sessions]);

  const streak = useMemo(() => {
    if (!sessions?.length) return 0;
    const sortedDates = [...trainingDates].sort().reverse();
    let count = 0;
    const today = format(new Date(), "yyyy-MM-dd");
    const yesterday = format(new Date(Date.now() - 86400000), "yyyy-MM-dd");

    if (sortedDates[0] !== today && sortedDates[0] !== yesterday) return 0;

    for (let i = 0; i < sortedDates.length; i++) {
      const expected = format(new Date(Date.now() - (sortedDates[0] === today ? i : i + 1) * 86400000), "yyyy-MM-dd");
      if (sortedDates[i] === expected) count++;
      else break;
    }
    return count;
  }, [sessions, trainingDates]);

  const selectedSession = useMemo(() => {
    if (!selectedDate || !sessions) return null;
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    return sessions.find((s) => s.date === dateStr);
  }, [selectedDate, sessions]);

  const modifiers = {
    trained: (date: Date) => trainingDates.has(format(date, "yyyy-MM-dd")),
  };

  const modifiersStyles = {
    trained: {
      backgroundColor: "hsl(var(--primary))",
      color: "hsl(var(--primary-foreground))",
      borderRadius: "50%",
    },
  };

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6">Kalender</h1>

      <div className="space-y-4">
        {/* Streak */}
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="rounded-full bg-accent p-3">
              <Flame className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{streak} {streak === 1 ? "Tag" : "Tage"}</p>
              <p className="text-sm text-muted-foreground">aktuelle Streak</p>
            </div>
          </CardContent>
        </Card>

        {/* Calendar */}
        <Card>
          <CardContent className="p-4 flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              locale={de}
              modifiers={modifiers}
              modifiersStyles={modifiersStyles}
            />
          </CardContent>
        </Card>

        {/* Day details */}
        {selectedDate && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {format(selectedDate, "EEEE, d. MMMM yyyy", { locale: de })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedSession ? (
                <div className="space-y-2">
                  {(() => {
                    const byExercise: Record<string, { name: string; muscle_group: string; sets: { weight_kg: number; reps: number }[] }> = {};
                    selectedSession.workout_sets?.forEach((ws: any) => {
                      const key = ws.exercise_id;
                      if (!byExercise[key]) {
                        byExercise[key] = { name: ws.exercises?.name || "?", muscle_group: ws.exercises?.muscle_group || "", sets: [] };
                      }
                      byExercise[key].sets.push({ weight_kg: ws.weight_kg, reps: ws.reps });
                    });
                    return Object.values(byExercise).map((ex, i) => (
                      <div key={i} className="p-3 bg-muted rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm">{ex.name}</span>
                          <Badge variant="secondary" className="text-xs">{ex.muscle_group}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {ex.sets.map((s, j) => `${s.weight_kg}kg × ${s.reps}`).join(" | ")}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Kein Training an diesem Tag</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
