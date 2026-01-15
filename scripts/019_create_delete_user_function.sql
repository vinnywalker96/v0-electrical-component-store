CREATE OR REPLACE FUNCTION delete_user(user_id uuid)
RETURNS void AS $$
BEGIN
  -- Check if the user is an admin
  IF (SELECT role FROM public.profiles WHERE id = auth.uid()) NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Only admins can delete users';
  END IF;

  -- Delete the user from auth.users
  DELETE FROM auth.users WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to the authenticated role
GRANT EXECUTE ON FUNCTION delete_user(uuid) TO authenticated;
