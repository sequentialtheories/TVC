import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setCurrentPage, setActiveModal, setActiveStrand } from '../store/slices/uiSlice'
import { useWallet } from '../hooks/useWallet'

import Navigation from './layout/Navigation'
import HomePage from './pages/HomePage'
import DatasetPage from './pages/DatasetPage'
import PersonalPage from './pages/PersonalPage'
import GroupInfoPage from './pages/GroupInfoPage'
import ForumPage from './pages/ForumPage'
import FutureSimulationPage from './pages/FutureSimulationPage'
import StrandModal from './modals/StrandModal'
import CreateClubModal from './modals/CreateClubModal'
import EmergencyModal from './modals/EmergencyModal'
import NotificationSystem from './ui/NotificationSystem'

const VaultClubWebsite = () => {
  const dispatch = useDispatch()
  const { currentPage, activeModal, activeStrand } = useSelector(state => state.ui)
  const { connectWallet } = useWallet()

  useEffect(() => {
    connectWallet().catch(console.error)
  }, [])

  const closeModal = () => {
    dispatch(setActiveModal(null))
    dispatch(setActiveStrand(null))
  }

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage />
      case 'dataset':
        return <DatasetPage />
      case 'personal':
        return <PersonalPage />
      case 'group':
        return <GroupInfoPage />
      case 'forum':
        return <ForumPage />
      case 'simulation':
        return <FutureSimulationPage />
      default:
        return <HomePage />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navigation />
      
      <main className="relative">
        {renderCurrentPage()}
      </main>

      {activeStrand && (
        <StrandModal strand={activeStrand} onClose={closeModal} />
      )}

      {activeModal === 'createClub' && (
        <CreateClubModal onClose={closeModal} />
      )}
      
      {activeModal === 'emergency' && (
        <EmergencyModal onClose={closeModal} />
      )}

      <NotificationSystem />
    </div>
  )
}

export default VaultClubWebsite
