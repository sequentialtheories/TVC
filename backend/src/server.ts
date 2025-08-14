import app from './app'
import { ENV } from './config/env'

const port = ENV.port
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`TVC backend bridge listening on :${port} (${ENV.network}/${ENV.chainId})`)
})
