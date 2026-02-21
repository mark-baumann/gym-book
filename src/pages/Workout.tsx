import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Play, Save } from "lucide-react";
import { toast } from "sonner";
import Layout from "@/components/Layout";

type SetEntry = {
  exercise_id: string;
  exercise_name: string;
  sets: { weight_kg: number; reps: number }[];
};

export default function Workout() {
  const queryClient = useQueryClient();
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [entries, setEntries] = useState<SetEntry[]>([]);
  const [started, setStarted] = useState(false);

  const { data: plans } = useQuery({
    queryKey: ["training-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_plans")
        .select("*, training_plan_exercises(*, exercises(*))")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const startFromPlan = () => {
    const plan = plans?.find((p) => p.id === selectedPlanId);
    if (!plan) return;

    const planEntries: SetEntry[] = plan.training_plan_exercises
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((tpe) => ({
        exercise_id: tpe.exercise_id,
        exercise_name: (tpe as any).exercises?.name || "Unbekannt",
        sets: [{ weight_kg: 0, reps: 0 }],
      }));

    setEntries(planEntries);
    setStarted(true);
  };

  const addSet = (idx: number) => {
    setEntries((prev) => {
      const copy = [...prev];
      const lastSet = copy[idx].sets[copy[idx].sets.length - 1];
      copy[idx] = { ...copy[idx], sets: [...copy[idx].sets, { ...lastSet }] };
      return copy;
    });
  };

  const updateSet = (exIdx: number, setIdx: number, field: "weight_kg" | "reps", value: number) => {
    setEntries((prev) => {
      const copy = [...prev];
      const sets = [...copy[exIdx].sets];
      sets[setIdx] = { ...sets[setIdx], [field]: value };
      copy[exIdx] = { ...copy[exIdx], sets };
      return copy;
    });
  };

  const removeSet = (exIdx: number, setIdx: number) => {
    setEntries((prev) => {
      const copy = [...prev];
      const sets = copy[exIdx].sets.filter((_, i) => i !== setIdx);
      if (sets.length === 0) return prev;
      copy[exIdx] = { ...copy[exIdx], sets };
      return copy;
    });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: session, error: sessionError } = await supabase
        .from("workout_sessions")
        .insert({ training_plan_id: selectedPlanId || null })
        .select()
        .single();
      if (sessionError) throw sessionError;

      const allSets = entries.flatMap((entry) =>
        entry.sets.map((s, i) => ({
          workout_session_id: session.id,
          exercise_id: entry.exercise_id,
          set_number: i + 1,
          weight_kg: s.weight_kg,
          reps: s.reps,
        }))
      );

      const { error } = await supabase.from("workout_sets").insert(allSets);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-sessions"] });
      setStarted(false);
      setEntries([]);
      setSelectedPlanId("");
      toast.success("Training gespeichert! 💪");
    },
    onError: () => toast.error("Fehler beim Speichern"),
  });


  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6">Training</h1>

      {!started ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Trainingsplan starten</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger><SelectValue placeholder="Plan auswählen..." /></SelectTrigger>
                <SelectContent>
                  {plans?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={startFromPlan} disabled={!selectedPlanId} className="w-full">
                <Play className="h-4 w-4 mr-2" />Plan starten
              </Button>
            </CardContent>
          </Card>

          <div className="text-center text-muted-foreground text-sm">oder</div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Freies Training</CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" onClick={() => { setStarted(true); setEntries([]); }}>
                Ohne Plan starten
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map((entry, exIdx) => (
            <Card key={exIdx}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{entry.exercise_name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {entry.sets.map((s, setIdx) => (
                  <div key={setIdx} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-8">#{setIdx + 1}</span>
                    <div className="flex-1">
                      <Input
                        type="number"
                        placeholder="kg"
                        value={s.weight_kg || ""}
                        onChange={(e) => updateSet(exIdx, setIdx, "weight_kg", Number(e.target.value))}
                        className="h-9"
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">kg</span>
                    <div className="flex-1">
                      <Input
                        type="number"
                        placeholder="Wdh"
                        value={s.reps || ""}
                        onChange={(e) => updateSet(exIdx, setIdx, "reps", Number(e.target.value))}
                        className="h-9"
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">Wdh</span>
                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => removeSet(exIdx, setIdx)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => addSet(exIdx)}>
                  <Plus className="h-3 w-3 mr-1" />Satz
                </Button>
              </CardContent>
            </Card>
          ))}

          <Button
            onClick={() => saveMutation.mutate()}
            disabled={entries.length === 0 || saveMutation.isPending}
            className="w-full"
            size="lg"
          >
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? "Speichern..." : "Training speichern"}
          </Button>
        </div>
      )}
    </Layout>
  );
}
