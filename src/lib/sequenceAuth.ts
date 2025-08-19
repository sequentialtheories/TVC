
export const authenticateWithSequenceTheory = async (email: string, password: string) => {
  try {
    const response = await fetch(`${(window as any).__TVC_CONFIG.functionsBase}/vault-club-auth-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-vault-club-api-key': (window as any).__TVC_CONFIG.vaultClubApiKey
      },
      body: JSON.stringify({ email, password })
    });
    
    const result = await response.json();
    
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Authentication failed');
    }
    
    return {
      success: true,
      user: result.data.user,
      wallet: result.data.wallet,
      session: result.data.session
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

export const createSequenceTheoryAccount = async (email: string, password: string, name?: string) => {
  try {
    const response = await fetch(`${(window as any).__TVC_CONFIG.functionsBase}/vault-club-user-creation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-vault-club-api-key': (window as any).__TVC_CONFIG.vaultClubApiKey
      },
      body: JSON.stringify({ 
        email, 
        password, 
        name: name || email.split('@')[0],
        metadata: { created_via: 'tvc_frontend' }
      })
    });
    
    const result = await response.json();
    
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Account creation failed');
    }
    
    const authResult = await authenticateWithSequenceTheory(email, password);
    
    if (!authResult.success) {
      throw new Error('Account created but login failed: ' + authResult.error);
    }
    
    return {
      success: true,
      user: authResult.user,
      wallet: authResult.wallet,
      session: authResult.session
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};
