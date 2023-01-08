import { ApplicationOptions } from './application.js'
import { DomainSchemasConfigI, domainSchemaUtil } from './domain_schema.js'
import { FilterSchemaI } from './filter.js'
import { TabqueryRW, TabqueryTabExpressionI } from './tabquery.js'
import { Tabrep, TabrepRowIdCounterI, TabrepRowIdT, tabrepRowTechnicalPropsDummy, TabrepRowTechnicalPropsI } from './tabrep.js'
import { genProjectionFromDoc } from './util.js'

export class TabqueryTabrepInit<
  DocumentKey,
  DocumentMain extends DocumentKey & DocumentProject & DocumentFilter & DocumentCreate,
  DocumentProject extends DocumentKey,
  DocumentFilter extends DocumentKey,
  DocumentCreate = never
> {
  public busyPromise: Promise<void> | null = null
  private readonly appOptions: ApplicationOptions['appOptions']

  private readonly tabrep: Tabrep<DocumentKey, DocumentMain, DocumentProject, DocumentFilter, DocumentCreate>
  private readonly domSchemasConfig: DomainSchemasConfigI<
    DocumentKey, DocumentMain, DocumentProject, DocumentFilter, DocumentCreate
  >['domSchemasConfig']
  private readonly rows: Map<TabrepRowIdT, TabrepRowTechnicalPropsI & DocumentMain> = new Map()
  private rowId: TabrepRowIdCounterI['rowId']

  private readonly tabExpression: TabqueryTabExpressionI['tabExpression']

  constructor(
    { tabExpression, tabrep, appOptions }
      : TabqueryTabExpressionI
      & { tabrep: Tabrep<DocumentKey, DocumentMain, DocumentProject, DocumentFilter, DocumentCreate> }
      & ApplicationOptions
  ) {
    this.appOptions = appOptions
    this.tabExpression = tabExpression

    this.tabrep = tabrep
    const { domSchemasConfig, rows, rowId } = tabrep
    this.domSchemasConfig = domSchemasConfig
    this.rows = rows
    this.rowId = rowId
  }

  async initAsync<KeysFilter extends keyof DocumentFilter>(
    { filterSchema }: FilterSchemaI<DocumentFilter, KeysFilter>
  ): Promise<void> {
    const { tabExpression, appOptions } = this
    const { domSchemasConfigName, domSchemaMain, domSchemaProject } = this.domSchemasConfig

    const tabquery = new TabqueryRW<
      DocumentKey, DocumentMain, DocumentProject, DocumentFilter, DocumentCreate
    >({ tabExpression, domSchemasConfigName, appOptions })

    const { tabqRes } = await tabquery.read<keyof DocumentProject, KeysFilter>({
      filterSchema,
      project: genProjectionFromDoc<DocumentProject, keyof DocumentProject, true>(domSchemaProject, true),
      projectOptions: {}
    })
    const docs = tabqRes.rows

    const docMainDummy: DocumentMain = domainSchemaUtil.genDummyDocument({ domSchema: domSchemaMain })

    for (const doc of docs) {
      const tabsrcRow: TabrepRowTechnicalPropsI & DocumentMain = {
        ...tabrepRowTechnicalPropsDummy, ...docMainDummy, ...doc
      }
      const rowId: TabrepRowIdT = this.rowId.counter++
      this.rows.set(rowId, tabsrcRow)
    }

    this.tabrep.init()
  }
}
