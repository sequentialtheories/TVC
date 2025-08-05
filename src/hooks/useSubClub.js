import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { blockchainService } from '../services/blockchain'
import { addSubClub, setCurrentSubClub } from '../store/slices/subclubSlice'
import { addNotification } from '../store/slices/uiSlice'

export const useSubClub = () => {
  const dispatch = useDispatch()
  const { walletAddress } = useSelector(state => state.auth)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const createSubClub = async (members, lockPeriod, rigor, isCharged) => {
    setLoading(true)
    setError(null)
    
    try {
      const subClubAddress = await blockchainService.createSubClub(
        members,
        lockPeriod,
        rigor,
        isCharged
      )
      
      const subClubInfo = await blockchainService.getSubClubInfo(subClubAddress)
      const newSubClub = { address: subClubAddress, ...subClubInfo }
      
      dispatch(addSubClub(newSubClub))
      dispatch(addNotification({
        type: 'success',
        message: 'SubClub created successfully!',
        duration: 5000
      }))
      
      return newSubClub
    } catch (err) {
      console.error('SubClub creation failed:', err)
      setError(err.message)
      dispatch(addNotification({
        type: 'error',
        message: `Failed to create SubClub: ${err.message}`,
        duration: 5000
      }))
      throw err
    } finally {
      setLoading(false)
    }
  }

  const joinSubClub = async (subClubAddress) => {
    setLoading(true)
    setError(null)
    
    try {
      const subClubInfo = await blockchainService.getSubClubInfo(subClubAddress)
      
      if (!subClubInfo.members.includes(walletAddress)) {
        throw new Error('You are not a member of this SubClub')
      }
      
      const subClub = { address: subClubAddress, ...subClubInfo }
      dispatch(addSubClub(subClub))
      dispatch(setCurrentSubClub(subClub))
      
      dispatch(addNotification({
        type: 'success',
        message: 'Successfully joined SubClub!',
        duration: 5000
      }))
      
      return subClub
    } catch (err) {
      console.error('SubClub join failed:', err)
      setError(err.message)
      dispatch(addNotification({
        type: 'error',
        message: `Failed to join SubClub: ${err.message}`,
        duration: 5000
      }))
      throw err
    } finally {
      setLoading(false)
    }
  }

  const makeDeposit = async (subClubAddress) => {
    setLoading(true)
    setError(null)
    
    try {
      const receipt = await blockchainService.makeDeposit(subClubAddress)
      
      dispatch(addNotification({
        type: 'success',
        message: 'Deposit successful!',
        duration: 5000
      }))
      
      return receipt
    } catch (err) {
      console.error('Deposit failed:', err)
      setError(err.message)
      dispatch(addNotification({
        type: 'error',
        message: `Deposit failed: ${err.message}`,
        duration: 5000
      }))
      throw err
    } finally {
      setLoading(false)
    }
  }

  const requestEmergencyWithdraw = async (subClubAddress) => {
    setLoading(true)
    setError(null)
    
    try {
      const receipt = await blockchainService.requestEmergencyWithdraw(subClubAddress)
      
      dispatch(addNotification({
        type: 'warning',
        message: 'Emergency withdrawal requested. Awaiting multisig approval.',
        duration: 8000
      }))
      
      return receipt
    } catch (err) {
      console.error('Emergency withdrawal failed:', err)
      setError(err.message)
      dispatch(addNotification({
        type: 'error',
        message: `Emergency withdrawal failed: ${err.message}`,
        duration: 5000
      }))
      throw err
    } finally {
      setLoading(false)
    }
  }

  const getUserSubClubs = async () => {
    if (!walletAddress) return []
    
    setLoading(true)
    try {
      const subClubs = await blockchainService.getUserSubClubs(walletAddress)
      return subClubs
    } catch (err) {
      console.error('Failed to fetch user SubClubs:', err)
      setError(err.message)
      return []
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    error,
    createSubClub,
    joinSubClub,
    makeDeposit,
    requestEmergencyWithdraw,
    getUserSubClubs,
    clearError: () => setError(null)
  }
}
