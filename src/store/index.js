import { configureStore } from '@reduxjs/toolkit'
import authSlice from './slices/authSlice'
import subclubSlice from './slices/subclubSlice'
import userSlice from './slices/userSlice'
import uiSlice from './slices/uiSlice'

export const store = configureStore({
  reducer: {
    auth: authSlice,
    subclub: subclubSlice,
    user: userSlice,
    ui: uiSlice
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST']
      }
    })
})
