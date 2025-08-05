import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { web3Service } from '../utils/web3'
import { setAuthenticated, updateWalletAddress, logout } from '../store/slices/authSlice'

export const useWallet = () => {
  const dispatch = useDispatch()
  const { walletAddress, isAuthenticated } = useSelector(state => state.auth)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState(null)

  const connectWallet = async () => {
    setConnecting(true)
    setError(null)
    
    try {
      await web3Service.initialize()
      const address = await web3Service.connectWallet()
      
      dispatch(updateWalletAddress(address))
      
      return address
    } catch (err) {
      console.error('Wallet connection failed:', err)
      setError(err.message)
      throw err
    } finally {
      setConnecting(false)
    }
  }

  const disconnectWallet = () => {
    dispatch(logout())
    setError(null)
  }

  const switchNetwork = async () => {
    try {
      await web3Service.switchToAmoyNetwork()
    } catch (err) {
      console.error('Network switch failed:', err)
      setError(err.message)
      throw err
    }
  }

  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum && window.ethereum.selectedAddress) {
        try {
          await web3Service.initialize()
          const address = window.ethereum.selectedAddress
          dispatch(updateWalletAddress(address))
        } catch (err) {
          console.error('Auto-connection failed:', err)
        }
      }
    }

    checkConnection()

    if (window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length === 0) {
          disconnectWallet()
        } else {
          dispatch(updateWalletAddress(accounts[0]))
        }
      }

      const handleChainChanged = () => {
        window.location.reload()
      }

      window.ethereum.on('accountsChanged', handleAccountsChanged)
      window.ethereum.on('chainChanged', handleChainChanged)

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
        window.ethereum.removeListener('chainChanged', handleChainChanged)
      }
    }
  }, [dispatch])

  return {
    walletAddress,
    isAuthenticated,
    connecting,
    error,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    clearError: () => setError(null)
  }
}
