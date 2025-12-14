import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { createClient } from "@/lib/supabase/client";
import type { UserProfile } from "@/lib/types"; // Assuming UserProfile is defined here
import { RootState } from './index'; // For typed selectors

interface AdminUsersState {
  users: UserProfile[];
  loading: boolean;
  error: string | null;
  selectedUser: UserProfile | null;
}

const initialState: AdminUsersState = {
  users: [],
  loading: false,
  error: null,
  selectedUser: null,
};

// Async Thunks
export const fetchAdminUsers = createAsyncThunk(
  'adminUsers/fetchAdminUsers',
  async (_, { rejectWithValue }) => {
    const supabase = createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      return rejectWithValue("Not authenticated");
    }

    // API route already handles role check, but client-side also needs to be aware
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", authUser.id).single();
    if (!profile || (profile.role !== "super_admin" && profile.role !== "admin")) {
      return rejectWithValue("Forbidden: Insufficient permissions");
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, first_name, last_name, phone, role, created_at, updated_at"); // Ensure all fields are selected

    if (error) {
      return rejectWithValue(error.message);
    }
    return data as UserProfile[];
  }
);

export const createAdminUser = createAsyncThunk(
  'adminUsers/createAdminUser',
  async (userData: { email: string; password?: string; first_name: string; last_name: string; phone?: string | null }, { rejectWithValue, dispatch }) => {
    // This thunk will call the API route we created earlier
    try {
      const response = await fetch("/api/admin/users/create-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });

      const result = await response.json();

      if (!response.ok) {
        return rejectWithValue(result.error || "Failed to create admin user");
      }
      await dispatch(fetchAdminUsers()); // Re-fetch users after successful creation
      return result;
    } catch (error: any) {
      return rejectWithValue(error.message || "An unknown error occurred");
    }
  }
);

export const updateAdminUserRole = createAsyncThunk(
    'adminUsers/updateAdminUserRole',
    async ({ userId, newRole }: { userId: string; newRole: string }, { rejectWithValue, dispatch }) => {
        try {
            const supabase = createClient();
            // This will use the existing PUT /api/admin/users route
            const response = await fetch("/api/admin/users", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, newRole }),
            });

            const result = await response.json();

            if (!response.ok) {
                return rejectWithValue(result.error || "Failed to update user role");
            }
            await dispatch(fetchAdminUsers()); // Re-fetch users after successful update
            return result;
        } catch (error: any) {
            return rejectWithValue(error.message || "An unknown error occurred");
        }
    }
);


const adminUsersSlice = createSlice({
  name: 'adminUsers',
  initialState,
  reducers: {
    setSelectedUser: (state, action: PayloadAction<UserProfile | null>) => {
      state.selectedUser = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAdminUsers.fulfilled, (state, action: PayloadAction<UserProfile[]>) => {
        state.loading = false;
        state.users = action.payload;
      })
      .addCase(fetchAdminUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.users = [];
      })
      .addCase(createAdminUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createAdminUser.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(createAdminUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(updateAdminUserRole.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateAdminUserRole.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(updateAdminUserRole.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setSelectedUser } = adminUsersSlice.actions;

// Selectors
export const selectAdminUsers = (state: RootState) => state.adminUsers.users;
export const selectAdminUsersLoading = (state: RootState) => state.adminUsers.loading;
export const selectAdminUsersError = (state: RootState) => state.adminUsers.error;
export const selectSelectedAdminUser = (state: RootState) => state.adminUsers.selectedUser;

export default adminUsersSlice.reducer;
