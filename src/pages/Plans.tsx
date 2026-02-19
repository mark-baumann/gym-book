import { useMemo, useState } from "react";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, ClipboardList, GripVertical, Pencil, CheckCircle2, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import Layout from "@/components/Layout";
import { useNavigate } from "react-router-dom";

type PlanFormState = {
  id: string | null;
  name: string;
  selectedExercises: string[];
};

const initialFormState: PlanFormState = {
  id: null,
  name: "",
  selectedExercises: [],
};

export default function Plans() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [formState, setFormState] = useState<PlanFormState>(initialFormState);

  const today = format(new Date(), "yyyy-MM-dd");

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

  const { data: todaySessions } = useQuery({
    queryKey: ["workout-sessions", today],
    queryFn: async () => {
      const { data, error } = await supabase.from("workout_sessions").select("id, training_plan_id, date").eq("date", today);
      if (error) throw error;
      return data;
    },
  });

  const completedPlanIds = useMemo(
    () => new Set(todaySessions?.map((s) => s.training_plan_id).filter(Boolean)),
    [todaySessions]
  );

  const openCreate = () => {
    setFormState(initialFormState);
    setOpen(true);
  };

  const openEdit = (plan: NonNullable<typeof plans>[number]) => {
    const orderedExercises = [...(plan.training_plan_exercises || [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((entry) => entry.exercise_id);

    setFormState({
      id: plan.id,
      name: plan.name,
      selectedExercises: orderedExercises,
    });
    setOpen(true);
  };

  const closeDialog = () => {
    setOpen(false);
    setFormState(initialFormState);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      let planId = formState.id;

      if (planId) {
        const { error } = await supabase.from("training_plans").update({ name: formState.name }).eq("id", planId);
        if (error) throw error;

        const { error: deleteError } = await supabase.from("training_plan_exercises").delete().eq("training_plan_id", planId);
        if (deleteError) throw deleteError;
      } else {
        const { data: plan, error } = await supabase
          .from("training_plans")
          .insert({ name: formState.name })
          .select()
          .single();
        if (error) throw error;
        planId = plan.id;
      }

      if (formState.selectedExercises.length > 0 && planId) {
        const entries = formState.selectedExercises.map((exercise_id, i) => ({
          training_plan_id: planId,
          exercise_id,
          sort_order: i,
        }));
        const { error: linkError } = await supabase.from("training_plan_exercises").insert(entries);
        if (linkError) throw linkError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-plans"] });
      closeDialog();
      toast.success(formState.id ? "Plan aktualisiert" : "Trainingsplan erstellt");
    },
    onError: () => toast.error("Fehler beim Speichern"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("training_plans").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-plans"] });
      queryClient.invalidateQueries({ queryKey: ["workout-sessions"] });
      toast.success("Plan gelöscht");
    },
  });

  const toggleCompletedTodayMutation = useMutation({
    mutationFn: async (planId: string) => {
      const existing = todaySessions?.find((session) => session.training_plan_id === planId);

      if (existing) {
        const { error } = await supabase.from("workout_sessions").delete().eq("id", existing.id);
        if (error) throw error;
        return "deleted";
      }

      const { error } = await supabase.from("workout_sessions").insert({ training_plan_id: planId, date: today });
      if (error) throw error;
      return "created";
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["workout-sessions", today] });
      queryClient.invalidateQueries({ queryKey: ["workout-sessions-calendar"] });
      toast.success(result === "created" ? "Heute als erledigt markiert" : "Markierung für heute entfernt");
    },
    onError: () => toast.error("Status konnte nicht gespeichert werden"),
  });

  const toggleExercise = (id: string) => {
    setFormState((prev) => ({
      ...prev,
      selectedExercises: prev.selectedExercises.includes(id)
        ? prev.selectedExercises.filter((exerciseId) => exerciseId !== id)
        : [...prev.selectedExercises, id],
    }));
  };

  const moveExercise = (id: string, direction: "up" | "down") => {
    setFormState((prev) => {
      const currentIndex = prev.selectedExercises.indexOf(id);
      if (currentIndex === -1) return prev;

      const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= prev.selectedExercises.length) return prev;

      const next = [...prev.selectedExercises];
      [next[currentIndex], next[targetIndex]] = [next[targetIndex], next[currentIndex]];
      return { ...prev, selectedExercises: next };
    });
  };

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Trainingspläne</h1>
        <Dialog open={open} onOpenChange={(isOpen) => (isOpen ? setOpen(true) : closeDialog())}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />Neuer Plan
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{formState.id ? "Plan bearbeiten" : "Neuer Trainingsplan"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={formState.name}
                  onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="z.B. Push Day"
                />
              </div>
              <div>
                <Label>Übungen auswählen</Label>
                <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                  {exercises?.map((exercise) => (
                    <label key={exercise.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer">
                      <Checkbox
                        checked={formState.selectedExercises.includes(exercise.id)}
                        onCheckedChange={() => toggleExercise(exercise.id)}
                      />
                      <span className="text-sm">{exercise.name}</span>
                      <span className="text-xs text-muted-foreground ml-auto">{exercise.muscle_group}</span>
                    </label>
                  ))}
                  {!exercises?.length && <p className="text-sm text-muted-foreground">Erstelle zuerst Übungen</p>}
                </div>
              </div>
              {formState.selectedExercises.length > 0 && (
                <div>
                  <Label>Reihenfolge im Plan</Label>
                  <div className="mt-2 space-y-2">
                    {formState.selectedExercises.map((exerciseId, index) => {
                      const exercise = exercises?.find((entry) => entry.id === exerciseId);
                      if (!exercise) return null;

                      return (
                        <div key={exerciseId} className="flex items-center gap-2 rounded-lg border p-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{exercise.name}</span>
                          <span className="ml-auto text-xs text-muted-foreground">{exercise.muscle_group}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => moveExercise(exerciseId, "up")}
                            disabled={index === 0}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => moveExercise(exerciseId, "down")}
                            disabled={index === formState.selectedExercises.length - 1}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <Button onClick={() => saveMutation.mutate()} disabled={!formState.name || saveMutation.isPending} className="w-full">
                {formState.id ? "Änderungen speichern" : "Erstellen"}
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
          {plans.map((plan) => {
            const isCompletedToday = completedPlanIds.has(plan.id);
            return (
              <Card key={plan.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(plan)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(plan.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {plan.training_plan_exercises?.length ? (
                    <div className="space-y-2 mb-4">
                      {plan.training_plan_exercises
                        .sort((a, b) => a.sort_order - b.sort_order)
                        .map((tpe) => (
                          <div key={tpe.id} className="flex items-center gap-2 text-sm p-2 bg-muted rounded-lg">
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                            <button
                              type="button"
                              onClick={() => navigate(`/exercises/${tpe.exercise_id}`)}
                              className="text-left hover:underline"
                            >
                              {(tpe as any).exercises?.name}
                            </button>
                            <span className="text-xs text-muted-foreground ml-auto">{(tpe as any).exercises?.muscle_group}</span>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mb-4">Keine Übungen zugeordnet</p>
                  )}

                  <Button
                    className="w-full"
                    variant={isCompletedToday ? "secondary" : "default"}
                    onClick={() => toggleCompletedTodayMutation.mutate(plan.id)}
                    disabled={toggleCompletedTodayMutation.isPending}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    {isCompletedToday ? "Heute erledigt ✓" : "Heute als erledigt markieren"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
