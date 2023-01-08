import { DocumentValueDomainTypesT, DocumentValuePrimitivesT } from './document.js'
import { DomainSchemaT } from './domain_schema.js'
import { ErrorCustomType } from './error.js'

////////////////////////////////////////////////////////////////////////////////
// Domain.
////////////////////////////////////////////////////////////////////////////////
//
// Some tests.
() => {
  const truee1: never extends string ? true : false = ({}) as any
  const false1: string extends never ? true : false = ({}) as any
  const truee4: never extends never ? true : false = ({}) as any
  truee1; false1; truee4
  //
  const false2: string extends null ? true : false = ({}) as any
  const false3: null extends string ? true : false = ({}) as any
  false2; false3
  //
  const false4: (string | null) extends null ? true : false = ({}) as any
  const false5: (string | null) extends string ? true : false = ({}) as any
  false4; false5
  //
  const truee2: null extends (string | null) ? true : false = ({}) as any
  const truee3: string extends (string | null) ? true : false = ({}) as any
  truee2; truee3
}

export type DomainT<PrimitiveType> = Readonly<{
  type
  : DocumentValuePrimitivesT extends PrimitiveType ? DocumentValueDomainTypesT
  : string extends PrimitiveType ? 'string'
  : number extends PrimitiveType ? 'number'
  : boolean extends PrimitiveType ? 'boolean'
  : bigint extends PrimitiveType ? 'bigint'
  : never
  isNullable
  : DocumentValuePrimitivesT extends PrimitiveType ? boolean
  : null extends PrimitiveType ? true
  : false
  isOptional?: DocumentValuePrimitivesT extends PrimitiveType ? boolean
  : undefined extends PrimitiveType ? true : false // TODO. Not implemented.

  validate: (
    value
      : DocumentValuePrimitivesT extends PrimitiveType ? any  // TODO. any.
      : PrimitiveType
  ) => boolean

  convert?: (
    value
      : DocumentValuePrimitivesT extends PrimitiveType ? any  // TODO. any.
      : PrimitiveType
  ) => Promise<PrimitiveType>
}>

// Some tests.
() => {
  const testStr: DomainT<string> = {
    type: 'string',
    isNullable: false,
    isOptional: false,
    validate: (val: string | number) => { return true },
    // convert: (val: string | number) => { return val } // Error.
  }
  testStr
  const testStrNull: DomainT<string | null> = {
    type: 'string',
    isNullable: true,
    isOptional: false,
    validate: (val: string | null) => { return true }
    // validate: (val: string | number) => { return true } // Error.
    // validate: (val: string) => { return true } // Error.
  }
  testStrNull
}

////////////////////////////////////////////////////////////////////////////////
// Domain rows.
////////////////////////////////////////////////////////////////////////////////
interface DomainFieldI<Names, PrimitiveType> extends DomainT<PrimitiveType> {
  name: Names
}

interface DomainRowsDocsPropsI<Document> {
  fields: DomainSchemaT<Document>,
  rows: Document[]
}

interface DomainRowsArrsPropsI<Document> {
  fields: DomainArrayI<Document>,
  rows: Document[keyof Document][][]
}

// @ts-ignore
interface DomainFieldRowsDocsI<Document> {
  fieldRows: DomainRowsDocsPropsI<Document>
}

// @ts-ignore
interface DomainFieldRowsArrsI<Document> {
  fieldRows: DomainRowsArrsPropsI<Document>
}

////////////////////////////////////////////////////////////////////////////////
// Domain array.
////////////////////////////////////////////////////////////////////////////////
type DomainArrayI<Document> = DomainFieldI<keyof Document, Document[keyof Document]>[]

////////////////////////////////////////////////////////////////////////////////
// Util. Public.
////////////////////////////////////////////////////////////////////////////////
export const domainUtil = Object.freeze({
  isDomainType<PrimitiveType>(
    something: unknown,
    domain: DomainT<PrimitiveType>
  ): something is PrimitiveType {
    if (something === undefined && domain.isOptional) return true
    if (something === null && domain.isNullable) return true
    if (typeof something === 'number' && isNaN(something)) throw new ErrorCustomType('')
    return (typeof something === domain.type)
  },
} as const);

// Some tests.
() => {
  const testStrDomain: DomainT<string> = {
    type: 'string',
    isNullable: false,
    validate: (val: string | number) => { return true },
    // convert: (val: string | number) => { return val } // Error.
  }
  let test: unknown
  if (domainUtil.isDomainType(test, testStrDomain)) { test } // typeof test === string
}
