import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { de } from "date-fns/locale";
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

type ExerciseStats = {
  sessions: number;
  bestWeight: number;
  totalVolume: number;
  lastTrained: string | null;
};

export default function Exercises() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [muscleGroup, setMuscleGroup] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const { data: exercises, isLoading } = useQuery({
    queryKey: ["exercises"],
    queryFn: async () => {
      const { data, error } = await supabase.from("exercises").select("*").order("muscle_group").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: workoutSets } = useQuery({
    queryKey: ["exercise-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_sets")
        .select("exercise_id, weight_kg, reps, workout_session_id, workout_sessions(date)");
      if (error) throw error;
      return data;
    },
  });

  const statsByExercise = useMemo(() => {
    const stats: Record<string, ExerciseStats> = {};

    workoutSets?.forEach((set: any) => {
      const exerciseId = set.exercise_id;
      const sessionDate = set.workout_sessions?.date ?? null;
      if (!stats[exerciseId]) {
        stats[exerciseId] = {
          sessions: 0,
          bestWeight: 0,
          totalVolume: 0,
          lastTrained: null,
        };
      }

      stats[exerciseId].bestWeight = Math.max(stats[exerciseId].bestWeight, Number(set.weight_kg || 0));
      stats[exerciseId].totalVolume += Number(set.weight_kg || 0) * Number(set.reps || 0);

      if (sessionDate) {
        if (!stats[exerciseId].lastTrained || sessionDate > stats[exerciseId].lastTrained) {
          stats[exerciseId].lastTrained = sessionDate;
        }
      }
    });

    const sessionsByExercise: Record<string, Set<string>> = {};
    workoutSets?.forEach((set) => {
      sessionsByExercise[set.exercise_id] = sessionsByExercise[set.exercise_id] || new Set();
      sessionsByExercise[set.exercise_id].add(set.workout_session_id);
    });

    Object.keys(sessionsByExercise).forEach((exerciseId) => {
      stats[exerciseId].sessions = sessionsByExercise[exerciseId].size;
    });

    return stats;
  }, [workoutSets]);

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
                  const stats = statsByExercise[ex.id];
                  return (
                    <Card key={ex.id} className="overflow-hidden">
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
                            <Button variant="ghost" size="icon" onClick={() => startEdit(ex)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(ex.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>

                        <div className="mt-4 rounded-lg bg-muted/60 p-3 text-xs space-y-1">
                          <p><span className="font-medium">Trainings:</span> {stats?.sessions ?? 0}</p>
                          <p><span className="font-medium">Bestes Gewicht:</span> {stats?.bestWeight ?? 0} kg</p>
                          <p><span className="font-medium">Gesamtvolumen:</span> {Math.round(stats?.totalVolume ?? 0)} kg</p>
                          <p>
                            <span className="font-medium">Zuletzt:</span>{" "}
                            {stats?.lastTrained
                              ? format(new Date(stats.lastTrained), "dd.MM.yyyy", { locale: de })
                              : "noch nie"}
                          </p>
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
    </Layout>
  );
}
