import { DocumentPrimitiveT, DocumentValuePrimitivesT } from './document.js'
import { ErrorCustomType } from './error.js'
import { typifyNotPartial } from './util.js'
import { DomainT, domainUtil } from './domain.js'
import { ProjectionAnyI } from './projection.js'
import { ConfigList, ConfigNameT } from './config.js'

////////////////////////////////////////////////////////////////////////////////
// Domain schema.
////////////////////////////////////////////////////////////////////////////////
export type DomainSchemaT<Document> = {
  [key in keyof Document]: DomainT<Document[key]>
}

export interface DomainSchemaI<Document> {
  domSchema: DomainSchemaT<Document>
}

// Some tests.
() => {
  // Test. Assign some abstract types.
  type Doc1T = Record<string, string | number>
  const doc1: Doc1T = { name: '', age: 0 }
  doc1

  type Func1T = (value: any) => string | number
  // type Func1T = (value: string | number) => string | number // Error.
  const func1: Func1T = (value: string) => value
  func1

  // Test. Assign domains.
  const domain = ({}) as DomainT<string>
  const domainP: DomainT<DocumentValuePrimitivesT> = domain
  domainP

  // Test. Assign documents.
  type DocumentUserT = { name: string; age: number }
  const documentP: DocumentPrimitiveT = ({}) as DocumentUserT
  documentP

  // Test. Assign schemas.
  type TestSchemaT<DocInterface> = {
    [key in keyof DocInterface]: DomainT<DocInterface[key]>
  }
  const schemaP: TestSchemaT<DocumentPrimitiveT> = ({}) as TestSchemaT<DocumentUserT>
  schemaP

  // Test. Assign domain schemas.
  let domSchema: DomainSchemaT<DocumentUserT> = {
    name: { type: 'string', isNullable: false, validate: () => { return true } },
    age: { type: 'number', isNullable: false, validate: () => { return true } }
  }
  let domSchemaP: DomainSchemaT<DocumentPrimitiveT> = {
    name: { type: 'string', isNullable: false, validate: () => { return true } },
    age: { type: 'number', isNullable: false, validate: () => { return true } }
  }
  domSchemaP = domSchema
  // domSchema = domSchemaP // Error: Type ... is missing the following properties from type ...: name, age.
  // Test. List of domain schemas.
  const list: Map<string, DomainSchemaT<DocumentPrimitiveT>> = new Map()
  list.set('', domSchema)
  list.set('', domSchemaP)

  // Test. Use domain schema as function argument.
  const typeFull = test(domSchema) // Type: DocumentUserT.
  typeFull
  const typeHighLevel = test(domSchemaP) // Type: DocumentPrimitiveT.
  typeHighLevel
  function test<DocInterface>(domSchema: DomainSchemaT<DocInterface>) { return '' as DocInterface }
}

////////////////////////////////////////////////////////////////////////////////
// Util. Public.
////////////////////////////////////////////////////////////////////////////////
export const domainSchemaUtil = Object.freeze({
  applyDomainValidatorToDoc<Document, ProjectFields extends keyof Document>(
    domSchema: DomainSchemaT<Document>, doc: Pick<Document, ProjectFields>
  ): void {
    const incorrectFields: string[] = []

    for (const key in doc) {
      const domain = domSchema[key]
      const docVal = doc[key]

      if (docVal === undefined) {
        if (domain.isOptional)
          continue
        incorrectFields.push(key)
        continue
      }

      if (docVal === null) {
        if (domain.isNullable)
          continue
        incorrectFields.push(key)
        continue
      }

      try {
        if (!domain.validate(docVal)) { incorrectFields.push(key) }
      } catch (error) {
        if (error instanceof ErrorCustomType) {
          incorrectFields.push(key)
          continue
        }
        throw error
      }
    }

    if (incorrectFields.length > 0)
      throw new ErrorCustomType(JSON.stringify(['Incorrect fields:', ...incorrectFields]))
  },

  async applyDomainConverterToDoc<Document, ProjectFields extends keyof Document>(
    domSchema: DomainSchemaT<Document>, doc: Pick<Document, ProjectFields>
  ): Promise<void> {
    const incorrectFields: string[] = []

    for (const key in doc) {
      const domain = domSchema[key]
      if (!domain.convert)
        continue
      try {
        doc[key] = await domain.convert(doc[key])
      } catch (error) {
        if (error instanceof ErrorCustomType)
          incorrectFields.push(key)
        throw error
      }
    }

    if (incorrectFields.length > 0)
      throw new ErrorCustomType(JSON.stringify(['Incorrect fields:', ...incorrectFields]))
  },

  updDocumentPropertyValue<Document, ProjectFields extends keyof Document>(
    doc: Pick<Document, ProjectFields>,
    domSchema: DomainSchemaT<Document>,
    key: unknown,
    value: unknown
  ): void {
    if (!isKeyofDoc(key, doc))
      throw new ErrorCustomType('')

    const domain = domSchema[key]
    if (!domain)
      throw new ErrorCustomType('')
    if (!domainUtil.isDomainType(value, domain))
      throw new ErrorCustomType('')
    doc[key] = value

    function isKeyofDoc<Document, ProjectFields extends keyof Document>(
      key: unknown,
      doc: Pick<Document, ProjectFields>
    ): key is keyof typeof doc {
      if (typeof key !== 'string')
        throw new ErrorCustomType('')
      return (key in doc)
    }
  },

  convStringToDomainValueType<Document, Key extends keyof Document>(
    str: string, key: Key, domSchema: DomainSchemaT<Document>
  ): Document[Key] {
    if (typeof str !== 'string')
      throw new ErrorCustomType('')

    let value: unknown
    const domain = domSchema[key]

    try {
      value = JSON.parse(str.toLowerCase())
      if (domain.isOptional && value === undefined) { } // return value -> error
      else if (domain.isNullable && value === null) { } // return value -> error
      else
        throw null
      if (!domainUtil.isDomainType(value, domSchema[key]))
        throw new ErrorCustomType('')
      return value
    } catch (error) { } // Do nothing.

    if (domain.type === 'string') { value = str }
    else if (domain.type === 'number') { value = Number(str) }
    else if (domain.type === 'boolean') { value = JSON.parse(str.toLowerCase()) }
    else if (domain.type === 'bigint') { value = BigInt(str) }
    else
      throw new ErrorCustomType('incorrect domain')

    if (!domainUtil.isDomainType(value, domSchema[key]))
      throw new ErrorCustomType('')
    return value
  },

  convStringArrToDoc<Document, ProjectFields extends keyof Document>(
    { strArr, domSchema, project }
      : { strArr: string[] }
      & ProjectionAnyI<Document, ProjectFields>
      & DomainSchemaI<Document>
  ): Pick<Document, ProjectFields> {
    if (strArr.length !== Object.keys(project).length)
      throw new ErrorCustomType('')

    const resultPartial: Partial<Pick<Document, ProjectFields>> = {}
    let i = 0
    for (const key in project) {
      const str = strArr[i++]
      if (!str)
        throw new ErrorCustomType('')
      resultPartial[key] = domainSchemaUtil.convStringToDomainValueType(str, key, domSchema)
    }

    return typifyNotPartial(resultPartial, Object.keys(project).length)
  },

  genDummyDocument<Document>({ domSchema }: DomainSchemaI<Document>): Document {
    const partialDoc: Partial<Document> = {}
    for (const key in domSchema)
      partialDoc[key] = dummyValue(domSchema[key])
    return typifyNotPartial(partialDoc, Object.keys(domSchema).length)

    function dummyValue<PrimitiveType>(domain: DomainT<PrimitiveType>): PrimitiveType {
      if (domain.isOptional)
        return undefined as PrimitiveType
      if (domain.isNullable)
        return null as PrimitiveType
      if (domain.type === 'string')
        return '' as PrimitiveType
      if (domain.type === 'number')
        return 0 as PrimitiveType
      if (domain.type === 'boolean')
        return false as PrimitiveType
      if (domain.type === 'bigint')
        return 0n as PrimitiveType
      throw new ErrorCustomType('incorrect domain')
    }
  },

  isDocumentPick<Document, ProjectFields extends keyof Document>(
    something: unknown,
    domSchema: DomainSchemaI<Document>['domSchema'],
    project: ProjectionAnyI<Document, ProjectFields>['project']
  ): something is Pick<Document, ProjectFields> {
    if (typeof something !== 'object' || !something)
      throw new ErrorCustomType('typeof something !== object || !something')

    for (const key in project) {
      const domain = domSchema[key]
      if (!domainUtil.isDomainType(something[key as keyof typeof something], domain))
        throw new ErrorCustomType('')
    }

    if (Object.keys(project).length !== Object.keys(something).length)
      throw new ErrorCustomType('')
    return true
  },

  isDocumentPickArr<Document, ProjectFields extends keyof Document>(
    something: unknown,
    domSchema: DomainSchemaI<Document>['domSchema'],
    project: ProjectionAnyI<Document, ProjectFields>['project']
  ): something is Pick<Document, ProjectFields>[] {
    if (!Array.isArray(something))
      throw new ErrorCustomType('!Array.isArray(something)')

    for (let i = 0; i < something.length; i++) {
      if (domainSchemaUtil.isDocumentPick<Document, ProjectFields>(
        something[i], domSchema, project
      ))
        continue
      throw new ErrorCustomType('')
    }

    return true
  },

  isDocument<Document>(
    something: unknown,
    domSchema: DomainSchemaT<Document>
  ): something is Document {
    const res = domainSchemaUtil.isDocumentPick<Document, keyof Document>(
      something, domSchema, domSchema
    )
    return res
  },

  isDocumentArr<Document>(
    something: unknown,
    domSchema: DomainSchemaT<Document>
  ): something is Document[] {
    const res = domainSchemaUtil.isDocumentPickArr<Document, keyof Document>(
      something, domSchema, domSchema
    )
    return res
  }
} as const)

////////////////////////////////////////////////////////////////////////////////
// Domain schemas. Config. List.
////////////////////////////////////////////////////////////////////////////////
export interface DomainSchemasConfigNameI {
  domSchemasConfigName: ConfigNameT
}

export interface DomainSchemasConfigI<
  DocumentKey,
  DocumentMain,
  DocumentProject,
  DocumentFilter,
  DocumentCreate = never
> {
  domSchemasConfig: DomainSchemasConfigPropsI<
    DocumentKey,
    DocumentMain,
    DocumentProject,
    DocumentFilter,
    DocumentCreate
  >
}

export interface DomainSchemasConfigPropsI<
  DocumentKey,
  DocumentMain,
  DocumentProject,
  DocumentFilter,
  DocumentCreate = never
> extends DomainSchemasConfigNameI {
  domSchemaKey: DomainSchemaT<DocumentKey>
  domSchemaMain: DomainSchemaT<DocumentMain>,
  domSchemaProject: DomainSchemaT<DocumentProject>,
  domSchemaFilter: DomainSchemaT<DocumentFilter>
  domSchemaCreate?: DomainSchemaT<DocumentCreate>
}

type DomainSchemasConfigPropsPrimitiveT = DomainSchemasConfigPropsI<
  DocumentPrimitiveT, DocumentPrimitiveT, DocumentPrimitiveT,
  DocumentPrimitiveT, DocumentPrimitiveT
>

class DomSchemasList extends ConfigList<DomainSchemasConfigPropsPrimitiveT> { }

export const domainSchemasList = new DomSchemasList()

////////////////////////////////////////////////////////////////////////////////
// Util. Public.
////////////////////////////////////////////////////////////////////////////////
export const domainSchemasUtil = Object.freeze({
  async genRelativeFileName(metaUrl: string): Promise<string> {
    const path = await import('path')
    const fileName = '/lib/pub/domain_schemas/' + path.basename(metaUrl)
    return fileName
  }
} as const)
