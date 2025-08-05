import { apiService } from './api'

class AuthService {
  constructor() {
    this.stAuthEndpoint = process.env.REACT_APP_ST_AUTH_URL || 'https://api.sequencetheory.com/auth'
    this.stGraphQLEndpoint = process.env.REACT_APP_ST_GRAPHQL_URL || 'https://api.sequencetheory.com/graphql'
    this.stWalletRegistry = process.env.REACT_APP_ST_WALLET_REGISTRY || 'https://api.sequencetheory.com/wallet-map'
  }

  async authenticateWithST(credentials) {
    try {
      const stToken = await this.loginToST(credentials)
      const vaultSession = await this.exchangeTokenWithVault(stToken)
      const wallet = await this.getWalletFromST(vaultSession)
      
      return {
        session: vaultSession,
        wallet: wallet,
        stToken: stToken
      }
    } catch (error) {
      console.error('ST Authentication failed:', error)
      throw new Error('Authentication with Sequence Theory failed')
    }
  }

  async loginToST(credentials) {
    const response = await fetch(`${this.stAuthEndpoint}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(credentials)
    })

    if (!response.ok) {
      throw new Error('ST login failed')
    }

    const data = await response.json()
    return data.token
  }

  async exchangeTokenWithVault(stToken) {
    try {
      const response = await apiService.login({ stToken })
      return response.vaultToken
    } catch (error) {
      console.error('Token exchange failed:', error)
      throw new Error('Failed to exchange ST token for vault session')
    }
  }

  async getWalletFromST(vaultSession) {
    try {
      const response = await apiService.getWallet(vaultSession)
      return response.walletAddress
    } catch (error) {
      console.error('Wallet retrieval failed:', error)
      throw new Error('Failed to retrieve wallet from ST')
    }
  }

  async refreshSession() {
    try {
      const response = await apiService.refreshToken()
      return response.token
    } catch (error) {
      console.error('Session refresh failed:', error)
      throw new Error('Failed to refresh session')
    }
  }

  async syncUserData(userId) {
    try {
      const query = `
        query GetUserData($userId: ID!) {
          user(id: $userId) {
            id
            wallet
            subclubs {
              address
              rigor
              penalties
            }
          }
        }
      `

      const response = await fetch(this.stGraphQLEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          query,
          variables: { userId }
        })
      })

      if (!response.ok) {
        throw new Error('GraphQL query failed')
      }

      const data = await response.json()
      return data.data.user
    } catch (error) {
      console.error('User data sync failed:', error)
      throw new Error('Failed to sync user data from ST')
    }
  }

  logout() {
    localStorage.removeItem('authToken')
    localStorage.removeItem('stToken')
    localStorage.removeItem('userId')
    localStorage.removeItem('walletAddress')
  }

  isAuthenticated() {
    return !!localStorage.getItem('authToken')
  }

  getStoredAuth() {
    return {
      token: localStorage.getItem('authToken'),
      stToken: localStorage.getItem('stToken'),
      userId: localStorage.getItem('userId'),
      walletAddress: localStorage.getItem('walletAddress')
    }
  }

  storeAuth(authData) {
    localStorage.setItem('authToken', authData.token)
    localStorage.setItem('stToken', authData.stToken)
    localStorage.setItem('userId', authData.userId)
    localStorage.setItem('walletAddress', authData.walletAddress)
  }
}

export const authService = new AuthService()
