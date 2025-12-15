import { configureStore } from "@reduxjs/toolkit"
import authReducer from "./slices/authSlice"
import vendorReducer from "./slices/vendorSlice"
import adminReducer from "./slices/adminSlice"

export const makeStore = () => {
  return configureStore({
    reducer: {
      auth: authReducer,
      vendor: vendorReducer,
      admin: adminReducer,
    },
  })
}

export type AppStore = ReturnType<typeof makeStore>
export type RootState = ReturnType<AppStore["getState"]>
export type AppDispatch = AppStore["dispatch"]
