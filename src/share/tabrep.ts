import { ApplicationOptions } from './application.js'
import { DocumentPrimitiveT } from './document.js'
import { DomainSchemasConfigI } from './domain_schema.js'
import { TabrepFront } from './tabrep_front.js'

////////////////////////////////////////////////////////////////////////////////
// Tabrep. Constants and types.
////////////////////////////////////////////////////////////////////////////////
export const TABREP_KEYS = Object.freeze({
  _check: '_check',
  _commit: '_commit',
  _inform: '_inform',
} as const)

export const TABREP_COMMITS = Object.freeze({
  create: 'create',
  credel: 'credel', // Create -> delete.
  delete: 'delete',
  update: 'update',
  upddel: 'upddel', // Update -> delete.
} as const)

export const TABREP_INFORMS = Object.freeze({
  changed: 'changed',
  error: 'error',
  saved: 'saved',
} as const)

type TabrepCommitsT = keyof typeof TABREP_COMMITS | ''
type TabrepInformsT = keyof typeof TABREP_INFORMS | ''
export type TabrepRowIdT = number
export interface TabrepRowIdCounterI { rowId: { counter: number } }

export type TabrepRowTechnicalPropsI = {
  _check: ''
  _commit: TabrepCommitsT
  _inform: TabrepInformsT
}

export const tabrepRowTechnicalPropsDummy: Readonly<TabrepRowTechnicalPropsI> = Object.freeze({
  _check: '',
  _commit: '',
  _inform: '',
} as const)

////////////////////////////////////////////////////////////////////////////////
// Tabrep. Source.
////////////////////////////////////////////////////////////////////////////////
export class Tabrep<
  DocumentKey,
  DocumentMain extends DocumentKey & DocumentProject & DocumentFilter & DocumentCreate,
  DocumentProject extends DocumentKey,
  DocumentFilter extends DocumentKey,
  DocumentCreate = never
> {
  static { }
  public busyPromise: Promise<void> | null = null
  private readonly appOptions: ApplicationOptions['appOptions']
  public readonly front: TabrepFront<DocumentKey, DocumentMain, DocumentProject, DocumentFilter, DocumentCreate>
  // Счетчик для генерации ключа строки используется классами, которые
  // инициализируют и CRUD-ят строки.
  public rowId: TabrepRowIdCounterI['rowId'] = { counter: 0 }

  public readonly domSchemasConfig: DomainSchemasConfigI<
    DocumentKey, DocumentMain, DocumentProject, DocumentFilter, DocumentCreate
  >['domSchemasConfig']

  public readonly rows: Map<TabrepRowIdT, TabrepRowTechnicalPropsI & DocumentMain> = new Map()
  public readonly columns: (Extract<keyof (TabrepRowTechnicalPropsI & DocumentMain), string>)[] = []

  constructor(
    { domSchemasConfig, front, appOptions }
      : DomainSchemasConfigI<DocumentKey, DocumentMain, DocumentProject, DocumentFilter, DocumentCreate>
      & { front: TabrepFront<DocumentKey, DocumentMain, DocumentProject, DocumentFilter, DocumentCreate> }
      & ApplicationOptions
  ) {
    this.appOptions = appOptions
    this.appOptions
    this.domSchemasConfig = domSchemasConfig
    this.front = front

    // Fill columns.
    const { domSchemaMain } = this.domSchemasConfig
    let keyTech: keyof typeof tabrepRowTechnicalPropsDummy
    for (keyTech in tabrepRowTechnicalPropsDummy) this.columns.push(keyTech)
    for (const key in domSchemaMain) this.columns.push(key)
  }

  init() {
    const rendererFeed = new Map<TabrepRowIdT, DocumentPrimitiveT>()
    for (const [rowId, tabsrcRow] of this.rows.entries()) {
      rendererFeed.set(rowId, tabsrcRow)
    }
    this.front.init({ rows: rendererFeed })
  }
}