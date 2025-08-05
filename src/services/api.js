import axios from 'axios'

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api'

class ApiService {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    })

    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('authToken')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    this.client.interceptors.response.use(
      (response) => response.data,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('authToken')
          window.location.href = '/login'
        }
        return Promise.reject(error)
      }
    )
  }

  async login(credentials) {
    return this.client.post('/auth/login', credentials)
  }

  async refreshToken() {
    return this.client.post('/auth/refresh')
  }

  async getWallet(sessionToken) {
    return this.client.get('/wallets/current', {
      headers: { Authorization: `Bearer ${sessionToken}` }
    })
  }

  async initSubClub(subClubData) {
    return this.client.post('/vault/init-subclub', subClubData)
  }

  async deposit(depositData) {
    return this.client.post('/vault/deposit', depositData)
  }

  async getProgress(subClubAddress) {
    return this.client.get(`/vault/progress?subClubAddress=${subClubAddress}`)
  }

  async getWBTCBalance(userAddress) {
    return this.client.get(`/vault/wbtc-balance?userAddress=${userAddress}`)
  }

  async getTransactionHistory(userAddress, subClubAddress = null) {
    const params = new URLSearchParams({ userAddress });
    if (subClubAddress) {
      params.append('subClubAddress', subClubAddress);
    }
    return this.client.get(`/vault/history?${params.toString()}`)
  }

  async requestEmergencyWithdraw(withdrawData) {
    return this.client.post('/emergency/withdraw', withdrawData)
  }

  async getEmergencyStatus(subClubAddress = null) {
    const params = subClubAddress ? `?subClubAddress=${subClubAddress}` : '';
    return this.client.get(`/emergency/status${params}`)
  }

  async healthCheck() {
    return this.client.get('/health')
  }
}

export const apiService = new ApiService()
