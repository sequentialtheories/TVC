import { SequenceWaaS } from '@0xsequence/waas'

const sequenceWaas = new SequenceWaaS({
  projectAccessKey: 'AQAAAAAAAKg7Q8xQ94GXN9ogCwnDTzn-BkE',
  waasConfigKey: 'eyJwcm9qZWN0SWQiOjQzMDY3LCJycGNTZXJ2ZXIiOiJodHRwczovL3dhYXMuc2VxdWVuY2UuYXBwIn0=',
  network: 'amoy'
})

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
      localStorage.setItem("sb-access-token", signInResult.sessionId)
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

export const submitOtpCode = async (otpResolver: ((code: string) => Promise<void>) | null, code: string) => {
  try {
    if (!otpResolver) {
      throw new Error('No OTP resolver available')
    }
    await otpResolver(code)
    return { success: true }
  } catch (error) {
    console.error('Failed to submit OTP code:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

export const sendSequenceTransaction = async (transactions: any[]) => {
  try {
    console.log('🔐 User signing transaction with their own keys (non-custodial)')
    const txn = await sequenceWaas.sendTransaction({
      transactions
    })
    
    console.log('✅ Transaction signed and sent by user:', txn)
    return { success: true, transaction: txn }
  } catch (error) {
    console.error('Error sending transaction:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}
