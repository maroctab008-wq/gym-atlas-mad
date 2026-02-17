
-- Add member_name column to preserve member identity after deletion
ALTER TABLE public.payments ADD COLUMN member_name text;

-- Backfill existing payments with current member names
UPDATE public.payments p
SET member_name = m.full_name
FROM public.members m
WHERE p.member_id = m.id AND p.member_name IS NULL;
