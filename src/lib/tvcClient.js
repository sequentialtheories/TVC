export const TVC = {
  async create(params) {
    const token = localStorage.getItem("sb-access-token");
    const response = await fetch(`${window.__TVC_CONFIG.functionsBase}/vault-create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-vault-club-api-key': window.__TVC_CONFIG.vaultClubApiKey
      },
      body: JSON.stringify(params)
    });
    
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Create failed');
    return result;
  },

  async deposit(params) {
    const token = localStorage.getItem("sb-access-token");
    const response = await fetch(`${window.__TVC_CONFIG.functionsBase}/vault-deposit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-vault-club-api-key': window.__TVC_CONFIG.vaultClubApiKey
      },
      body: JSON.stringify(params)
    });
    
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Deposit failed');
    return result;
  },

  async harvest(params) {
    const token = localStorage.getItem("sb-access-token");
    const response = await fetch(`${window.__TVC_CONFIG.functionsBase}/vault-harvest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-vault-club-api-key': window.__TVC_CONFIG.vaultClubApiKey
      },
      body: JSON.stringify(params)
    });
    
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Harvest failed');
    return result;
  },

  async balance(params) {
    const token = localStorage.getItem("sb-access-token");
    const response = await fetch(`${window.__TVC_CONFIG.functionsBase}/vault-balance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-vault-club-api-key': window.__TVC_CONFIG.vaultClubApiKey
      },
      body: JSON.stringify(params)
    });
    
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Balance fetch failed');
    return result;
  },

  async stats() {
    return {
      totalMembers: 0,
      totalDeposits: 0,
      vaultHealth: 100
    };
  }
};
