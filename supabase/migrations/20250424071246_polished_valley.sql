-- Set phone number for 1650426286@qq.com
UPDATE public.profiles
SET phone = '13310036892'
WHERE id = (SELECT id FROM auth.users WHERE email = '1650426286@qq.com');

-- Set phone number for dongyunweb@gmail.com
UPDATE public.profiles
SET phone = '13162235243'
WHERE id = (SELECT id FROM auth.users WHERE email = 'dongyunweb@gmail.com');

-- Set admin role for 1650426286@qq.com
UPDATE public.profiles
SET user_role = 'admin'
WHERE id = (SELECT id FROM auth.users WHERE email = '1650426286@qq.com');

-- Set admin role for dongyunweb@gmail.com
UPDATE public.profiles
SET user_role = 'admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'dongyunweb@gmail.com');