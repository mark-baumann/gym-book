import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Flame, Trash2 } from "lucide-react";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { de } from "date-fns/locale";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function CalendarView() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [visibleMonth, setVisibleMonth] = useState<Date>(new Date());

  const { data: sessions } = useQuery({
    queryKey: ["workout-sessions-calendar"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_sessions")
        .select("*, training_plans(name), workout_sets(*, exercises(name, muscle_group))")
        .order("date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: supplementIntake } = useQuery({
    queryKey: ["supplement-intake-calendar"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supplement_intake")
        .select("id, supplement, date")
        .order("date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const trainingDates = useMemo(() => {
    if (!sessions) return new Set<string>();
    return new Set(sessions.map((s) => s.date));
  }, [sessions]);

  const monthlyStreak = useMemo(() => {
    const monthStart = format(startOfMonth(visibleMonth), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(visibleMonth), "yyyy-MM-dd");
    return [...trainingDates].filter((date) => date >= monthStart && date <= monthEnd).length;
  }, [trainingDates, visibleMonth]);

  const deleteSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const { error: setsError } = await supabase.from("workout_sets").delete().eq("workout_session_id", sessionId);
      if (setsError) throw setsError;

      const { error } = await supabase.from("workout_sessions").delete().eq("id", sessionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-sessions-calendar"] });
      queryClient.invalidateQueries({ queryKey: ["exercise-bests"] });
      queryClient.invalidateQueries({ queryKey: ["exercise-progress"] });
      toast.success("Workout gelöscht");
    },
    onError: () => toast.error("Workout konnte nicht gelöscht werden"),
  });

  const selectedSessions = useMemo(() => {
    if (!selectedDate || !sessions) return [];
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    return sessions.filter((s) => s.date === dateStr);
  }, [selectedDate, sessions]);

  const selectedSupplements = useMemo(() => {
    if (!selectedDate || !supplementIntake) return [];
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    return supplementIntake.filter((entry) => entry.date === dateStr);
  }, [selectedDate, supplementIntake]);

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
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="rounded-full bg-accent p-3">
              <Flame className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{monthlyStreak} {monthlyStreak === 1 ? "Tag" : "Tage"}</p>
              <p className="text-sm text-muted-foreground">Gym-Tage in {format(visibleMonth, "MMMM yyyy", { locale: de })}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              month={visibleMonth}
              onMonthChange={setVisibleMonth}
              locale={de}
              modifiers={modifiers}
              modifiersStyles={modifiersStyles}
            />
          </CardContent>
        </Card>

        {selectedDate && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {format(selectedDate, "EEEE, d. MMMM yyyy", { locale: de })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedSessions.length ? (
                <div className="space-y-3">
                  {selectedSessions.map((session) => {
                    const byExercise: Record<string, { name: string; muscle_group: string; sets: { weight_kg: number; reps: number }[] }> = {};
                    session.workout_sets?.forEach((ws: any) => {
                      const key = ws.exercise_id;
                      if (!byExercise[key]) {
                        byExercise[key] = { name: ws.exercises?.name || "?", muscle_group: ws.exercises?.muscle_group || "", sets: [] };
                      }
                      byExercise[key].sets.push({ weight_kg: ws.weight_kg, reps: ws.reps });
                    });

                    return (
                      <div key={session.id} className="rounded-lg border p-3">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <p className="text-sm font-medium">
                            {(session as any).training_plans?.name || "Freies Training"}
                          </p>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => deleteSessionMutation.mutate(session.id)}
                            disabled={deleteSessionMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>

                        {Object.values(byExercise).length ? (
                          <div className="space-y-2">
                            {Object.values(byExercise).map((exercise, index) => (
                              <div key={index} className="p-3 bg-muted rounded-lg">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-medium text-sm">{exercise.name}</span>
                                  <Badge variant="secondary" className="text-xs">{exercise.muscle_group}</Badge>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {exercise.sets.map((set) => `${set.weight_kg}kg × ${set.reps}`).join(" | ")}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">Plan als erledigt markiert</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Kein Training an diesem Tag</p>
              )}

              {selectedSupplements.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-medium mb-2">Supplemente</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedSupplements.map((entry) => (
                      <Badge key={entry.id} variant="secondary">
                        {entry.supplement === "creatine" ? "Kreatin" : "Protein"}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
