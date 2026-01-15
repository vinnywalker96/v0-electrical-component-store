ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert their own profile." ON profiles;

DROP POLICY IF EXISTS "Users can insert their own profile." ON profiles;

CREATE POLICY "Users can insert their own profile."
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile." ON profiles;

CREATE POLICY "Users can update their own profile."
ON profiles FOR UPDATE
USING (auth.uid() = id);
