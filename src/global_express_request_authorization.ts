import { AuthorizationT } from './share/authorization.js'
import { DRIVER_API_CONSTS } from './share/driver_api_consts.js'

declare global {
  namespace Express {
    interface Request {
      [DRIVER_API_CONSTS.auth]?: AuthorizationT
    }
  }
}
