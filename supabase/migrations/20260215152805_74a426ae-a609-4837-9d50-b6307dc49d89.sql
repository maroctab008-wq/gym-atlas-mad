
-- Add gym branding settings
INSERT INTO public.app_settings (key, value) 
VALUES ('gym_branding', '{
  "gym_name": "GymManager",
  "phone": "+212 600 000 000",
  "website": "www.gymmanager.ma",
  "address": "Casablanca, Maroc",
  "ice": "",
  "logo_url": ""
}'::jsonb)
ON CONFLICT DO NOTHING;

-- Add gate control settings
INSERT INTO public.app_settings (key, value)
VALUES ('gate_control', '{
  "controller_ip": "",
  "api_key": "",
  "strict_payment_enforcement": true
}'::jsonb)
ON CONFLICT DO NOTHING;

-- Add cheque_number column to payments for cheque tracking
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS cheque_number text;

-- Add invoice_number column to payments
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS invoice_number text;
