import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

interface AdminState {
  totalVendors: number
  totalCustomers: number
  totalOrders: number
  totalRevenue: number
  totalCommissions: number
  pendingOrders: number
}

const initialState: AdminState = {
  totalVendors: 0,
  totalCustomers: 0,
  totalOrders: 0,
  totalRevenue: 0,
  totalCommissions: 0,
  pendingOrders: 0,
}

const adminSlice = createSlice({
  name: "admin",
  initialState,
  reducers: {
    setAdminStats: (state, action: PayloadAction<Partial<AdminState>>) => {
      return { ...state, ...action.payload }
    },
    clearAdminStats: () => initialState,
  },
})

export const { setAdminStats, clearAdminStats } = adminSlice.actions
export default adminSlice.reducer
