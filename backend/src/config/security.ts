export const cookieOptions = (isProd: boolean) => ({
  httpOnly: true,
  secure: isProd,
  sameSite: 'lax' as const,
  path: '/'
})

export const sessionExpirySeconds = 60 * 60 // 1 hour
