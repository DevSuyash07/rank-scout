
-- Add user_id column to rankings
ALTER TABLE public.rankings ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop old RLS policies
DROP POLICY IF EXISTS "Anyone can read rankings" ON public.rankings;
DROP POLICY IF EXISTS "Service role can insert rankings" ON public.rankings;

-- New RLS: users can only read their own data
CREATE POLICY "Users can read own rankings"
  ON public.rankings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- New RLS: users can only insert their own data
CREATE POLICY "Users can insert own rankings"
  ON public.rankings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Service role can still insert (for edge functions)
CREATE POLICY "Service role can insert rankings"
  ON public.rankings FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Service role can read all (for edge functions)
CREATE POLICY "Service role can read all rankings"
  ON public.rankings FOR SELECT
  TO service_role
  USING (true);
