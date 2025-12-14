import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { createClient } from "@/lib/supabase/client";
import { RootState } from './index';
import { ProductReportSchema, UpdateProductReportStatusSchema } from '@/lib/schemas';
import { z } from 'zod';

// Define the type for ProductReport based on the Zod schema
export type ProductReport = z.infer<typeof ProductReportSchema>;

interface AdminProductReportsState {
  reports: ProductReport[];
  loading: boolean;
  error: string | null;
}

const initialState: AdminProductReportsState = {
  reports: [],
  loading: false,
  error: null,
};

// Async Thunks
export const fetchAdminProductReports = createAsyncThunk(
  'adminProductReports/fetchAdminProductReports',
  async (_, { rejectWithValue }) => {
    try {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser) {
        return rejectWithValue("Not authenticated");
      }

      // Client-side role check (API routes should also enforce this)
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", authUser.id).single();
      if (!profile || (profile.role !== "super_admin" && profile.role !== "admin")) {
        return rejectWithValue("Forbidden: Insufficient permissions");
      }

      // We'll need an API route for this, or fetch directly from Supabase
      // For now, fetching directly from Supabase as it was in the original component
      const { data, error } = await supabase
        .from("product_reports")
        .select(`
          *,
          products (id, name),
          profiles (id, email)
        `)
        .order("created_at", { ascending: false });

      if (error) {
        return rejectWithValue(error.message);
      }
      return data as ProductReport[];
    } catch (error: any) {
      console.error("[v0] Error fetching product reports:", error);
      return rejectWithValue(error.message || "An unknown error occurred");
    }
  }
);

export const updateProductReportStatus = createAsyncThunk(
  'adminProductReports/updateProductReportStatus',
  async ({ reportId, status }: { reportId: string; status: z.infer<typeof UpdateProductReportStatusSchema>['status'] }, { rejectWithValue, dispatch }) => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return rejectWithValue("User not authenticated");
      }

      // Assuming a PATCH /api/admin/product-reports/[id] route exists
      // For now, updating directly via Supabase as it was in the original component
      const { error } = await supabase
        .from("product_reports")
        .update({ status: status, updated_at: new Date().toISOString() })
        .eq("id", reportId);

      if (error) {
        return rejectWithValue(error.message);
      }
      await dispatch(fetchAdminProductReports()); // Re-fetch reports after successful update
      return null;
    } catch (error: any) {
      console.error("[v0] Error updating report status:", error);
      return rejectWithValue(error.message || "An unknown error occurred");
    }
  }
);


const adminProductReportsSlice = createSlice({
  name: 'adminProductReports',
  initialState,
  reducers: {
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminProductReports.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAdminProductReports.fulfilled, (state, action: PayloadAction<ProductReport[]>) => {
        state.loading = false;
        state.reports = action.payload;
      })
      .addCase(fetchAdminProductReports.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.reports = [];
      })
      .addCase(updateProductReportStatus.pending, (state) => {
        state.loading = true; // Set loading true for status update as well
        state.error = null;
      })
      .addCase(updateProductReportStatus.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(updateProductReportStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setError } = adminProductReportsSlice.actions;

// Selectors
export const selectAdminProductReports = (state: RootState) => state.adminProductReports.reports;
export const selectAdminProductReportsLoading = (state: RootState) => state.adminProductReports.loading;
export const selectAdminProductReportsError = (state: RootState) => state.adminProductReports.error;

export default adminProductReportsSlice.reducer;
