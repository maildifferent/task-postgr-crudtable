import { ConfigPropsI } from '../config.js'
import { DomainSchemaT, domainSchemasUtil, domainSchemasList, DomainSchemasConfigPropsI } from '../domain_schema.js'
import { ErrorCustomType } from '../error.js'
import { settings, SETTINGS_CONSTS } from '../settings.js'

////////////////////////////////////////////////////////////////////////////////
// Document interfaces.
////////////////////////////////////////////////////////////////////////////////
export interface DocumentUserKeyI {
  uid: string
}

export type DocumentUserMainT = {
  uid: string, email: string, nickname: string, password: string
}

export type DocumentUserProjectT = {
  uid: string, email: string, nickname: string
}

export interface DocumentUserFilterI {
  uid: string, email: string, nickname: string
}

export type DocumentUserCreateT = {
  email: string, nickname: string, password: string
}

////////////////////////////////////////////////////////////////////////////////
// Domain schema. Main.
////////////////////////////////////////////////////////////////////////////////
const domSchemaMain: DomainSchemaT<DocumentUserMainT> = Object.freeze({
  uid: {
    type: 'string',
    isNullable: false,
    validate(uid: string): boolean {
      const regExp = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      return !regExp.test(uid)
    }
  },

  email: {
    type: 'string',
    isNullable: false,
    validate(email: string): boolean {
      const regExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return regExp.test(email.toLowerCase())
    },
    async convert(email: string): Promise<string> {
      return email.toLowerCase()
    }
  },

  nickname: {
    type: 'string',
    isNullable: false,
    validate(nickname: string): boolean {
      return nickname.length > 0
    }
  },

  password: {
    type: 'string',
    isNullable: false,
    validate(password: string): boolean {
      // password: минимальная длина 8 символов
      if (password.length < 8) throw new ErrorCustomType('password.length < 8')

      // password: должен содержать как минимум одну цифру, одну заглавную и одну строчную буквы.
      if (!/[A-Z]/.test(password)) throw new ErrorCustomType('!/[A-Z]/.test(password)')
      if (!/[a-z]/.test(password)) throw new ErrorCustomType('!/[a-z]/.test(password)')
      if (!/\d/.test(password)) throw new ErrorCustomType('!/\d/.test(password)')

      return true
    }
  }
} as const)

////////////////////////////////////////////////////////////////////////////////
// Domain schema. Other.
////////////////////////////////////////////////////////////////////////////////
const domSchemaKey: DomainSchemaT<DocumentUserKeyI> = Object.freeze((() => {
  const { uid } = domSchemaMain
  return { uid }
})())

const domSchemaProject: DomainSchemaT<DocumentUserProjectT> = Object.freeze((() => {
  const { password, ...other } = domSchemaMain
  return other
})())

const domSchemaFilter: DomainSchemaT<DocumentUserFilterI> = Object.freeze((() => {
  const { password, ...other } = domSchemaMain
  return other
})())

const domSchemaCreate: DomainSchemaT<DocumentUserCreateT> = (() => {
  const { uid, ...other } = domSchemaMain
  return other
})()

////////////////////////////////////////////////////////////////////////////////
// Main.
////////////////////////////////////////////////////////////////////////////////
export const domainSchemasUser: DomainSchemasConfigPropsI<
  DocumentUserKeyI,
  DocumentUserMainT,
  DocumentUserProjectT,
  DocumentUserFilterI,
  DocumentUserCreateT
> = {
  domSchemasConfigName: 'domainSchemasUser',
  domSchemaKey,
  domSchemaMain,
  domSchemaProject,
  domSchemaFilter,
  domSchemaCreate
}

const configProps: ConfigPropsI<typeof domainSchemasUser> = {
  configName: domainSchemasUser.domSchemasConfigName,
  config: domainSchemasUser
}

if (settings.environment === SETTINGS_CONSTS.server) {
  const url = await import('url')
  configProps.configFileName = await domainSchemasUtil.genRelativeFileName(url.fileURLToPath(import.meta.url))
}

await domainSchemasList.set({ configProps })
