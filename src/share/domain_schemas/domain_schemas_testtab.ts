import { ConfigPropsI } from '../config.js'
import { DomainSchemaT, domainSchemasUtil, domainSchemasList, DomainSchemasConfigPropsI } from '../domain_schema.js'
import { settings, SETTINGS_CONSTS } from '../settings.js'

////////////////////////////////////////////////////////////////////////////////
// Document interfaces.
////////////////////////////////////////////////////////////////////////////////
export interface DocumentTesttabKeyI {
  uid: string
}

export type DocumentTesttabMainT = {
  uid: string, name: string, position: string, skills: string, comment: string
}

export type DocumentTesttabProjectT = {
  uid: string, name: string, position: string, skills: string, comment: string
}

export interface DocumentTesttabFilterI {
  uid: string, name: string, position: string, skills: string, comment: string
}

export type DocumentTesttabCreateT = {
  name: string, position: string, skills: string, comment: string
}

////////////////////////////////////////////////////////////////////////////////
// Domain schema. Main.
////////////////////////////////////////////////////////////////////////////////
const domSchemaMain: DomainSchemaT<DocumentTesttabMainT> = Object.freeze({
  uid: {
    type: 'string',
    isNullable: false,
    validate(uid: string): boolean {
      const regExp = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      return !regExp.test(uid)
    }
  },

  name: {
    type: 'string',
    isNullable: false,
    validate(value: string): boolean {
      if (value.length < 1) return false
      if (value.length > 100) return false
      return true
    }
  },

  position: {
    type: 'string',
    isNullable: false,
    validate(value: string): boolean {
      if (value.length < 1) return false
      if (value.length > 100) return false
      return true
    }
  },

  skills: {
    type: 'string',
    isNullable: false,
    validate(value: string): boolean {
      if (value.length < 1) return false
      if (value.length > 100) return false
      return true
    }
  },

  comment: {
    type: 'string',
    isNullable: false,
    validate(value: string): boolean {
      if (value.length < 1) return false
      if (value.length > 100) return false
      return true
    }
  },
} as const)

////////////////////////////////////////////////////////////////////////////////
// Domain schema. Other.
////////////////////////////////////////////////////////////////////////////////
const domSchemaKey: DomainSchemaT<DocumentTesttabKeyI> = Object.freeze((() => {
  const { uid } = domSchemaMain
  return { uid }
})())

const domSchemaProject: DomainSchemaT<DocumentTesttabProjectT> = Object.freeze((() => {
  return domSchemaMain
})())

const domSchemaFilter: DomainSchemaT<DocumentTesttabFilterI> = Object.freeze((() => {
  return domSchemaMain
})())

const domSchemaCreate: DomainSchemaT<DocumentTesttabCreateT> = (() => {
  const { uid, ...other } = domSchemaMain
  return other
})()

////////////////////////////////////////////////////////////////////////////////
// Main.
////////////////////////////////////////////////////////////////////////////////
export const domainSchemasTesttab: DomainSchemasConfigPropsI<
  DocumentTesttabKeyI,
  DocumentTesttabMainT,
  DocumentTesttabProjectT,
  DocumentTesttabFilterI,
  DocumentTesttabCreateT
> = {
  domSchemasConfigName: 'domainSchemasTesttab',
  domSchemaKey,
  domSchemaMain,
  domSchemaProject,
  domSchemaFilter,
  domSchemaCreate
}

const configProps: ConfigPropsI<typeof domainSchemasTesttab> = {
  configName: domainSchemasTesttab.domSchemasConfigName,
  config: domainSchemasTesttab
}

if (settings.environment === SETTINGS_CONSTS.server) {
  const url = await import('url')
  configProps.configFileName = await domainSchemasUtil.genRelativeFileName(url.fileURLToPath(import.meta.url))
}

await domainSchemasList.set({ configProps })
