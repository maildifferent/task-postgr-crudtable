import { DocumentUserProjectT } from './domain_schemas/domain_schemas_user.js'

export type AuthorizationT = {
  token?: string
  tokenPayload?: AuthorizationTokenPayloadI
  user?: DocumentUserProjectT
}

export interface AuthorizationTokenPayloadI {
  uid: string
  iat: number
  exp: number
}

export type AuthorizationResultT = { token: string; expire: Date }
