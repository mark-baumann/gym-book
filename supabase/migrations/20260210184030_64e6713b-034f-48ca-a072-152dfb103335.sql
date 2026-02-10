
-- Exercises table
CREATE TABLE public.exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  muscle_group TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to exercises" ON public.exercises FOR ALL USING (true) WITH CHECK (true);

-- Training plans
CREATE TABLE public.training_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.training_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to training_plans" ON public.training_plans FOR ALL USING (true) WITH CHECK (true);

-- Training plan exercises (junction table with order)
CREATE TABLE public.training_plan_exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  training_plan_id UUID NOT NULL REFERENCES public.training_plans(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.training_plan_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to training_plan_exercises" ON public.training_plan_exercises FOR ALL USING (true) WITH CHECK (true);

-- Workout sessions
CREATE TABLE public.workout_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  training_plan_id UUID REFERENCES public.training_plans(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to workout_sessions" ON public.workout_sessions FOR ALL USING (true) WITH CHECK (true);

-- Workout sets (individual sets per exercise per session)
CREATE TABLE public.workout_sets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_session_id UUID NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL DEFAULT 1,
  weight_kg NUMERIC(6,2) NOT NULL DEFAULT 0,
  reps INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.workout_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to workout_sets" ON public.workout_sets FOR ALL USING (true) WITH CHECK (true);

-- Storage bucket for exercise images
INSERT INTO storage.buckets (id, name, public) VALUES ('exercise-images', 'exercise-images', true);

CREATE POLICY "Allow all uploads to exercise-images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'exercise-images');
CREATE POLICY "Allow all reads from exercise-images" ON storage.objects FOR SELECT USING (bucket_id = 'exercise-images');
CREATE POLICY "Allow all deletes from exercise-images" ON storage.objects FOR DELETE USING (bucket_id = 'exercise-images');
