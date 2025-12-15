import { createSlice, type PayloadAction } from "@reduxjs/toolkit"
import type { UserProfile } from "@/lib/types"

interface AuthState {
  user: UserProfile | null
  loading: boolean
  isAuthenticated: boolean
}

const initialState: AuthState = {
  user: null,
  loading: true,
  isAuthenticated: false,
}

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<UserProfile | null>) => {
      state.user = action.payload
      state.isAuthenticated = !!action.payload
      state.loading = false
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload
    },
    clearUser: (state) => {
      state.user = null
      state.isAuthenticated = false
      state.loading = false
    },
  },
})

export const { setUser, setLoading, clearUser } = authSlice.actions
export default authSlice.reducer
