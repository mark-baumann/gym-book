import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Dumbbell, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { MUSCLE_GROUPS } from "@/lib/constants";
import Layout from "@/components/Layout";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

export default function Exercises() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [muscleGroup, setMuscleGroup] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<{ id: string; name: string } | null>(null);
  const [weightInput, setWeightInput] = useState("");

  const { data: exercises, isLoading } = useQuery({
    queryKey: ["exercises"],
    queryFn: async () => {
      const { data, error } = await supabase.from("exercises").select("*").order("muscle_group").order("name");
      if (error) throw error;
      return data;
    },
  });

  const quickLogMutation = useMutation({
    mutationFn: async ({ exerciseId, weightKg }: { exerciseId: string; weightKg: number }) => {
      const { data: session, error: sessionError } = await supabase
        .from("workout_sessions")
        .insert({ training_plan_id: null, notes: "Schnelllog aus Übungen" })
        .select("id")
        .single();
      if (sessionError) throw sessionError;

      const { error } = await supabase.from("workout_sets").insert({
        workout_session_id: session.id,
        exercise_id: exerciseId,
        set_number: 1,
        reps: 1,
        weight_kg: weightKg,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
      queryClient.invalidateQueries({ queryKey: ["exercise-bests"] });
      queryClient.invalidateQueries({ queryKey: ["exercise-progress"] });
      queryClient.invalidateQueries({ queryKey: ["workout-sessions-calendar"] });
      toast.success("Gewicht gespeichert");
      setSelectedExercise(null);
      setWeightInput("");
    },
    onError: () => toast.error("Fehler beim Speichern des Gewichts"),
  });

  const { data: exerciseBests } = useQuery({
    queryKey: ["exercise-bests"],
    queryFn: async () => {
      const { data, error } = await supabase.from("workout_sets").select("exercise_id, weight_kg");
      if (error) throw error;

      return data.reduce<Record<string, number>>((acc, row) => {
        const current = acc[row.exercise_id] ?? 0;
        if (row.weight_kg > current) acc[row.exercise_id] = row.weight_kg;
        return acc;
      }, {});
    },
  });

  const { data: selectedExerciseProgress } = useQuery({
    queryKey: ["exercise-progress", selectedExercise?.id],
    enabled: !!selectedExercise,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_sets")
        .select("weight_kg, workout_sessions(date)")
        .eq("exercise_id", selectedExercise!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const progressChartData = useMemo(() => {
    if (!selectedExerciseProgress) return [];
    const byDate: Record<string, number> = {};
    selectedExerciseProgress.forEach((row: any) => {
      const date = row.workout_sessions?.date;
      if (!date) return;
      byDate[date] = Math.max(byDate[date] ?? 0, Number(row.weight_kg));
    });

    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, weight]) => ({
        date,
        weight,
        label: new Date(date).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }),
      }));
  }, [selectedExerciseProgress]);

  const uploadImage = async (file: File): Promise<string> => {
    const ext = file.name.split(".").pop();
    const fileName = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("exercise-images").upload(fileName, file);
    if (error) throw error;
    const { data } = supabase.storage.from("exercise-images").getPublicUrl(fileName);
    return data.publicUrl;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      let image_url: string | undefined;
      if (imageFile) {
        image_url = await uploadImage(imageFile);
      }

      if (editId) {
        const updateData: Record<string, unknown> = { name, description, muscle_group: muscleGroup };
        if (image_url) updateData.image_url = image_url;
        const { error } = await supabase.from("exercises").update(updateData).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("exercises").insert({ name, description, muscle_group: muscleGroup, image_url: image_url || null });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
      resetForm();
      toast.success(editId ? "Übung aktualisiert" : "Übung erstellt");
    },
    onError: () => toast.error("Fehler beim Speichern"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("exercises").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
      toast.success("Übung gelöscht");
    },
  });

  const resetForm = () => {
    setOpen(false);
    setEditId(null);
    setName("");
    setDescription("");
    setMuscleGroup("");
    setImageFile(null);
    setImagePreview(null);
  };

  const startEdit = (ex: NonNullable<typeof exercises>[0]) => {
    setEditId(ex.id);
    setName(ex.name);
    setDescription(ex.description || "");
    setMuscleGroup(ex.muscle_group);
    setImagePreview(ex.image_url);
    setOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const openWeightDialog = (exerciseId: string, exerciseName: string, bestWeight: number) => {
    setSelectedExercise({ id: exerciseId, name: exerciseName });
    setWeightInput(bestWeight > 0 ? String(bestWeight) : "");
  };

  const saveWeight = () => {
    if (!selectedExercise) return;
    const weightKg = Number(weightInput);
    if (!weightKg || weightKg <= 0) {
      toast.error("Bitte ein gültiges Gewicht eingeben");
      return;
    }

    quickLogMutation.mutate({ exerciseId: selectedExercise.id, weightKg });
  };

  const grouped = exercises?.reduce((acc, ex) => {
    (acc[ex.muscle_group] = acc[ex.muscle_group] || []).push(ex);
    return acc;
  }, {} as Record<string, typeof exercises>);

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Übungen</h1>
        <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); else setOpen(true); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Neue Übung</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editId ? "Übung bearbeiten" : "Neue Übung"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="z.B. Bankdrücken" />
              </div>
              <div>
                <Label>Muskelgruppe</Label>
                <Select value={muscleGroup} onValueChange={setMuscleGroup}>
                  <SelectTrigger><SelectValue placeholder="Wählen..." /></SelectTrigger>
                  <SelectContent>
                    {MUSCLE_GROUPS.map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Beschreibung</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
              </div>
              <div>
                <Label>Foto</Label>
                <Input type="file" accept="image/*" onChange={handleImageChange} />
                {imagePreview && (
                  <img src={imagePreview} alt="Preview" className="mt-2 h-32 w-32 object-cover rounded-lg" />
                )}
              </div>
              <Button onClick={() => saveMutation.mutate()} disabled={!name || !muscleGroup || saveMutation.isPending} className="w-full">
                {saveMutation.isPending ? "Speichern..." : "Speichern"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Laden...</p>
      ) : !exercises?.length ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Dumbbell className="h-12 w-12 mb-4" />
          <p>Noch keine Übungen erstellt</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped || {}).map(([group, exs]) => (
            <div key={group}>
              <h2 className="text-lg font-semibold mb-3">{group}</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {exs?.map((ex) => {
                  const bestWeight = Number(exerciseBests?.[ex.id] ?? ex.max_weight_kg ?? 0);
                  return (
                    <Card
                      key={ex.id}
                      className="overflow-hidden cursor-pointer transition-shadow hover:shadow-md"
                      onClick={() => openWeightDialog(ex.id, ex.name, bestWeight)}
                    >
                      {ex.image_url ? (
                        <img src={ex.image_url} alt={ex.name} className="h-40 w-full object-cover" />
                      ) : (
                        <div className="h-40 w-full bg-muted flex items-center justify-center">
                          <ImageIcon className="h-10 w-10 text-muted-foreground" />
                        </div>
                      )}
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold">{ex.name}</h3>
                            {ex.description && <p className="text-sm text-muted-foreground mt-1">{ex.description}</p>}
                            <Badge variant="secondary" className="mt-2">{ex.muscle_group}</Badge>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); startEdit(ex); }}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(ex.id); }}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>

                        <div className="mt-4 rounded-lg bg-muted/60 p-3 text-xs space-y-1">
                          <p><span className="font-medium">Bestes Gewicht:</span> {bestWeight} kg</p>
                          <p className="text-muted-foreground">Tippe auf die Karte, um kg zu speichern.</p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!selectedExercise} onOpenChange={(openState) => { if (!openState) setSelectedExercise(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedExercise?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="weight-input">Gewicht in kg</Label>
              <Input
                id="weight-input"
                type="number"
                min="0"
                step="0.5"
                placeholder="z.B. 60"
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
              />
            </div>
            <Button onClick={saveWeight} disabled={quickLogMutation.isPending} className="w-full">
              {quickLogMutation.isPending ? "Speichern..." : "Gewicht speichern"}
            </Button>

            <div className="space-y-2">
              <p className="text-sm font-medium">Fortschritt (Bestleistung je Trainingstag)</p>
              {progressChartData.length ? (
                <ChartContainer
                  config={{ weight: { label: "Gewicht", color: "hsl(var(--primary))" } }}
                  className="h-52 w-full"
                >
                  <LineChart data={progressChartData}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} width={40} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="weight" stroke="var(--color-weight)" strokeWidth={2} dot />
                  </LineChart>
                </ChartContainer>
              ) : (
                <p className="text-sm text-muted-foreground">Noch keine Daten vorhanden.</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
