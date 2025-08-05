import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  address: '',
  members: [],
  rigor: '',
  lockPeriod: 0,
  phase: 1,
  totalValue: '0',
  isCharged: false,
  startTime: 0,
  currentPhase: 1,
  isCompleted: false,
  weeklyAmount: '0',
  userSubClubs: [],
  loading: false,
  error: null
}

const subclubSlice = createSlice({
  name: 'subclub',
  initialState,
  reducers: {
    setSubClubLoading: (state, action) => {
      state.loading = action.payload
    },
    setSubClubError: (state, action) => {
      state.error = action.payload
    },
    setCurrentSubClub: (state, action) => {
      const subclub = action.payload
      state.address = subclub.address
      state.members = subclub.members
      state.rigor = subclub.rigor
      state.lockPeriod = subclub.lockPeriod
      state.phase = subclub.phase
      state.totalValue = subclub.totalValue
      state.isCharged = subclub.isCharged
      state.startTime = subclub.startTime
      state.currentPhase = subclub.currentPhase
      state.isCompleted = subclub.isCompleted
      state.weeklyAmount = subclub.weeklyAmount
    },
    setUserSubClubs: (state, action) => {
      state.userSubClubs = action.payload
    },
    addSubClub: (state, action) => {
      state.userSubClubs.push(action.payload)
    },
    updateSubClubValue: (state, action) => {
      state.totalValue = action.payload
    },
    clearSubClub: (state) => {
      Object.assign(state, initialState)
    }
  }
})

export const {
  setSubClubLoading,
  setSubClubError,
  setCurrentSubClub,
  setUserSubClubs,
  addSubClub,
  updateSubClubValue,
  clearSubClub
} = subclubSlice.actions

export default subclubSlice.reducer
