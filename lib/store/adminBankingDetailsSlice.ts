import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { createClient } from "@/lib/supabase/client";
import { RootState } from './index';
import { BankingDetailsSchema } from '@/lib/schemas'; // Import the Zod schema
import { z } from 'zod';

// Define the type for banking details based on the Zod schema
export type BankingDetails = z.infer<typeof BankingDetailsSchema>;

interface AdminBankingDetailsState {
  details: BankingDetails | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
}

const initialState: AdminBankingDetailsState = {
  details: null,
  loading: false,
  saving: false,
  error: null,
};

// Async Thunks
export const fetchBankingDetails = createAsyncThunk(
  'adminBankingDetails/fetchBankingDetails',
  async (_, { rejectWithValue }) => {
    try {
      // API route already handles auth and role checks
      const response = await fetch("/api/admin/banking-details");

      if (!response.ok) {
        // If the API returns a 403, it means the user doesn't have permissions
        // The component can then redirect based on this error if needed.
        const errorData = await response.json();
        return rejectWithValue(errorData.error || "Failed to fetch banking details");
      }

      const { banking_details } = await response.json();

      // The API returns an array, we expect at most one set of details
      return (banking_details && banking_details.length > 0) ? banking_details[0] : null;

    } catch (error: any) {
      console.error("[v0] Error fetching banking details:", error);
      return rejectWithValue(error.message || "An unknown error occurred");
    }
  }
);

export const saveBankingDetails = createAsyncThunk(
  'adminBankingDetails/saveBankingDetails',
  async (details: BankingDetails, { rejectWithValue, dispatch }) => {
    try {
      // API route already handles auth and role checks
      const response = await fetch("/api/admin/banking-details", {
        method: "POST", // API handles upsert logic based on existence
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(details),
      });

      const result = await response.json();

      if (!response.ok) {
        return rejectWithValue(result.error || "Failed to save banking details");
      }
      dispatch(fetchBankingDetails()); // Re-fetch to ensure state is fresh
      return result.banking_details; // Return the updated/inserted details
    } catch (error: any) {
      console.error("[v0] Error saving banking details:", error);
      return rejectWithValue(error.message || "An unknown error occurred");
    }
  }
);


const adminBankingDetailsSlice = createSlice({
  name: 'adminBankingDetails',
  initialState,
  reducers: {
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    // Reducer to manually set details, useful if fetched from another source or initialized
    setBankingDetails: (state, action: PayloadAction<BankingDetails | null>) => {
      state.details = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBankingDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBankingDetails.fulfilled, (state, action: PayloadAction<BankingDetails | null>) => {
        state.loading = false;
        state.details = action.payload;
      })
      .addCase(fetchBankingDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.details = null;
      })
      .addCase(saveBankingDetails.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(saveBankingDetails.fulfilled, (state, action: PayloadAction<BankingDetails>) => {
        state.saving = false;
        // Details will be updated by fetchBankingDetails after successful save
      })
      .addCase(saveBankingDetails.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload as string;
      });
  },
});

export const { setError, setBankingDetails } = adminBankingDetailsSlice.actions;

// Selectors
export const selectAdminBankingDetails = (state: RootState) => state.adminBankingDetails.details;
export const selectAdminBankingDetailsLoading = (state: RootState) => state.adminBankingDetails.loading;
export const selectAdminBankingDetailsSaving = (state: RootState) => state.adminBankingDetails.saving;
export const selectAdminBankingDetailsError = (state: RootState) => state.adminBankingDetails.error;

export default adminBankingDetailsSlice.reducer;
