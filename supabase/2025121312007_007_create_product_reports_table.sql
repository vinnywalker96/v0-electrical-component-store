-- 007_create_product_reports_table.sql

CREATE TABLE IF NOT EXISTS public.product_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- User who reported, can be null if user deleted
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, reviewed, dismissed, acted_upon
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS for product_reports
ALTER TABLE public.product_reports ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to create a report
CREATE POLICY "Allow authenticated users to create product reports" ON public.product_reports
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow reporters to read their own reports
CREATE POLICY "Allow reporters to read their own reports" ON public.product_reports
FOR SELECT USING (reporter_id = auth.uid());

-- Allow admins and super_admins to read all reports
CREATE POLICY "Allow admin and super_admin read all product reports" ON public.product_reports
FOR SELECT USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin');

-- Allow admins and super_admins to update report status
CREATE POLICY "Allow admin and super_admin update product reports" ON public.product_reports
FOR UPDATE USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin');
