import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { createClient } from "@/lib/supabase/client";
import type { CartItem, Product } from "@/lib/types";
import { RootState } from './index'; // Import RootState for typed selectors

interface CartState {
  items: (CartItem & { product?: Product })[];
  total: number;
  tax: number;
  itemCount: number;
  loading: boolean;
  error: string | null;
}

const initialState: CartState = {
  items: [],
  total: 0,
  tax: 0,
  itemCount: 0,
  loading: false,
  error: null,
};

// Helper to calculate cart totals
const calculateCartTotals = (items: (CartItem & { product?: Product })[]) => {
  const subtotal = items.reduce((sum, item) => sum + (item.product?.price || 0) * item.quantity, 0);
  const tax = Number.parseFloat((subtotal * 0.15).toFixed(2)); // 15% tax
  const total = Number.parseFloat((subtotal + tax).toFixed(2));
  const itemCount = items.length;
  return { subtotal, tax, total, itemCount };
};

// Async Thunks
export const fetchCart = createAsyncThunk(
  'cart/fetchCart',
  async (_, { rejectWithValue }) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { items: [] }; // Return empty cart if no user
    }

    const { data, error } = await supabase.from("cart_items").select("*, product:products(*)").eq("user_id", user.id);

    if (error) {
      return rejectWithValue(error.message);
    }
    return { items: data || [] };
  }
);

export const addToCart = createAsyncThunk(
  'cart/addToCart',
  async ({ productId, quantity }: { productId: string; quantity: number }, { rejectWithValue, dispatch }) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return rejectWithValue("User not authenticated");
    }

    const { error } = await supabase.from("cart_items").upsert(
      {
        user_id: user.id,
        product_id: productId,
        quantity,
      },
      { onConflict: "user_id,product_id" },
    );

    if (error) {
      return rejectWithValue(error.message);
    }
    await dispatch(fetchCart()); // Re-fetch cart to update state
    return null;
  }
);

export const removeFromCart = createAsyncThunk(
  'cart/removeFromCart',
  async (cartItemId: string, { rejectWithValue, dispatch }) => {
    const supabase = createClient();
    const { error } = await supabase.from("cart_items").delete().eq("id", cartItemId);

    if (error) {
      return rejectWithValue(error.message);
    }
    await dispatch(fetchCart()); // Re-fetch cart to update state
    return null;
  }
);

export const updateQuantity = createAsyncThunk(
  'cart/updateQuantity',
  async ({ cartItemId, quantity }: { cartItemId: string; quantity: number }, { rejectWithValue, dispatch }) => {
    const supabase = createClient();

    if (quantity <= 0) {
      await dispatch(removeFromCart(cartItemId));
      return null;
    }

    const { error } = await supabase.from("cart_items").update({ quantity }).eq("id", cartItemId);

    if (error) {
      return rejectWithValue(error.message);
    }
    await dispatch(fetchCart()); // Re-fetch cart to update state
    return null;
  }
);

export const clearCart = createAsyncThunk(
  'cart/clearCart',
  async (_, { rejectWithValue, dispatch }) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return rejectWithValue("User not authenticated");
    }

    const { error } = await supabase.from("cart_items").delete().eq("user_id", user.id);

    if (error) {
      return rejectWithValue(error.message);
    }
    dispatch(cartSlice.actions.setItems([])); // Immediately clear client-side state
    return null;
  }
);

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    setItems: (state, action: PayloadAction<(CartItem & { product?: Product })[]>) => {
      state.items = action.payload;
      const { tax, total, itemCount } = calculateCartTotals(action.payload);
      state.tax = tax;
      state.total = total;
      state.itemCount = itemCount;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCart.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCart.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.items;
        const { tax, total, itemCount } = calculateCartTotals(action.payload.items);
        state.tax = tax;
        state.total = total;
        state.itemCount = itemCount;
      })
      .addCase(fetchCart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.items = [];
        state.tax = 0;
        state.total = 0;
        state.itemCount = 0;
      })
      .addCase(addToCart.pending, (state) => {
        state.loading = true;
      })
      .addCase(addToCart.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(addToCart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(removeFromCart.pending, (state) => {
        state.loading = true;
      })
      .addCase(removeFromCart.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(removeFromCart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(updateQuantity.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateQuantity.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(updateQuantity.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(clearCart.pending, (state) => {
        state.loading = true;
      })
      .addCase(clearCart.fulfilled, (state) => {
        state.loading = false;
        state.items = []; // Ensure client-side clear after successful API call
        state.tax = 0;
        state.total = 0;
        state.itemCount = 0;
      })
      .addCase(clearCart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setItems, setLoading, setError } = cartSlice.actions;

// Export selectors
export const selectCartItems = (state: RootState) => state.cart.items;
export const selectCartTotal = (state: RootState) => state.cart.total;
export const selectCartTax = (state: RootState) => state.cart.tax;
export const selectCartItemCount = (state: RootState) => state.cart.itemCount;
export const selectCartLoading = (state: RootState) => state.cart.loading;
export const selectCartError = (state: RootState) => state.cart.error;


export default cartSlice.reducer;
