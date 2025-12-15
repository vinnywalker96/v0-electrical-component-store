import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

interface VendorState {
  sellerId: string | null
  storeName: string | null
  commissionRate: number
  totalCommissionEarned: number
  pendingCommission: number
  totalSales: number
  isVerified: boolean
}

const initialState: VendorState = {
  sellerId: null,
  storeName: null,
  commissionRate: 15,
  totalCommissionEarned: 0,
  pendingCommission: 0,
  totalSales: 0,
  isVerified: false,
}

const vendorSlice = createSlice({
  name: "vendor",
  initialState,
  reducers: {
    setVendorData: (state, action: PayloadAction<Partial<VendorState>>) => {
      return { ...state, ...action.payload }
    },
    clearVendorData: () => initialState,
  },
})

export const { setVendorData, clearVendorData } = vendorSlice.actions
export default vendorSlice.reducer
