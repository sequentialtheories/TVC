import Dexie from 'dexie'

class CacheService extends Dexie {
  constructor() {
    super('VaultClubCache')
    
    this.version(1).stores({
      userPreferences: 'key, value, timestamp',
      transactionHistory: 'hash, *address, type, amount, timestamp, blockNumber',
      subclubData: 'address, data, timestamp',
      vaultStats: 'key, data, timestamp'
    })
  }

  async setUserPreference(key, value) {
    await this.userPreferences.put({
      key,
      value,
      timestamp: Date.now()
    })
  }

  async getUserPreference(key, defaultValue = null) {
    const pref = await this.userPreferences.get(key)
    return pref ? pref.value : defaultValue
  }

  async cacheTransaction(transaction) {
    await this.transactionHistory.put({
      hash: transaction.hash,
      address: transaction.from,
      type: transaction.type,
      amount: transaction.amount,
      timestamp: transaction.timestamp,
      blockNumber: transaction.blockNumber
    })
  }

  async getTransactionHistory(address, limit = 50) {
    return await this.transactionHistory
      .where('address')
      .equals(address)
      .orderBy('timestamp')
      .reverse()
      .limit(limit)
      .toArray()
  }

  async cacheSubClubData(address, data) {
    await this.subclubData.put({
      address,
      data,
      timestamp: Date.now()
    })
  }

  async getSubClubData(address, maxAge = 5 * 60 * 1000) {
    const cached = await this.subclubData.get(address)
    
    if (cached && (Date.now() - cached.timestamp) < maxAge) {
      return cached.data
    }
    
    return null
  }

  async cacheVaultStats(stats) {
    await this.vaultStats.put({
      key: 'current',
      data: stats,
      timestamp: Date.now()
    })
  }

  async getVaultStats(maxAge = 2 * 60 * 1000) {
    const cached = await this.vaultStats.get('current')
    
    if (cached && (Date.now() - cached.timestamp) < maxAge) {
      return cached.data
    }
    
    return null
  }

  async clearExpiredCache() {
    const oneHourAgo = Date.now() - (60 * 60 * 1000)
    
    await this.transactionHistory
      .where('timestamp')
      .below(oneHourAgo)
      .delete()
    
    await this.subclubData
      .where('timestamp')
      .below(oneHourAgo)
      .delete()
    
    await this.vaultStats
      .where('timestamp')
      .below(oneHourAgo)
      .delete()
  }

  async clearAllCache() {
    await this.userPreferences.clear()
    await this.transactionHistory.clear()
    await this.subclubData.clear()
    await this.vaultStats.clear()
  }
}

export const cacheService = new CacheService()

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration)
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError)
      })
  })
}
