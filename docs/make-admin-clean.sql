-- Add role column to users table (run this first)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- Grant admin role to baustin2786@gmail.com
UPDATE public.users
SET role = 'admin'
WHERE email = 'baustin2786@gmail.com';

-- Verify the change
SELECT id, email, role, updated_at
FROM public.users
WHERE email = 'baustin2786@gmail.com';