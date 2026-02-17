
-- Make member_id nullable so payments survive member deletion
ALTER TABLE public.payments ALTER COLUMN member_id DROP NOT NULL;

-- Change CASCADE to SET NULL for member_id FK
ALTER TABLE public.payments DROP CONSTRAINT payments_member_id_fkey;
ALTER TABLE public.payments ADD CONSTRAINT payments_member_id_fkey 
  FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE SET NULL;
