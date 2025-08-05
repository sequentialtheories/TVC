import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { blockchainService } from '../services/blockchain'

export const useContract = () => {
  const { walletAddress } = useSelector(state => state.auth)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const executeContractCall = async (contractCall, onSuccess, onError) => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await contractCall()
      if (onSuccess) onSuccess(result)
      return result
    } catch (err) {
      console.error('Contract call failed:', err)
      setError(err.message)
      if (onError) onError(err)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    error,
    executeContractCall,
    clearError: () => setError(null)
  }
}

export const useVaultData = () => {
  const { walletAddress } = useSelector(state => state.auth)
  const [vaultStats, setVaultStats] = useState(null)
  const [userBalance, setUserBalance] = useState('0')
  const [loading, setLoading] = useState(false)

  const refreshVaultData = async () => {
    if (!walletAddress) return

    setLoading(true)
    try {
      const [stats, balance] = await Promise.all([
        blockchainService.getVaultStats(),
        blockchainService.getVaultBalance(walletAddress)
      ])
      
      setVaultStats(stats)
      setUserBalance(balance)
    } catch (error) {
      console.error('Error refreshing vault data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshVaultData()
  }, [walletAddress])

  return {
    vaultStats,
    userBalance,
    loading,
    refreshVaultData
  }
}

export const useSubClubData = (subClubAddress) => {
  const { walletAddress } = useSelector(state => state.auth)
  const [subClubInfo, setSubClubInfo] = useState(null)
  const [memberInfo, setMemberInfo] = useState(null)
  const [loading, setLoading] = useState(false)

  const refreshSubClubData = async () => {
    if (!subClubAddress || !walletAddress) return

    setLoading(true)
    try {
      const [clubInfo, memberData] = await Promise.all([
        blockchainService.getSubClubInfo(subClubAddress),
        blockchainService.getMemberInfo(subClubAddress, walletAddress)
      ])
      
      setSubClubInfo(clubInfo)
      setMemberInfo(memberData)
    } catch (error) {
      console.error('Error refreshing SubClub data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshSubClubData()
  }, [subClubAddress, walletAddress])

  return {
    subClubInfo,
    memberInfo,
    loading,
    refreshSubClubData
  }
}
