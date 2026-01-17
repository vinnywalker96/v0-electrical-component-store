import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch user's role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || (profile?.role !== 'admin' && profile?.role !== 'super_admin')) {
    return NextResponse.json({ error: 'Forbidden - Insufficient role' }, { status: 403 });
  }

  // Fetch all users and their profiles
  const { data: users, error: usersError } = await supabase
    .from('profiles')
    .select('*'); // Select all columns from profiles, which now includes email and created_at

  if (usersError) {
    console.error('Error fetching users:', usersError);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }

  return NextResponse.json(users);
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch current user's role to check permissions
  const { data: currentProfile, error: currentProfileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (currentProfileError || currentProfile?.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden - Only super admins can update roles' }, { status: 403 });
  }

  const { userId, newRole } = await request.json();

  // Validate newRole
  if (!['customer', 'vendor', 'admin', 'super_admin'].includes(newRole)) {
    return NextResponse.json({ error: 'Invalid role provided' }, { status: 400 });
  }

  // Prevent super_admin from demoting themselves or other super_admins via this endpoint
  const { data: targetProfile, error: targetProfileError } = await supabase
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

  const { error } = await supabase
    .from('profiles')
    .update({ role: newRole })
    .eq('id', userId);

  if (error) {
    console.error('Error updating user role:', error);
    return NextResponse.json({ error: 'Failed to update user role' }, { status: 500 });
  }

  return NextResponse.json({ message: 'User role updated successfully' });
}