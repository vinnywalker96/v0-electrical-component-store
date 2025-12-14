import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { createClient } from "@/lib/supabase/client";
import type { Product } from "@/lib/types"; // Assuming Product is defined here
import { RootState } from './index'; // For typed selectors

interface AdminProductsState {
  products: Product[];
  loading: boolean;
  error: string | null;
  selectedProduct: Product | null;
}

const initialState: AdminProductsState = {
  products: [],
  loading: false,
  error: null,
  selectedProduct: null,
};

// Async Thunks
// Note: These thunks assume the existence of API routes like /api/admin/products
// for comprehensive CRUD operations. We'll need to create these API routes later
// if they don't already exist or are not suitable.

export const fetchAdminProducts = createAsyncThunk(
  'adminProducts/fetchAdminProducts',
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

    const { data, error } = await supabase
      .from("products")
      .select("*, profiles(first_name, last_name)"); // Fetch seller info

    if (error) {
      return rejectWithValue(error.message);
    }
    return data as Product[];
  }
);

export const createProduct = createAsyncThunk(
  'adminProducts/createProduct',
  async (productData: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'seller_id' | 'profiles'>, { rejectWithValue, dispatch }) => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return rejectWithValue("User not authenticated");
      }

      // API call to create product (assuming /api/admin/products POST endpoint)
      const response = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productData),
      });

      const result = await response.json();

      if (!response.ok) {
        return rejectWithValue(result.error || "Failed to create product");
      }
      await dispatch(fetchAdminProducts());
      return result;
    } catch (error: any) {
      return rejectWithValue(error.message || "An unknown error occurred");
    }
  }
);

export const updateProduct = createAsyncThunk(
  'adminProducts/updateProduct',
  async (productData: Partial<Product> & { id: string }, { rejectWithValue, dispatch }) => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return rejectWithValue("User not authenticated");
      }

      // API call to update product (assuming /api/admin/products/[id] PUT/PATCH endpoint)
      const response = await fetch(`/api/admin/products/${productData.id}`, {
        method: "PUT", // or PATCH
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productData),
      });

      const result = await response.json();

      if (!response.ok) {
        return rejectWithValue(result.error || "Failed to update product");
      }
      await dispatch(fetchAdminProducts());
      return result;
    } catch (error: any) {
      return rejectWithValue(error.message || "An unknown error occurred");
    }
  }
);

export const deleteProduct = createAsyncThunk(
  'adminProducts/deleteProduct',
  async (productId: string, { rejectWithValue, dispatch }) => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return rejectWithValue("User not authenticated");
      }

      // API call to delete product (assuming /api/admin/products/[id] DELETE endpoint)
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.error || "Failed to delete product");
      }
      await dispatch(fetchAdminProducts());
      return productId; // Return deleted ID for potential UI updates
    } catch (error: any) {
      return rejectWithValue(error.message || "An unknown error occurred");
    }
  }
);


const adminProductsSlice = createSlice({
  name: 'adminProducts',
  initialState,
  reducers: {
    setSelectedProduct: (state, action: PayloadAction<Product | null>) => {
      state.selectedProduct = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAdminProducts.fulfilled, (state, action: PayloadAction<Product[]>) => {
        state.loading = false;
        state.products = action.payload;
      })
      .addCase(fetchAdminProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.products = [];
      })
      .addCase(createProduct.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(createProduct.fulfilled, (state) => { state.loading = false; })
      .addCase(createProduct.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(updateProduct.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(updateProduct.fulfilled, (state) => { state.loading = false; })
      .addCase(updateProduct.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(deleteProduct.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(deleteProduct.fulfilled, (state) => { state.loading = false; })
      .addCase(deleteProduct.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; });
  },
});

export const { setSelectedProduct } = adminProductsSlice.actions;

// Selectors
export const selectAdminProducts = (state: RootState) => state.adminProducts.products;
export const selectAdminProductsLoading = (state: RootState) => state.adminProducts.loading;
export const selectAdminProductsError = (state: RootState) => state.adminProducts.error;
export const selectSelectedAdminProduct = (state: RootState) => state.adminProducts.selectedProduct;

export default adminProductsSlice.reducer;
