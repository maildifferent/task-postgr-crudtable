import { FilterSchemaI, filterUtil } from './filter.js'
import { ProjectionAnyI, ProjectionI, projectionUtil, ProjectOptionsI } from './projection.js'
import { Application, ApplicationOptions } from './application.js'
import { ApplicaterOperIdI, ApplicaterOperListRessI, applicaterOperListUtil, applicaterOperUtil } from './applicater.js'
import { settings, SETTINGS_CONSTS } from './settings.js'
import { ErrorCustomImpossible, ErrorCustomType, errorImpossible } from './error.js'
import { hasProperties2, typifyNotPartial } from './util.js'
import { domainSchemasList, domainSchemaUtil, DomainSchemaI, DomainSchemaT, DomainSchemasConfigNameI, DomainSchemasConfigPropsI } from './domain_schema.js'
import { ConfigPropsI } from './config.js'

interface TabqueryResultDocsPropsI<Document> {
  rows: Document[]
  rowCount: number
}

export interface TabqueryResultDocsI<Document> {
  tabqRes: TabqueryResultDocsPropsI<Document>
}

////////////////////////////////////////////////////////////////////////////////
// Tabquery.
////////////////////////////////////////////////////////////////////////////////
export interface TabqueryTabExpressionI {
  tabExpression: string
}

export interface TabqueryCreateI<DocumentCreate> {
  create: DocumentCreate[]
}

export interface TabqueryUpdateI<DocumentCreate, KeysCreate extends keyof DocumentCreate> {
  update: Pick<DocumentCreate, KeysCreate>
}

export class TabqueryRW<
  DocumentKey,
  DocumentMain,
  DocumentProject = DocumentMain,
  DocumentFilter = DocumentMain,
  DocumentCreate = DocumentMain
> extends Application<typeof TabqueryRW<DocumentKey, DocumentMain, DocumentProject, DocumentFilter, DocumentCreate>> {
  readonly tabExpression: TabqueryTabExpressionI['tabExpression']
  readonly domSchemasConfigName: DomainSchemasConfigNameI['domSchemasConfigName']

  constructor(
    { tabExpression, domSchemasConfigName, appOptions }
      : TabqueryTabExpressionI & DomainSchemasConfigNameI & ApplicationOptions
  ) {
    if (typeof tabExpression !== 'string') throw new ErrorCustomType('typeof tabExpression !== string')
    if (typeof domSchemasConfigName !== 'string') throw new ErrorCustomType('typeof domSchemasConfigName !== string')

    super({ appOptions, ctorFunc: TabqueryRW, ctorArgs: [{ tabExpression, domSchemasConfigName, appOptions }] })

    this.tabExpression = tabExpression
    this.domSchemasConfigName = domSchemasConfigName
  }

  async read<
    ProjectFields extends keyof DocumentProject,
    KeysFilter extends keyof DocumentFilter,
  >(
    { filterSchema, project, projectOptions }
      : FilterSchemaI<DocumentFilter, KeysFilter>
      & ProjectionI<DocumentProject, ProjectFields>
      & ProjectOptionsI<DocumentProject, ProjectFields>
  ): Promise<TabqueryResultDocsI<Pick<DocumentProject, ProjectFields>>> {
    // Инициализация.
    const { tabExpression, domSchemasConfigName, appOptions } = this

    // Проверки аргументов функции.
    if (typeof tabExpression !== 'string') throw new ErrorCustomType('typeof tabExpression !== string')
    if (typeof domSchemasConfigName !== 'string') throw new ErrorCustomType('typeof domSchemasConfigName !== string')

    const domSchemas: ConfigPropsI<
      DomainSchemasConfigPropsI<DocumentKey, DocumentMain, DocumentProject, DocumentFilter, DocumentCreate>
    > = await domainSchemasList.get<
      DomainSchemasConfigPropsI<DocumentKey, DocumentMain, DocumentProject, DocumentFilter, DocumentCreate>
    >({ configName: domSchemasConfigName, appOptions })

    const { domSchemaProject, domSchemaFilter } = domSchemas.config

    if (!filterUtil.isFilterSchema(filterSchema, domSchemaFilter)) throw new ErrorCustomType('')

    if (!projectionUtil.isProjection(project, domSchemaProject)) throw new ErrorCustomType('')

    if (!projectionUtil.isProjectionOptionsT(projectOptions, project, domSchemaProject)) throw new ErrorCustomType('')

    // Результат.
    if (settings.environment === SETTINGS_CONSTS.server) {
      if (!settings.tabqueryDriver) throw new ErrorCustomType('!settings.tabqueryDriver')
      // Driver DB.
      const driver = new settings.tabqueryDriver<
        DocumentKey, DocumentMain, DocumentProject, DocumentFilter, DocumentCreate
      >({ tabExpression, domSchemasConfigName, appOptions })

      return driver.read<ProjectFields, KeysFilter>({ filterSchema, project, projectOptions })
    }
    else if (settings.environment === SETTINGS_CONSTS.browser) {

      const { applerOper } = applicaterOperUtil.operFromApp({
        app: this,
        method: this.read<ProjectFields, KeysFilter>,
        args: [{ filterSchema, project, projectOptions }]
      })

      const result = await applicaterOperListUtil.fetchFromClientSingle({ applerOper, appOptions })

      const { tabqRes } = typifyTabqueryResultDocsI({
        something: result as TabqueryResultDocsI<Pick<DocumentProject, ProjectFields>>,
        domSchemaProject, project
      })
      return { tabqRes }
    }
    else {
      throw new ErrorCustomType('incorrect settings.environment')
    }
  }

  async create<
    ProjectFields extends keyof DocumentProject
  >(
    { create, project }
      : TabqueryCreateI<DocumentCreate>
      & ProjectionI<DocumentProject, ProjectFields>
  ): Promise<TabqueryResultDocsI<Pick<DocumentProject, ProjectFields>>> {
    // 1. Инициализация.
    const { tabExpression, domSchemasConfigName, appOptions } = this

    // 2. Проверки аргументов функции.
    if (typeof tabExpression !== 'string') throw new ErrorCustomType('typeof tabExpression !== string')
    if (typeof domSchemasConfigName !== 'string') throw new ErrorCustomType('typeof domSchemasConfigName !== string')

    const domSchemas: ConfigPropsI<
      DomainSchemasConfigPropsI<DocumentKey, DocumentMain, DocumentProject, DocumentFilter, DocumentCreate>
    > = await domainSchemasList.get<
      DomainSchemasConfigPropsI<DocumentKey, DocumentMain, DocumentProject, DocumentFilter, DocumentCreate>
    >({ configName: domSchemasConfigName, appOptions })

    const { domSchemaProject, domSchemaCreate } = domSchemas.config
    if (!domSchemaCreate) throw new ErrorCustomImpossible('!domSchemaCreate')

    if (!domainSchemaUtil.isDocumentArr(create, domSchemaCreate)) throw new ErrorCustomType('')

    if (!projectionUtil.isProjection(project, domSchemaProject)) throw new ErrorCustomType('')

    // 3. Прочие предварительные шаги.
    type DocRes = Pick<DocumentProject, ProjectFields>

    const tabqRes: Partial<TabqueryResultDocsI<DocRes>['tabqRes']> = {}

    // 5. Добавление операции в транзакцию приложения.
    if (this.appOptions.trnapp) {
      const { applerOperId } = this.appOptions.trnapp.pushOperFromApp(
        { app: this, method: this.create<ProjectFields>, args: [{ create, project }] }
      )

      // Постпроцессор для обработки результата после коммита транзакции.
      this.appOptions.trnapp.resultProcessors.push(genResultPostprocessor<DocumentProject, ProjectFields>(
        { tabqRes, applerOperId, domSchemaProject, project }
      ))
    }

    // 6. Преобразования.
    const convertedDocs = await validateAndConvert({ docs: create, domSchema: domSchemaCreate })

    // 7. Результат моделирования.
    const dummyDoc = domainSchemaUtil.genDummyDocument({ domSchema: domSchemaProject })
    const projectDocs: Pick<DocumentProject, ProjectFields>[] = []
    for (let i = 0; i < convertedDocs.length; i++) {
      const convertedDoc = convertedDocs[i]
      if (!convertedDoc) throw new ErrorCustomImpossible('')

      const projectDoc: Pick<DocumentProject, ProjectFields> = projectionUtil.pickProjectFromDoc(dummyDoc, project)

      for (const [key, value] of Object.entries(convertedDoc)) {
        if (key in projectDoc) domainSchemaUtil.updDocumentPropertyValue(projectDoc, domSchemaProject, key, value)
      }
      projectDocs.push(projectDoc)
    }

    tabqRes.rows = projectDocs
    tabqRes.rowCount = projectDocs.length

    // 8. Добавление операции в транзакцию запроса к БД.
    if (this.appOptions.trntab) {
      const args: Parameters<typeof this.create<ProjectFields>> = [{
        create: convertedDocs,
        project
      }]
      const { applerOperId } = this.appOptions.trntab.pushOperFromApp({ app: this, method: this.create<ProjectFields>, args })

      // Постпроцессор для обработки результата после коммита транзакции.
      this.appOptions.trntab.resultProcessors.push(genResultPostprocessor<DocumentProject, ProjectFields>(
        { tabqRes, applerOperId, domSchemaProject, project }
      ))
    }

    return { tabqRes: typifyNotPartial(tabqRes, 2) }
  }

  async update<
    ProjectFields extends keyof DocumentProject,
    KeysFilter extends keyof DocumentFilter,
    KeysCreate extends keyof DocumentCreate,
  >(
    { filterSchema, update, project }
      : TabqueryUpdateI<DocumentCreate, KeysCreate>
      & FilterSchemaI<DocumentFilter, KeysFilter>
      & ProjectionI<DocumentProject, ProjectFields>
  ): Promise<TabqueryResultDocsI<Pick<DocumentProject, ProjectFields>>> {
    // 1. Инициализация.
    const { tabExpression, domSchemasConfigName, appOptions } = this

    // 2. Проверки аргументов функции.
    if (typeof tabExpression !== 'string') throw new ErrorCustomType('typeof tabExpression !== string')
    if (typeof domSchemasConfigName !== 'string') throw new ErrorCustomType('typeof domSchemasConfigName !== string')
    if (Object.keys(filterSchema).length < 1) throw new ErrorCustomType('')

    const domSchemas: ConfigPropsI<
      DomainSchemasConfigPropsI<DocumentKey, DocumentMain, DocumentProject, DocumentFilter, DocumentCreate>
    > = await domainSchemasList.get<
      DomainSchemasConfigPropsI<DocumentKey, DocumentMain, DocumentProject, DocumentFilter, DocumentCreate>
    >({ configName: domSchemasConfigName, appOptions })

    const { domSchemaProject, domSchemaFilter, domSchemaCreate } = domSchemas.config
    if (!domSchemaCreate) throw new ErrorCustomImpossible('!domSchemaCreate')

    if (!filterUtil.isFilterSchema(filterSchema, domSchemaFilter)) throw new ErrorCustomType('')

    if (!domainSchemaUtil.isDocumentPick(update, domSchemaCreate, update)) throw new ErrorCustomType('')

    if (!projectionUtil.isProjection(project, domSchemaProject)) throw new ErrorCustomType('')

    // 3. Прочие предварительные шаги.
    type DocRes = Pick<DocumentProject, ProjectFields>

    const tabqRes: Partial<TabqueryResultDocsI<DocRes>['tabqRes']> = {}

    // 5. Добавление операции в транзакцию приложения.
    if (this.appOptions.trnapp) {
      const { applerOperId } = this.appOptions.trnapp.pushOperFromApp(
        { app: this, method: this.update<ProjectFields, KeysFilter, KeysCreate>, args: [{ filterSchema, update, project }] }
      )

      // Постпроцессор для обработки результата после коммита транзакции.
      this.appOptions.trnapp.resultProcessors.push(genResultPostprocessor<DocumentProject, ProjectFields>(
        { tabqRes, applerOperId, domSchemaProject, project }
      ))
    }

    // 6. Преобразования.
    const convertedDocs = await validateAndConvert({ docs: [update], domSchema: domSchemaCreate })
    const convertedDoc = convertedDocs[0] || errorImpossible('')

    // 7. Результат моделирования.
    tabqRes.rows = []
    tabqRes.rowCount = 0

    // 8. Добавление операции в транзакцию запроса к БД.
    if (this.appOptions.trntab) {
      const args: Parameters<typeof this.update<ProjectFields, KeysFilter, KeysCreate>> = [{
        filterSchema,
        update: convertedDoc,
        project
      }]
      const { applerOperId } = this.appOptions.trntab.pushOperFromApp({ app: this, method: this.update<ProjectFields, KeysFilter, KeysCreate>, args })

      // Постпроцессор для обработки результата после коммита транзакции.
      this.appOptions.trntab.resultProcessors.push(genResultPostprocessor<DocumentProject, ProjectFields>(
        { tabqRes, applerOperId, domSchemaProject, project }
      ))
    }

    return { tabqRes: typifyNotPartial(tabqRes, 2) }
  }

  async delete<
    ProjectFields extends keyof DocumentProject,
    KeysFilter extends keyof DocumentFilter,
  >(
    { filterSchema, project }
      : FilterSchemaI<DocumentFilter, KeysFilter>
      & ProjectionI<DocumentProject, ProjectFields>
  ): Promise<TabqueryResultDocsI<Pick<DocumentProject, ProjectFields>>> {
    // 1. Инициализация.
    const { tabExpression, domSchemasConfigName, appOptions } = this

    // 2. Проверки аргументов функции.
    if (typeof tabExpression !== 'string') throw new ErrorCustomType('typeof tabExpression !== string')
    if (typeof domSchemasConfigName !== 'string') throw new ErrorCustomType('typeof domSchemasConfigName !== string')
    if (Object.keys(filterSchema).length < 1) throw new ErrorCustomType('')

    const domSchemas: ConfigPropsI<
      DomainSchemasConfigPropsI<DocumentKey, DocumentMain, DocumentProject, DocumentFilter, DocumentCreate>
    > = await domainSchemasList.get<
      DomainSchemasConfigPropsI<DocumentKey, DocumentMain, DocumentProject, DocumentFilter, DocumentCreate>
    >({ configName: domSchemasConfigName, appOptions })

    const { domSchemaProject, domSchemaFilter } = domSchemas.config

    if (!filterUtil.isFilterSchema(filterSchema, domSchemaFilter)) throw new ErrorCustomType('')

    if (!projectionUtil.isProjection(project, domSchemaProject)) throw new ErrorCustomType('')

    // 3. Прочие предварительные шаги.
    type DocRes = Pick<DocumentProject, ProjectFields>

    const tabqRes: Partial<TabqueryResultDocsI<DocRes>['tabqRes']> = {}

    // 5. Добавление операции в транзакцию приложения.
    if (this.appOptions.trnapp) {
      const { applerOperId } = this.appOptions.trnapp.pushOperFromApp(
        { app: this, method: this.delete<ProjectFields, KeysFilter>, args: [{ filterSchema, project }] }
      )

      // Постпроцессор для обработки результата после коммита транзакции.
      this.appOptions.trnapp.resultProcessors.push(genResultPostprocessor<DocumentProject, ProjectFields>(
        { tabqRes, applerOperId, domSchemaProject, project }
      ))
    }

    // 6. Преобразования.
    // ...

    // 7. Результат моделирования.
    tabqRes.rows = []
    tabqRes.rowCount = 0

    // 8. Добавление операции в транзакцию запроса к БД.
    if (this.appOptions.trntab) {
      const args: Parameters<typeof this.delete<ProjectFields, KeysFilter>> = [{ filterSchema, project }]
      const { applerOperId } = this.appOptions.trntab.pushOperFromApp({ app: this, method: this.delete<ProjectFields, KeysFilter>, args })

      // Постпроцессор для обработки результата после коммита транзакции.
      this.appOptions.trntab.resultProcessors.push(genResultPostprocessor<DocumentProject, ProjectFields>(
        { tabqRes, applerOperId, domSchemaProject, project }
      ))
    }

    return { tabqRes: typifyNotPartial(tabqRes, 2) }
  }
}

////////////////////////////////////////////////////////////////////////////////
// Util. Private.
////////////////////////////////////////////////////////////////////////////////
async function validateAndConvert<DocumentCreate, ProjectFields extends keyof DocumentCreate>(
  { docs, domSchema }
    : { docs: Pick<DocumentCreate, ProjectFields>[] }
    & DomainSchemaI<DocumentCreate>
) {
  for (const doc of docs) {
    domainSchemaUtil.applyDomainValidatorToDoc(domSchema, doc)
  }

  const convertedDocs: Pick<DocumentCreate, ProjectFields>[] = []
  for (const doc of docs) {
    const convertedDoc = Object.assign({}, doc)
    await domainSchemaUtil.applyDomainConverterToDoc(domSchema, convertedDoc)
    convertedDocs.push(convertedDoc)
  }

  return convertedDocs
}

function genResultPostprocessor<DocumentProject, ProjectFields extends keyof DocumentProject>(
  { tabqRes, applerOperId, domSchemaProject, project }
    : { tabqRes: Partial<TabqueryResultDocsI<Pick<DocumentProject, ProjectFields>>['tabqRes']> }
    & ApplicaterOperIdI
    & { domSchemaProject: DomainSchemaT<DocumentProject> }
    & ProjectionAnyI<DocumentProject, ProjectFields>
) {
  return async (
    { applerRess }: ApplicaterOperListRessI<unknown>
  ) => {
    const resUntyped: unknown = applerRess.get(applerOperId)

    const resTyped: TabqueryResultDocsI<Pick<DocumentProject, ProjectFields>> = typifyTabqueryResultDocsI({
      something: resUntyped as TabqueryResultDocsI<Pick<DocumentProject, ProjectFields>>,
      domSchemaProject,
      project
    })

    const { rows, rowCount } = resTyped.tabqRes
    tabqRes.rows = rows
    tabqRes.rowCount = rowCount
  }
}
function typifyTabqueryResultDocsI<DocumentProject, ProjectFields extends keyof DocumentProject>(
  { something, domSchemaProject, project }
    // : { something: unknown }
    // : { something: { testError: string } }
    : { something: TabqueryResultDocsI<Pick<DocumentProject, ProjectFields>> }
    & { domSchemaProject: DomainSchemaT<DocumentProject> }
    & ProjectionAnyI<DocumentProject, ProjectFields>
): TabqueryResultDocsI<Pick<DocumentProject, ProjectFields>> {
  if (!hasProperties2(something, ['tabqRes'] as const)) throw new ErrorCustomType('')
  const tabqRes = something['tabqRes']

  if (!hasProperties2(tabqRes, ['rows', 'rowCount'] as const)) throw new ErrorCustomType('')
  const rows: unknown = tabqRes['rows']
  const rowCount: unknown = tabqRes['rowCount']

  if (!domainSchemaUtil.isDocumentPickArr(rows, domSchemaProject, project)) throw new ErrorCustomType('')
  if (typeof rowCount !== 'number') throw new ErrorCustomType('  ')

  return { tabqRes: { rows, rowCount } }
}

////////////////////////////////////////////////////////////////////////////////
// Util. Public.
////////////////////////////////////////////////////////////////////////////////
