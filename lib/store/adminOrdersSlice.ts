import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { createClient } from "@/lib/supabase/client";
import type { Order, OrderItem } from "@/lib/types"; // Assuming Order and OrderItem are defined here
import { RootState } from './index'; // For typed selectors

interface AdminOrdersState {
  orders: Order[];
  loading: boolean;
  error: string | null;
  selectedOrder: (Order & { order_items?: OrderItem[] }) | null;
}

const initialState: AdminOrdersState = {
  orders: [],
  loading: false,
  error: null,
  selectedOrder: null,
};

// Async Thunks
export const fetchAdminOrders = createAsyncThunk(
  'adminOrders/fetchAdminOrders',
  async (_, { rejectWithValue }) => {
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

    // Fetch orders with associated order items
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*, product:products(*))"); // Nested fetch for order items and products

    if (error) {
      return rejectWithValue(error.message);
    }
    return data as (Order & { order_items?: OrderItem[] })[];
  }
);

export const updateOrderStatus = createAsyncThunk(
  'adminOrders/updateOrderStatus',
  async ({ orderId, status, payment_status }: { orderId: string; status?: string; payment_status?: string }, { rejectWithValue, dispatch }) => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return rejectWithValue("User not authenticated");
      }

      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, payment_status }),
      });

      const result = await response.json();

      if (!response.ok) {
        return rejectWithValue(result.error || "Failed to update order status");
      }
      await dispatch(fetchAdminOrders()); // Re-fetch orders after successful update
      return result;
    } catch (error: any) {
      return rejectWithValue(error.message || "An unknown error occurred");
    }
  }
);

// Potentially add thunk for deleting orders if needed
// export const deleteOrder = createAsyncThunk(...)

const adminOrdersSlice = createSlice({
  name: 'adminOrders',
  initialState,
  reducers: {
    setSelectedOrder: (state, action: PayloadAction<(Order & { order_items?: OrderItem[] }) | null>) => {
      state.selectedOrder = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAdminOrders.fulfilled, (state, action: PayloadAction<(Order & { order_items?: OrderItem[] })[]>) => {
        state.loading = false;
        state.orders = action.payload;
      })
      .addCase(fetchAdminOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.orders = [];
      })
      .addCase(updateOrderStatus.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(updateOrderStatus.fulfilled, (state) => { state.loading = false; })
      .addCase(updateOrderStatus.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; });
  },
});

export const { setSelectedOrder } = adminOrdersSlice.actions;

// Selectors
export const selectAdminOrders = (state: RootState) => state.adminOrders.orders;
export const selectAdminOrdersLoading = (state: RootState) => state.adminOrders.loading;
export const selectAdminOrdersError = (state: RootState) => state.adminOrders.error;
export const selectSelectedAdminOrder = (state: RootState) => state.adminOrders.selectedOrder;

export default adminOrdersSlice.reducer;
