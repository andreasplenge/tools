CREATE POLICY "Allow public read access to page_visits"
ON public.page_visits
FOR SELECT
TO anon, authenticated
USING (true);