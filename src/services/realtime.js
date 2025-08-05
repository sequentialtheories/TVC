import { io } from 'socket.io-client'
import { blockchainService } from './blockchain'

class RealtimeService {
  constructor() {
    this.socket = null
    this.eventListeners = new Map()
    this.isConnected = false
  }

  connect() {
    const socketUrl = process.env.REACT_APP_SOCKET_URL || 'ws://localhost:3001'
    
    this.socket = io(socketUrl, {
      transports: ['websocket'],
      autoConnect: true
    })

    this.socket.on('connect', () => {
      console.log('WebSocket connected')
      this.isConnected = true
    })

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected')
      this.isConnected = false
    })

    this.socket.on('vault_update', (data) => {
      this.handleVaultUpdate(data)
    })

    this.socket.on('subclub_update', (data) => {
      this.handleSubClubUpdate(data)
    })

    this.socket.on('transaction_confirmed', (data) => {
      this.handleTransactionConfirmed(data)
    })

    this.setupBlockchainEventListeners()
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.isConnected = false
    }
    
    blockchainService.removeAllEventListeners()
    this.eventListeners.clear()
  }

  setupBlockchainEventListeners() {
    const depositListener = blockchainService.setupEventListener(
      'megaVault',
      'Deposit',
      (user, amount, timestamp) => {
        this.emit('deposit_event', { user, amount, timestamp })
      }
    )

    const harvestListener = blockchainService.setupEventListener(
      'megaVault',
      'HarvestExecuted',
      (totalHarvested, timestamp) => {
        this.emit('harvest_event', { totalHarvested, timestamp })
      }
    )

    const subclubCreatedListener = blockchainService.setupEventListener(
      'factory',
      'SubClubCreated',
      (subClubAddress, creator, members) => {
        this.emit('subclub_created', { subClubAddress, creator, members })
      }
    )

    this.eventListeners.set('deposit', depositListener)
    this.eventListeners.set('harvest', harvestListener)
    this.eventListeners.set('subclub_created', subclubCreatedListener)
  }

  emit(event, data) {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data)
    }
  }

  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback)
    }
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback)
    }
  }

  handleVaultUpdate(data) {
    console.log('Vault update received:', data)
  }

  handleSubClubUpdate(data) {
    console.log('SubClub update received:', data)
  }

  handleTransactionConfirmed(data) {
    console.log('Transaction confirmed:', data)
  }

  subscribeToUserUpdates(userAddress) {
    if (this.socket && this.isConnected) {
      this.socket.emit('subscribe_user', { address: userAddress })
    }
  }

  unsubscribeFromUserUpdates(userAddress) {
    if (this.socket && this.isConnected) {
      this.socket.emit('unsubscribe_user', { address: userAddress })
    }
  }
}

export const realtimeService = new RealtimeService()
