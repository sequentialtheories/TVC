import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  deposits: [],
  shares: '0',
  missedCount: 0,
  wbtcBalance: '0',
  vaultBalance: '0',
  totalDeposited: '0',
  sharePercentage: '0',
  lastDepositWeek: 0,
  isActive: false,
  joinedAt: 0,
  loading: false,
  error: null
}

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUserLoading: (state, action) => {
      state.loading = action.payload
    },
    setUserError: (state, action) => {
      state.error = action.payload
    },
    setUserData: (state, action) => {
      const userData = action.payload
      state.deposits = userData.deposits || []
      state.shares = userData.shares || '0'
      state.missedCount = userData.missedCount || 0
      state.wbtcBalance = userData.wbtcBalance || '0'
      state.vaultBalance = userData.vaultBalance || '0'
      state.totalDeposited = userData.totalDeposited || '0'
      state.sharePercentage = userData.sharePercentage || '0'
      state.lastDepositWeek = userData.lastDepositWeek || 0
      state.isActive = userData.isActive || false
      state.joinedAt = userData.joinedAt || 0
    },
    addDeposit: (state, action) => {
      state.deposits.push(action.payload)
      state.totalDeposited = (parseFloat(state.totalDeposited) + parseFloat(action.payload.amount)).toString()
    },
    updateVaultBalance: (state, action) => {
      state.vaultBalance = action.payload
    },
    updateWBTCBalance: (state, action) => {
      state.wbtcBalance = action.payload
    },
    incrementMissedCount: (state) => {
      state.missedCount += 1
    }
  }
})

export const {
  setUserLoading,
  setUserError,
  setUserData,
  addDeposit,
  updateVaultBalance,
  updateWBTCBalance,
  incrementMissedCount
} = userSlice.actions

export default userSlice.reducer
