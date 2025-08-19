
import { SequenceWaaS } from '@0xsequence/waas'

export const sequenceWaas = new SequenceWaaS({
  projectAccessKey: 'AQAAAAAAAKg7Q8xQ94GXN9ogCwnDTzn-BkE',
  waasConfigKey: 'eyJwcm9qZWN0SWQiOjQzMDY3LCJycGNTZXJ2ZXIiOiJodHRwczovL3dhYXMuc2VxdWVuY2UuYXBwIn0=',
  network: 'amoy'
})

export const signInWithSequence = async (email: string) => {
  try {
    let otpResolver: ((code: string) => Promise<void>) | null = null
    
    sequenceWaas.onEmailAuthCodeRequired(async (respondWithCode) => {
      otpResolver = respondWithCode
    })
    
    const signInResult = await sequenceWaas.signIn({ email }, "TVC Non-Custodial Session")
    
    if (!signInResult.wallet) {
      throw new Error('Failed to create non-custodial Sequence wallet')
    }
    
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
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}
