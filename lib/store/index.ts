import { configureStore } from '@reduxjs/toolkit';
import cartReducer from './cartSlice'; // Import cart reducer
import languageReducer from './languageSlice'; // Import language reducer
import adminUsersReducer from './adminUsersSlice'; // Import adminUsers reducer
import adminProductsReducer from './adminProductsSlice'; // Import adminProducts reducer
import adminOrdersReducer from './adminOrdersSlice'; // Import adminOrders reducer
import adminBankingDetailsReducer from './adminBankingDetailsSlice'; // Import adminBankingDetails reducer
import adminProductReportsReducer from './adminProductReportsSlice'; // Import adminProductReports reducer

export const store = configureStore({
  reducer: {
    cart: cartReducer,
    language: languageReducer,
    adminUsers: adminUsersReducer,
    adminProducts: adminProductsReducer,
    adminOrders: adminOrdersReducer,
    adminBankingDetails: adminBankingDetailsReducer,
    adminProductReports: adminProductReportsReducer,
    // Add other reducers here
  },
  devTools: process.env.NODE_ENV !== 'production', // Enable DevTools in development
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
