
-- Add member_name column to subscriptions for traceability after member deletion
ALTER TABLE public.subscriptions ADD COLUMN member_name text;

-- Populate existing subscriptions with current member names
UPDATE public.subscriptions s
SET member_name = m.full_name
FROM public.members m
WHERE s.member_id = m.id;
