import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createClient(); // Client for user authentication/session
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch user's role using the regular client (still subject to RLS for this user)
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || (profile?.role !== 'admin' && profile?.role !== 'super_admin')) {
    return NextResponse.json({ error: 'Forbidden - Insufficient role' }, { status: 403 });
  }

  // Use admin client to fetch all users and their profiles (bypasses RLS)
  const adminSupabase = createAdminClient();
  const { data: users, error: usersError } = await adminSupabase
    .from('profiles')
    .select('*');

  if (usersError) {
    console.error('Error fetching users:', usersError);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }

  return NextResponse.json(users);
}

export async function PUT(request: Request) {
  const supabase = await createClient(); // Client for current user authentication/session
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch current user's role to check permissions (using regular client)
  const { data: currentProfile, error: currentProfileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (currentProfileError || currentProfile?.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden - Only super admins can update roles' }, { status: 403 });
  }

  const { userId, newRole, first_name, last_name, phone } = await request.json();

  const updatePayload: {
    role?: string;
    first_name?: string | null;
    last_name?: string | null;
    phone?: string | null;
  } = {};

  if (newRole) {
    // Validate newRole
    if (!['customer', 'vendor', 'admin', 'super_admin'].includes(newRole)) {
      return NextResponse.json({ error: 'Invalid role provided' }, { status: 400 });
    }
    updatePayload.role = newRole;
  }
  if (first_name !== undefined) updatePayload.first_name = first_name;
  if (last_name !== undefined) updatePayload.last_name = last_name;
  if (phone !== undefined) updatePayload.phone = phone;

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json({ message: 'No fields to update' }, { status: 400 });
  }

  // Use admin client for privileged operations (bypasses RLS)
  const adminSupabase = createAdminClient();

  // Special checks only if role is being changed
  if (newRole) {
    // Prevent super_admin from demoting themselves or other super_admins via this endpoint
    const { data: targetProfile, error: targetProfileError } = await adminSupabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (targetProfileError) {
      return NextResponse.json({ error: 'Failed to fetch target user profile' }, { status: 500 });
    }

    if (targetProfile?.role === 'super_admin' && newRole !== 'super_admin') {
      return NextResponse.json({ error: 'Cannot demote another super admin' }, { status: 403 });
    }
    
    // Ensure a super admin cannot demote themselves
    if (userId === user.id && newRole !== 'super_admin') {
      return NextResponse.json({ error: 'Super admin cannot demote themselves' }, { status: 403 });
    }
  }

  const { error } = await adminSupabase
    .from('profiles')
    .update(updatePayload)
    .eq('id', userId);

  if (error) {
    console.error('Error updating user role:', error);
    return NextResponse.json({ error: 'Failed to update user role' }, { status: 500 });
  }

  return NextResponse.json({ message: 'User role updated successfully' });
}