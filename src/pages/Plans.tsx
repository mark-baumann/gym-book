import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, ClipboardList, GripVertical } from "lucide-react";
import { toast } from "sonner";
import Layout from "@/components/Layout";

export default function Plans() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [planName, setPlanName] = useState("");
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);

  const { data: plans, isLoading } = useQuery({
    queryKey: ["training-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_plans")
        .select("*, training_plan_exercises(*, exercises(*))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: exercises } = useQuery({
    queryKey: ["exercises"],
    queryFn: async () => {
      const { data, error } = await supabase.from("exercises").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: plan, error } = await supabase.from("training_plans").insert({ name: planName }).select().single();
      if (error) throw error;

      if (selectedExercises.length > 0) {
        const entries = selectedExercises.map((exercise_id, i) => ({
          training_plan_id: plan.id,
          exercise_id,
          sort_order: i,
        }));
        const { error: linkError } = await supabase.from("training_plan_exercises").insert(entries);
        if (linkError) throw linkError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-plans"] });
      setOpen(false);
      setPlanName("");
      setSelectedExercises([]);
      toast.success("Trainingsplan erstellt");
    },
    onError: () => toast.error("Fehler beim Erstellen"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("training_plans").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-plans"] });
      toast.success("Plan gelöscht");
    },
  });

  const toggleExercise = (id: string) => {
    setSelectedExercises((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  };

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Trainingspläne</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Neuer Plan</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Neuer Trainingsplan</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input value={planName} onChange={(e) => setPlanName(e.target.value)} placeholder="z.B. Push Day" />
              </div>
              <div>
                <Label>Übungen auswählen</Label>
                <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                  {exercises?.map((ex) => (
                    <label key={ex.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer">
                      <Checkbox
                        checked={selectedExercises.includes(ex.id)}
                        onCheckedChange={() => toggleExercise(ex.id)}
                      />
                      <span className="text-sm">{ex.name}</span>
                      <span className="text-xs text-muted-foreground ml-auto">{ex.muscle_group}</span>
                    </label>
                  ))}
                  {!exercises?.length && <p className="text-sm text-muted-foreground">Erstelle zuerst Übungen</p>}
                </div>
              </div>
              <Button onClick={() => createMutation.mutate()} disabled={!planName || createMutation.isPending} className="w-full">
                Erstellen
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Laden...</p>
      ) : !plans?.length ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <ClipboardList className="h-12 w-12 mb-4" />
          <p>Noch keine Trainingspläne</p>
        </div>
      ) : (
        <div className="space-y-4">
          {plans.map((plan) => (
            <Card key={plan.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(plan.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {plan.training_plan_exercises?.length ? (
                  <div className="space-y-2">
                    {plan.training_plan_exercises
                      .sort((a, b) => a.sort_order - b.sort_order)
                      .map((tpe) => (
                        <div key={tpe.id} className="flex items-center gap-2 text-sm p-2 bg-muted rounded-lg">
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                          <span>{(tpe as any).exercises?.name}</span>
                          <span className="text-xs text-muted-foreground ml-auto">{(tpe as any).exercises?.muscle_group}</span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Keine Übungen zugeordnet</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </Layout>
  );
}
