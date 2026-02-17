
-- Change subscriptions FK to SET NULL instead of CASCADE when member deleted
ALTER TABLE public.subscriptions ALTER COLUMN member_id DROP NOT NULL;
ALTER TABLE public.subscriptions DROP CONSTRAINT subscriptions_member_id_fkey;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_member_id_fkey 
  FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE SET NULL;

-- Same for access_logs
ALTER TABLE public.access_logs ALTER COLUMN member_id DROP NOT NULL;
ALTER TABLE public.access_logs DROP CONSTRAINT access_logs_member_id_fkey;
ALTER TABLE public.access_logs ADD CONSTRAINT access_logs_member_id_fkey 
  FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE SET NULL;
