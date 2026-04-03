import { configureStore } from "@reduxjs/toolkit"
import authReducer from "./slices/authSlice"
import adminReducer from "./slices/adminSlice"

export const makeStore = () => {
  return configureStore({
    reducer: {
      auth: authReducer,
      admin: adminReducer,
    },
  })
}

export type AppStore = ReturnType<typeof makeStore>
export type RootState = ReturnType<AppStore["getState"]>
export type AppDispatch = AppStore["dispatch"]
