import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  loading: false,
  error: null,
  notifications: [],
  activeModal: null,
  activeStrand: null,
  currentPage: 'home',
  theme: 'light'
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.loading = action.payload
    },
    setError: (state, action) => {
      state.error = action.payload
    },
    addNotification: (state, action) => {
      state.notifications.push({
        id: Date.now(),
        ...action.payload
      })
    },
    removeNotification: (state, action) => {
      state.notifications = state.notifications.filter(
        notification => notification.id !== action.payload
      )
    },
    setActiveModal: (state, action) => {
      state.activeModal = action.payload
    },
    setActiveStrand: (state, action) => {
      state.activeStrand = action.payload
    },
    setCurrentPage: (state, action) => {
      state.currentPage = action.payload
    },
    setTheme: (state, action) => {
      state.theme = action.payload
    },
    clearError: (state) => {
      state.error = null
    }
  }
})

export const {
  setLoading,
  setError,
  addNotification,
  removeNotification,
  setActiveModal,
  setActiveStrand,
  setCurrentPage,
  setTheme,
  clearError
} = uiSlice.actions

export default uiSlice.reducer
