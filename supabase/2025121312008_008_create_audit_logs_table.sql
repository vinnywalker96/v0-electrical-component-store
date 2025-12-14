-- 008_create_audit_logs_table.sql

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- User who performed the action
  user_email TEXT, -- Snapshot of user's email at the time of action
  action TEXT NOT NULL, -- e.g., 'product_created', 'product_updated', 'user_role_changed', 'order_status_updated'
  table_name TEXT, -- Table affected, e.g., 'products', 'profiles', 'orders'
  record_id UUID, -- ID of the record affected
  old_value JSONB, -- Old state of the record (optional)
  new_value JSONB, -- New state of the record (optional)
  ip_address INET, -- IP address of the user (optional)
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins and super_admins can read audit logs
CREATE POLICY "Allow admin and super_admin read audit logs" ON public.audit_logs
FOR SELECT USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin');

-- No one except database functions/triggers should insert directly, but for API usage:
-- Only authenticated users (admins/super_admins) can insert
CREATE POLICY "Allow authenticated admin/super_admin to insert audit logs" ON public.audit_logs
FOR INSERT WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin');
