import { apiService } from './api'

class AuthService {
  constructor() {
    this.stAuthEndpoint = process.env.REACT_APP_ST_AUTH_URL || 'https://api.sequencetheory.com/auth'
    this.stGraphQLEndpoint = process.env.REACT_APP_ST_GRAPHQL_URL || 'https://api.sequencetheory.com/graphql'
    this.stWalletRegistry = process.env.REACT_APP_ST_WALLET_REGISTRY || 'https://api.sequencetheory.com/wallet-map'
  }

  async login(credentials) {
    try {
      const stResponse = await fetch(`${this.stAuthEndpoint}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const stData = await stResponse.json();
      
      if (!stData.success) {
        throw new Error(stData.error || 'ST login failed');
      }

      const vaultResponse = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3002/api'}/auth/exchange-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stToken: stData.token }),
      });

      const vaultData = await vaultResponse.json();
      
      if (vaultData.success) {
        localStorage.setItem('authToken', vaultData.data.token);
        localStorage.setItem('user', JSON.stringify(vaultData.data.user));
        return vaultData.data;
      } else {
        throw new Error(vaultData.error || 'Vault login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
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
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('No auth token found');
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3002/api'}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (data.success) {
        localStorage.setItem('authToken', data.data.token);
        localStorage.setItem('user', JSON.stringify(data.data.user));
        return data.data;
      } else {
        this.logout();
        throw new Error(data.error || 'Session refresh failed');
      }
    } catch (error) {
      console.error('Session refresh error:', error);
      this.logout();
      throw error;
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
