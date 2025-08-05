import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  isAuthenticated: false,
  token: '',
  userId: '',
  walletAddress: '',
  stSession: null,
  loading: false,
  error: null
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuthLoading: (state, action) => {
      state.loading = action.payload
    },
    setAuthError: (state, action) => {
      state.error = action.payload
    },
    setAuthenticated: (state, action) => {
      state.isAuthenticated = true
      state.token = action.payload.token
      state.userId = action.payload.userId
      state.walletAddress = action.payload.walletAddress
      state.stSession = action.payload.stSession
      state.error = null
    },
    logout: (state) => {
      state.isAuthenticated = false
      state.token = ''
      state.userId = ''
      state.walletAddress = ''
      state.stSession = null
      state.error = null
    },
    updateWalletAddress: (state, action) => {
      state.walletAddress = action.payload
    }
  }
})

export const {
  setAuthLoading,
  setAuthError,
  setAuthenticated,
  logout,
  updateWalletAddress
} = authSlice.actions

export default authSlice.reducer
