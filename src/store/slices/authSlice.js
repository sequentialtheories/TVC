import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  isAuthenticated: false,
  user: null,
  token: '',
  userId: '',
  walletAddress: '',
  stUserId: null,
  rigorLevel: 0,
  penalties: 0,
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
      state.user = action.payload.user
      state.token = action.payload.token
      state.userId = action.payload.user?.id || action.payload.userId
      state.walletAddress = action.payload.user?.wallet_address || action.payload.walletAddress
      state.stUserId = action.payload.user?.st_user_id
      state.rigorLevel = action.payload.user?.rigor_level || 0
      state.penalties = action.payload.user?.penalties || 0
      state.stSession = action.payload.stSession
      state.error = null
    },
    login: (state, action) => {
      state.isAuthenticated = true
      state.user = action.payload.user
      state.token = action.payload.token
      state.userId = action.payload.user?.id
      state.walletAddress = action.payload.user?.wallet_address
      state.stUserId = action.payload.user?.st_user_id
      state.rigorLevel = action.payload.user?.rigor_level || 0
      state.penalties = action.payload.user?.penalties || 0
      state.loading = false
      state.error = null
    },
    logout: (state) => {
      state.isAuthenticated = false
      state.user = null
      state.token = ''
      state.userId = ''
      state.walletAddress = ''
      state.stUserId = null
      state.rigorLevel = 0
      state.penalties = 0
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
  login,
  logout,
  updateWalletAddress
} = authSlice.actions

export default authSlice.reducer
