import bcryptjs from 'bcryptjs'
import jsonwebtoken from 'jsonwebtoken'
import { CONFIG } from './config.js'
import { DriverDbTabquery } from './driver_db.js'
import { ApplicationOptions } from './share/application.js'
import { AuthorizationResultT, AuthorizationTokenPayloadI } from './share/authorization.js'
import { domainSchemaUtil } from './share/domain_schema.js'
import { ErrorCustomImpossible, ErrorCustomSyntax, ErrorCustomType } from './share/error.js'
import { FilterSchemaI, filterUtil } from './share/filter.js'
import { DocumentUserProjectT, domainSchemasUser, DocumentUserFilterI, DocumentUserCreateT, DocumentUserMainT, DocumentUserKeyI } from './share/domain_schemas/domain_schemas_user.js'
import { TabqueryRW } from './share/tabquery.js'

type AuthorizationVerifyTokenRes = {
  tokenPayload: AuthorizationTokenPayloadI
  user: DocumentUserProjectT
}

////////////////////////////////////////////////////////////////////////////////
// Util. Public.
////////////////////////////////////////////////////////////////////////////////
export const authorizationPrivateUtil = Object.freeze({
  async verifyTokenAsync(
    { token, appOptions }: { token: string } & ApplicationOptions
  ): Promise<AuthorizationVerifyTokenRes> {
    const promise = new Promise<AuthorizationVerifyTokenRes>((resolve, reject) => {
      jsonwebtoken.verify(
        token, CONFIG.jwtSecret,
        async (error, tokenPayload) => {
          if (error) return reject(error)
          if (!isTokenPayload(tokenPayload)) return reject(new ErrorCustomSyntax('!isTokenPayload(tokenPayload)'))


          const userRW = new TabqueryRW<
            DocumentUserKeyI, DocumentUserMainT, DocumentUserProjectT, DocumentUserFilterI, DocumentUserCreateT
          >({ tabExpression: 'users', domSchemasConfigName: domainSchemasUser.domSchemasConfigName, appOptions })

          const { tabqRes } = await userRW.read<'uid' | 'email' | 'nickname', 'uid'>({
            filterSchema: { uid: tokenPayload.uid },
            project: { uid: true, email: true, nickname: true },
            projectOptions: {}
          })

          const users: DocumentUserProjectT[] = tabqRes.rows

          if (users.length !== 1) return reject(new ErrorCustomType('users.length !== 1'))
          const user0 = users[0]
          if (!user0) return reject(new ErrorCustomSyntax('!user0'))

          resolve({ tokenPayload, user: user0 })
        }
      )
    })

    return promise
  },

  async login<KeysFilter extends keyof DocumentUserFilterI>(
    { filterSchema, password, appOptions }
      : FilterSchemaI<DocumentUserFilterI, KeysFilter>
      & Pick<DocumentUserCreateT, 'password'>
      & ApplicationOptions
  ): Promise<AuthorizationResultT> {
    if (!password || typeof password !== 'string') throw new ErrorCustomType('!password || typeof password !== string')
    if (!filterUtil.isFilterSchema(filterSchema, domainSchemasUser.domSchemaFilter)) throw new ErrorCustomType('')

    if (Object.keys(filterSchema).length !== 1) throw new ErrorCustomType('Object.keys(filter).length !== 1')

    type AuthUserProjectT = DocumentUserMainT
    const userTabquery = new DriverDbTabquery<
      DocumentUserKeyI, DocumentUserMainT, AuthUserProjectT, DocumentUserFilterI, DocumentUserCreateT
    >({ tabExpression: 'users', domSchemasConfigName: domainSchemasUser.domSchemasConfigName, appOptions })

    const { tabqRes } = await userTabquery.read<'uid' | 'email' | 'nickname' | 'password', KeysFilter>({
      filterSchema, project: { uid: true, email: true, nickname: true, password: true }, projectOptions: {}
    })
    const users: AuthUserProjectT[] = tabqRes.rows

    if (users.length !== 1) throw new ErrorCustomType('users.length !== 1')
    const user0 = users[0]
    if (!user0) throw new ErrorCustomSyntax('!user0')

    const isPasswordCorrect: boolean = await isPasswordCorrectAsync(password, user0.password)
    if (!isPasswordCorrect) throw new ErrorCustomType('!isPasswordCorrect')

    return signTokenWithTimeAsync(user0.uid)
  },

  async signin(
    { user, appOptions }: { user: DocumentUserCreateT } & ApplicationOptions
  ): Promise<AuthorizationResultT> {
    if(!domainSchemasUser.domSchemaCreate) throw new ErrorCustomImpossible('')
    if (!domainSchemaUtil.isDocument(user, domainSchemasUser.domSchemaCreate)) throw new ErrorCustomType('')

    const userRW = new TabqueryRW<
      DocumentUserKeyI, DocumentUserMainT, DocumentUserProjectT, DocumentUserFilterI, DocumentUserCreateT
    >({ tabExpression: 'users', domSchemasConfigName: domainSchemasUser.domSchemasConfigName, appOptions })

    const { tabqRes } = await userRW.create<'uid' | 'email' | 'nickname'>({
      create: [user], project: { uid: true, email: true, nickname: true }
    })
    const users: DocumentUserProjectT[] = tabqRes.rows

    if (users.length !== 1) throw new ErrorCustomType('users.length !== 1')
    const user0 = users[0]
    if (!user0) throw new ErrorCustomSyntax('!user0')

    return signTokenWithTimeAsync(user0.uid)
  },
})

////////////////////////////////////////////////////////////////////////////////
// Util. Private.
////////////////////////////////////////////////////////////////////////////////
async function signTokenAsync(uid: string): Promise<string> {
  const promise = new Promise<string>((resolve, reject) => {
    // "Токен авторизации живет 30 минут"
    jsonwebtoken.sign({ uid }, CONFIG.jwtSecret, {
      expiresIn: CONFIG.jwtExpiresIn
    }, (error, token) => {
      if (error)
        return reject(error)
      if (!token)
        return reject(new ErrorCustomSyntax('!token'))
      resolve(token)
    })
  })
  return promise
}

async function signTokenWithTimeAsync(uid: string): Promise<AuthorizationResultT> {
  if (CONFIG.jwtExpiresIn !== '30m')
    throw new ErrorCustomSyntax('JWT_EXPIRES_IN !== 30m')

  const token = await signTokenAsync(uid)
  const expireDate = new Date(Date.now() + 30 * 60 * 1000)
  return { token, expire: expireDate }
}

async function isPasswordCorrectAsync(
  candidatePassword: string, userPasswordHash: string
): Promise<boolean> {
  return await bcryptjs.compare(candidatePassword, userPasswordHash)
}

function isTokenPayload(obj: any): obj is AuthorizationTokenPayloadI {
  if (!obj) return false
  if (typeof obj !== 'object') return false
  if (typeof obj['uid'] !== 'string') return false
  if (typeof obj['iat'] !== 'number') return false
  if (typeof obj['exp'] !== 'number') return false
  if (Object.keys(obj).length !== 3) return false
  return true
}
