import { Router, Request, Response } from 'express'
import { ENV } from '../config/env'
import { proxyToFunction } from '../services/stClient'

const router = Router()

function buildAuthHeaders(req: Request & { tvcUser?: any }) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-vault-club-api-key': ENV.vaultClubApiKey
  }
  const stToken = (req as any).tvcUser?.stAccessToken
  if (stToken) headers['Authorization'] = `Bearer ${stToken}`
  return headers
}

async function forward(req: Request & { tvcUser?: any }, res: Response, method: 'GET' | 'POST', functionPath: string) {
  try {
    const headers = buildAuthHeaders(req)
    const response = await proxyToFunction(method, functionPath, req.body, headers)
    res.status(response.status).set(response.headers).send(response.data)
  } catch (e: any) {
    const status = e?.response?.status || 500
    const data = e?.response?.data || { success: false, error: 'Proxy error' }
    res.status(status).json(data)
  }
}

router.post('/vault/init-subclub', (req: Request, res: Response) => forward(req as any, res, 'POST', '/vault-create'))
router.post('/vault/join', (req: Request, res: Response) => forward(req as any, res, 'POST', '/vault-join'))
router.post('/vault/deposit', (req: Request, res: Response) => forward(req as any, res, 'POST', '/vault-deposit'))
router.post('/vault/harvest', (req: Request, res: Response) => forward(req as any, res, 'POST', '/vault-harvest'))
router.get('/vault/progress', (req: Request, res: Response) => forward(req as any, res, 'GET', '/vault-balance'))
router.get('/vault/wbtc-balance', (req: Request, res: Response) => forward(req as any, res, 'GET', '/vault-balance'))
router.post('/emergency/pause', (req: Request, res: Response) => forward(req as any, res, 'POST', '/vault-harvest'))
router.post('/emergency/withdraw', (req: Request, res: Response) => forward(req as any, res, 'POST', '/vault-deposit'))

export default router
