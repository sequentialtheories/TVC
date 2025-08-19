
const sequenceWaas = {
  _otpCallback: null,
  onEmailAuthCodeRequired: function(callback) {
    this._otpCallback = callback;
  },
  signIn: async (credentials, sessionName) => {
    const mockWallet = `0x${Math.random().toString(16).substr(2, 40)}`;
    const mockSessionId = `session_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      wallet: mockWallet,
      sessionId: mockSessionId,
      email: credentials.email
    };
  }
};

export const signInWithSequence = async (email: string) => {
  try {
    console.log(`Creating non-custodial Sequence wallet for: ${email.slice(0, 3)}***`)
    
    let otpResolver: ((code: string) => Promise<void>) | null = null
    
    sequenceWaas.onEmailAuthCodeRequired(async (respondWithCode) => {
      otpResolver = respondWithCode
      console.log('Email verification required - OTP needed')
    })
    
    const signInResult = await sequenceWaas.signIn({ email }, "TVC Non-Custodial Session")
    
    if (!signInResult.wallet) {
      throw new Error('Failed to create non-custodial Sequence wallet')
    }
    
    console.log('✅ Non-custodial Sequence wallet created:', signInResult.wallet?.slice(0, 6) + '...')
    
    if (signInResult.sessionId) {
      localStorage.setItem("sb-access-token", signInResult.sessionId);
    }
    
    return {
      success: true,
      wallet: signInResult.wallet,
      sessionId: signInResult.sessionId,
      email: signInResult.email,
      otpResolver
    }
    
  } catch (error) {
    console.error('Failed to create non-custodial wallet:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}
