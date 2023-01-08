import { ErrorCustomType } from './error.js'

////////////////////////////////////////////////////////////////////////////////
// Definition.
////////////////////////////////////////////////////////////////////////////////
// Document. E.g. const userDoc = { name: 'Ivan', lastName: 'Ivanov' }
// DocumentI. E.g. interface DocumentUserI { name: string, lastName: string }

////////////////////////////////////////////////////////////////////////////////
// Main.
////////////////////////////////////////////////////////////////////////////////
export type DocumentValuePrimitivesT = null | string | number | boolean | bigint
export type DocumentPrimitiveT = Record<string, null | string | number | boolean | bigint>
// export type DocumentPrimitiveTypedT<Fields extends string> = Record<Fields, null | string | number | boolean | bigint>
export const documentValueDomainTypeVals = ['string', 'number', 'boolean', 'bigint'] as const
export type DocumentValueDomainTypesT = (typeof documentValueDomainTypeVals)[number]

////////////////////////////////////////////////////////////////////////////////
// Util. Public.
////////////////////////////////////////////////////////////////////////////////
export const documentUtil = Object.freeze({
  typifyDocumentValuePrimitivesT(
    // something: unknown
    something: DocumentValuePrimitivesT
  ): DocumentValuePrimitivesT {
    if (something === null) return something
    if (typeof something === 'string') return something
    if (typeof something === 'number') return something
    if (typeof something === 'boolean') return something
    if (typeof something === 'bigint') return something
    throw new ErrorCustomType('incorrect something')
  },

  isDocumentValuePrimitivesT(something: unknown): something is DocumentValuePrimitivesT {
    return something === null
      || typeof something === 'string'
      || typeof something === 'number'
      || typeof something === 'boolean'
      || typeof something === 'bigint'
  },
} as const)
