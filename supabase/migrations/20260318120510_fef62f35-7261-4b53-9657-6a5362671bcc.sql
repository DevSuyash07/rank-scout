
-- Create rankings table
CREATE TABLE public.rankings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword TEXT NOT NULL,
  domain TEXT NOT NULL,
  location TEXT NOT NULL,
  device TEXT NOT NULL,
  position TEXT NOT NULL,
  url TEXT DEFAULT 'N/A',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rankings ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read rankings (no auth required for this tool)
CREATE POLICY "Anyone can read rankings" ON public.rankings FOR SELECT USING (true);

-- Allow inserts from service role (edge functions)
CREATE POLICY "Service role can insert rankings" ON public.rankings FOR INSERT WITH CHECK (true);
