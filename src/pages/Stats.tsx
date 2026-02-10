import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar, ResponsiveContainer } from "recharts";
import { BarChart3 } from "lucide-react";
import { useState } from "react";
import { format, startOfMonth, eachMonthOfInterval, subMonths } from "date-fns";
import { de } from "date-fns/locale";
import Layout from "@/components/Layout";

export default function Stats() {
  const [selectedExercise, setSelectedExercise] = useState<string>("");

  const { data: exercises } = useQuery({
    queryKey: ["exercises"],
    queryFn: async () => {
      const { data, error } = await supabase.from("exercises").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: weightData } = useQuery({
    queryKey: ["weight-progress", selectedExercise],
    enabled: !!selectedExercise,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_sets")
        .select("weight_kg, created_at, workout_session_id, workout_sessions(date)")
        .eq("exercise_id", selectedExercise)
        .order("created_at");
      if (error) throw error;

      // Group by session date, take max weight per session
      const byDate: Record<string, number> = {};
      data.forEach((s) => {
        const date = (s as any).workout_sessions?.date || s.created_at.split("T")[0];
        byDate[date] = Math.max(byDate[date] || 0, Number(s.weight_kg));
      });

      return Object.entries(byDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, weight]) => ({
          date: format(new Date(date), "dd.MM", { locale: de }),
          weight,
        }));
    },
  });

  const { data: frequencyData } = useQuery({
    queryKey: ["training-frequency"],
    queryFn: async () => {
      const { data, error } = await supabase.from("workout_sessions").select("date").order("date");
      if (error) throw error;

      if (!data.length) return [];

      const months = eachMonthOfInterval({
        start: subMonths(new Date(), 5),
        end: new Date(),
      });

      return months.map((month) => {
        const monthStr = format(month, "yyyy-MM");
        const count = data.filter((s) => s.date.startsWith(monthStr)).length;
        return { month: format(month, "MMM yy", { locale: de }), trainings: count };
      });
    },
  });

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6">Statistiken</h1>

      <div className="space-y-6">
        {/* Weight progress */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Gewichtsverlauf</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedExercise} onValueChange={setSelectedExercise}>
              <SelectTrigger className="mb-4"><SelectValue placeholder="Übung auswählen..." /></SelectTrigger>
              <SelectContent>
                {exercises?.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedExercise && weightData?.length ? (
              <ChartContainer config={{ weight: { label: "Gewicht (kg)", color: "hsl(var(--primary))" } }} className="h-[250px]">
                <LineChart data={weightData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="weight" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ChartContainer>
            ) : selectedExercise ? (
              <p className="text-sm text-muted-foreground text-center py-8">Noch keine Daten für diese Übung</p>
            ) : null}
          </CardContent>
        </Card>

        {/* Frequency */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Trainingshäufigkeit</CardTitle>
          </CardHeader>
          <CardContent>
            {frequencyData?.length ? (
              <ChartContainer config={{ trainings: { label: "Trainings", color: "hsl(var(--primary))" } }} className="h-[200px]">
                <BarChart data={frequencyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="trainings" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex flex-col items-center py-8 text-muted-foreground">
                <BarChart3 className="h-8 w-8 mb-2" />
                <p className="text-sm">Noch keine Trainingsdaten</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
