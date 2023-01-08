import { ApplicationOptions } from './application.js'
import { DomainSchemaI, DomainSchemasConfigI, domainSchemaUtil } from './domain_schema.js'
import { ErrorCustomImpossible, ErrorCustomType, ErrorCustomUnclassified, errorImpossible } from './error.js'
import { FilterI, FilterSchemaI, filterUtil } from './filter.js'
import { TabqueryResultDocsI, TabqueryRW, TabqueryTabExpressionI } from './tabquery.js'
import { Tabrep, TabrepRowIdCounterI, TabrepRowIdT, tabrepRowTechnicalPropsDummy, TabrepRowTechnicalPropsI, TABREP_COMMITS, TABREP_INFORMS } from './tabrep.js'
import { TabrepCrudAbstract } from './tabrep_crud_abstract.js'
import { TabrepFront } from './tabrep_front.js'
import { TransactionClient } from './transaction.js'
import { genProjectionFromDoc, typifyNotPartial } from './util.js'

////////////////////////////////////////////////////////////////////////////////
// Tabquery. Tabrep CRUD.
////////////////////////////////////////////////////////////////////////////////
export class TabqueryTabrepCrud<
  DocumentKey,
  DocumentMain extends DocumentKey & DocumentProject & DocumentFilter & DocumentCreate,
  DocumentProject extends DocumentKey,
  DocumentFilter extends DocumentKey,
  DocumentCreate
> implements TabrepCrudAbstract<DocumentKey, DocumentMain, DocumentProject, DocumentFilter, DocumentCreate> {
  static { }
  public busyPromise: Promise<void> | null = null
  private readonly appOptions: ApplicationOptions['appOptions']

  private readonly front: TabrepFront<DocumentKey, DocumentMain, DocumentProject, DocumentFilter, DocumentCreate>
  private readonly domSchemasConfig: DomainSchemasConfigI<
    DocumentKey, DocumentMain, DocumentProject, DocumentFilter, DocumentCreate
  >['domSchemasConfig']
  private readonly rows: Map<TabrepRowIdT, TabrepRowTechnicalPropsI & DocumentMain> = new Map()
  private rowId: TabrepRowIdCounterI['rowId']

  private readonly tabExpression: TabqueryTabExpressionI['tabExpression']
  private readonly trnstack = new TabsourceTransactionStack<DocumentCreate>()

  constructor(
    { tabExpression, tabrep, appOptions }
      : TabqueryTabExpressionI
      & { tabrep: Tabrep<DocumentKey, DocumentMain, DocumentProject, DocumentFilter, DocumentCreate> }
      & ApplicationOptions
  ) {
    this.appOptions = appOptions
    this.tabExpression = tabExpression

    const { front, domSchemasConfig, rows, rowId } = tabrep
    this.front = front
    this.domSchemasConfig = domSchemasConfig
    this.rows = rows
    this.rowId = rowId
  }

  // Commit.
  async commitAsync(): Promise<void> {
    if (this.busyPromise) throw new ErrorCustomUnclassified('busyPromise')
    this.busyPromise = this.commitAsync_()
    try {
      await this.busyPromise
    } finally { this.busyPromise = null }
  }

  private async commitAsync_(): Promise<void> {
    const { tabExpression, appOptions } = this
    const { domSchemasConfigName, domSchemaKey, domSchemaMain, domSchemaProject, domSchemaCreate } = this.domSchemasConfig
    if (!domSchemaCreate) throw new ErrorCustomImpossible('!domSchemaCreate')

    // Подготовка данных для табквери.
    const creates: typeof this.rows = new Map()
    const credels: typeof this.rows = new Map()
    const updates: typeof this.rows = new Map()
    const deletes: typeof this.rows = new Map()

    for (const [rowId, tabsrcRow] of this.rows) {
      if (tabsrcRow._commit === '') { continue }
      else if (tabsrcRow._commit === TABREP_COMMITS.create) { creates.set(rowId, tabsrcRow) }
      else if (tabsrcRow._commit === TABREP_COMMITS.credel) { credels.set(rowId, tabsrcRow) }
      else if (tabsrcRow._commit === TABREP_COMMITS.update) { updates.set(rowId, tabsrcRow) }
      else if (tabsrcRow._commit === TABREP_COMMITS.upddel) { deletes.set(rowId, tabsrcRow) }
      else if (tabsrcRow._commit === TABREP_COMMITS.delete) { deletes.set(rowId, tabsrcRow) }
      else throw new ErrorCustomImpossible('incorrect commit')
    }

    if (
      creates.size < 1 && credels.size < 1 && updates.size < 1 && deletes.size < 1
    ) throw new ErrorCustomUnclassified('creates.size < 1 && credels.size < 1 && updates.size < 1 && deletes.size < ')

    ////////////////////////////////////////////////////////////////////////////
    // Формирование запросов.
    ////////////////////////////////////////////////////////////////////////////
    // Формирование запросов из данных. Create.
    const createRequests: Map<TabrepRowIdT[], DocumentCreate[]> = new Map()
    const createArray = Array.from(creates.values())
      .map((tabsrcRow) => genExtractDocFromMainDoc({ docMain: tabsrcRow, domSchema: domSchemaCreate }))
    if (createArray.length > 0) createRequests.set(Array.from(creates.keys()), createArray)

    // Формирование запросов из данных. Update.
    const updateRequests: Map<
      TabrepRowIdT,
      FilterSchemaI<DocumentFilter, keyof DocumentKey> & { update: Partial<Pick<DocumentCreate, keyof DocumentCreate>> }
    > = new Map()
    const trnUpdates = this.trnstack.getUpdates()
    for (const [rowId, tabsrcRow] of updates.entries()) {
      const trnUpdate = trnUpdates.get(rowId) || errorImpossible('')
      const { newVals } = trnUpdate

      for (const key in newVals) if (newVals[key] !== tabsrcRow[key]) throw new ErrorCustomImpossible('')

      const keyDoc: Pick<DocumentFilter, keyof DocumentKey> = genExtractDocFromMainDoc({ docMain: tabsrcRow, domSchema: domSchemaKey })
      if (typeof keyDoc !== 'object' || !keyDoc) throw new ErrorCustomType('')


      // const { filterSchema } = filtersource.getFilterSchema()
      // await tabsource.init<keyof typeof filterSchema>({ filterSchema: filterSchema as UndoPartial<typeof filterSchema> })

      updateRequests.set(rowId, { filterSchema: keyDoc, update: newVals })
    }

    // Формирование запросов из данных. Delete.
    const deleteRequests: Map<TabrepRowIdT, Pick<DocumentFilter, keyof DocumentKey>> = new Map()
    for (const [rowId, tabsrcRow] of deletes.entries()) {
      const keyDoc: Pick<DocumentFilter, keyof DocumentKey> = genExtractDocFromMainDoc({ docMain: tabsrcRow, domSchema: domSchemaKey })
      // if (typeof keyDoc !== 'object' || !keyDoc) throw new ErrorCustomType('')
      deleteRequests.set(rowId, keyDoc)
    }

    ////////////////////////////////////////////////////////////////////////////
    // Табквери.
    ////////////////////////////////////////////////////////////////////////////
    if (appOptions.trnapp) throw new ErrorCustomType('')

    const createRess: Map<TabrepRowIdT[], TabqueryResultDocsI<Pick<DocumentProject, keyof DocumentProject>>> = new Map()
    const updateRess: Map<TabrepRowIdT, TabqueryResultDocsI<Pick<DocumentProject, keyof DocumentProject>>> = new Map()
    const deleteRess: Map<TabrepRowIdT, TabqueryResultDocsI<Pick<DocumentProject, keyof DocumentProject>>> = new Map()

    try {
      appOptions.trnapp = new TransactionClient()

      const tabquery = new TabqueryRW<
        DocumentKey, DocumentMain, DocumentProject, DocumentFilter, DocumentCreate
      >({ tabExpression, domSchemasConfigName, appOptions })

      for (const [key, create] of createRequests.entries()) {
        const createRes = await tabquery.create<keyof DocumentProject>({
          create,
          project: genProjectionFromDoc<DocumentProject, keyof DocumentProject, true>(domSchemaProject, true)
        })
        createRess.set(key, createRes)
      }

      for (const [key, updRequest] of updateRequests.entries()) {
        const { filterSchema, update } = updRequest
        const updateRes = await tabquery.update<keyof DocumentProject, keyof DocumentKey, keyof DocumentCreate>({
          filterSchema,
          update: typifyNotPartial(update, Object.keys(update).length),
          project: genProjectionFromDoc<DocumentProject, keyof DocumentProject, true>(domSchemaProject, true)
        })
        updateRess.set(key, updateRes)
      }

      for (const [key, filterSchema] of deleteRequests) {
        const deleteRes = await tabquery.delete<keyof DocumentProject, keyof DocumentKey>({
          filterSchema,
          project: genProjectionFromDoc<DocumentProject, keyof DocumentProject, true>(domSchemaProject, true)
        })
        deleteRess.set(key, deleteRes)
      }

      await appOptions.trnapp.commit({ appOptions })
      creates.forEach((tabsrcRow) => { tabsrcRow._commit = ''; tabsrcRow._inform = TABREP_INFORMS.saved })
      updates.forEach((tabsrcRow) => { tabsrcRow._commit = ''; tabsrcRow._inform = TABREP_INFORMS.saved })
      deletes.forEach((tabsrcRow) => { tabsrcRow._commit = ''; tabsrcRow._inform = TABREP_INFORMS.saved })
    } catch (error) {
      throw error
    } finally { delete appOptions.trnapp }

    ////////////////////////////////////////////////////////////////////////////
    // Обработка результата.
    ////////////////////////////////////////////////////////////////////////////
    // Обработка результата коммита табквери. Create.
    const docMainDummy: DocumentMain = domainSchemaUtil.genDummyDocument({ domSchema: domSchemaMain })
    for (const rowIds of createRequests.keys()) {
      const reqResult = createRess.get(rowIds)
      if (!reqResult) throw new ErrorCustomType('')

      const createdDocs = reqResult.tabqRes.rows
      const oldDocs = Array.from(creates.values())
      if (createdDocs.length !== oldDocs.length) throw new ErrorCustomType('')

      for (let i = 0; i < oldDocs.length; i++) {
        const createdDoc = createdDocs[i]
        if (!createdDoc) throw new ErrorCustomImpossible('')

        const oldDoc = oldDocs[i]
        if (!oldDoc) throw new ErrorCustomImpossible('')

        Object.assign(oldDoc, docMainDummy, createdDoc)
      }
    }

    // Обработка результата коммита табквери. Update.
    for (const rowId of updateRequests.keys()) {
      const reqResult = updateRess.get(rowId)
      if (!reqResult) throw new ErrorCustomType('')

      const updatedDocs = reqResult.tabqRes.rows
      if (updatedDocs.length !== 1) throw new ErrorCustomType('')

      const updatedDoc = updatedDocs[0]
      if (!updatedDoc) throw new ErrorCustomType('')

      if (Object.keys(updatedDoc).length !== Object.keys(domSchemaProject).length) throw new ErrorCustomType('')

      const oldDoc = updates.get(rowId)
      if (!oldDoc) throw new ErrorCustomImpossible('')
      Object.assign(oldDoc, updatedDoc)
    }

    // Обработка результата коммита табквери. Delete.
    for (const rowId of deleteRequests.keys()) {
      const reqResult = deleteRess.get(rowId)
      if (!reqResult) throw new ErrorCustomType('')

      const deletedDocs = reqResult.tabqRes.rows
      if (deletedDocs.length !== 1) throw new ErrorCustomType('')

      const deletedDoc = deletedDocs[0]
      if (!deletedDoc) throw new ErrorCustomType('')

      if (Object.keys(deletedDoc).length !== Object.keys(domSchemaProject).length) throw new ErrorCustomType('')

      const oldDoc = deletes.get(rowId)
      if (!oldDoc) throw new ErrorCustomImpossible('')
      Object.assign(oldDoc, deletedDoc)

      this.rows.delete(rowId)
    }

    if (deleteRequests.size > 0) {
      for (const rowId of credels.keys()) this.rows.delete(rowId)
    }

    ////////////////////////////////////////////////////////////////////////////
    // Обновление фронта.
    ////////////////////////////////////////////////////////////////////////////
    if (creates.size > 0) this.front.update({ rows: creates })
    if (updates.size > 0) this.front.update({ rows: updates })
    if (deletes.size > 0) this.front.delete({ filter: { $in: Array.from(deletes.keys()) } })
    if (deletes.size > 0 && credels.size > 0) this.front.delete({ filter: { $in: Array.from(credels.keys()) } })

    ////////////////////////////////////////////////////////////////////////////
    // Util. Local.
    ////////////////////////////////////////////////////////////////////////////
    function genExtractDocFromMainDoc<DocumentMain extends Document, Document>(
      { docMain, domSchema }: { docMain: DocumentMain } & DomainSchemaI<Document>
    ): Pick<DocumentMain, keyof Document> {
      const partialDoc: Partial<Pick<DocumentMain, keyof Document>> = {}
      for (const key in domSchema) partialDoc[key] = docMain[key]
      return typifyNotPartial(partialDoc, Object.keys(domSchema).length)
    }
  }

  // Create.
  createEmptyRow(): void {
    const { domSchemaCreate } = this.domSchemasConfig
    if (!domSchemaCreate) throw new ErrorCustomImpossible('!domSchemaCreate')

    const docCreateDummy: DocumentCreate = domainSchemaUtil.genDummyDocument({ domSchema: domSchemaCreate })
    this.create({ create: [docCreateDummy] })
  }

  create({ create }: { create: DocumentCreate[] }): void {
    const { domSchemaMain } = this.domSchemasConfig

    const docMainDummy: DocumentMain = domainSchemaUtil.genDummyDocument({ domSchema: domSchemaMain })
    const tabsrcRows: typeof this.rows = new Map()

    for (const doc of create) {
      const tabsrcRow: TabrepRowTechnicalPropsI & DocumentMain = {
        ...tabrepRowTechnicalPropsDummy, ...docMainDummy, ...doc
      }
      tabsrcRow._commit = TABREP_COMMITS.create
      tabsrcRows.set(this.rowId.counter++, tabsrcRow)
    }

    // Обновляем стек табсорс транзакций.
    const { tabsrcTrn }: TabsourceTransactionI<DocumentCreate> = { tabsrcTrn: [] }
    const { tabsrcTrnOper }: TabsourceTransactionOperT<DocumentCreate> = {
      tabsrcTrnOper: { rowIds: Array.from(tabsrcRows.keys()), commit: TABREP_COMMITS.create }
    }
    tabsrcTrn.push(tabsrcTrnOper)
    this.trnstack.push({ tabsrcTrn })

    // Обновляем строки табсорс и фронт.
    tabsrcRows.forEach((value, key) => this.rows.set(key, value))
    this.front.create({ rows: tabsrcRows })
  }

  // Read.
  // @ts-ignore
  read({ filter }: FilterI<TabrepRowIdT>): typeof this.rows {
    const result: typeof this.rows = new Map()
    for (const [rowId, tabsrcRow] of this.rows.entries()) {
      if (!filterUtil.isInFilter(rowId, filter)) continue
      result.set(rowId, tabsrcRow)
    }
    return result
  }

  // Update.
  update({ filter, update }: FilterI<TabrepRowIdT> & { update: Partial<DocumentCreate> }): void {
    const tabsrcRows: typeof this.rows = new Map()
    const { tabsrcTrn }: TabsourceTransactionI<DocumentCreate> = { tabsrcTrn: [] }

    for (const [rowId, tabsrcRow] of this.rows.entries()) {
      if (!filterUtil.isInFilter(rowId, filter)) continue

      if (tabsrcRow._commit === '') { } // Do nothing.
      else if (tabsrcRow._commit === TABREP_COMMITS.create) { } // Do nothing. 
      else if (tabsrcRow._commit === TABREP_COMMITS.credel) { throw new ErrorCustomUnclassified('') }
      else if (tabsrcRow._commit === TABREP_COMMITS.delete) { throw new ErrorCustomUnclassified('') }
      else if (tabsrcRow._commit === TABREP_COMMITS.update) { } // Do nothing. 
      else if (tabsrcRow._commit === TABREP_COMMITS.upddel) { throw new ErrorCustomUnclassified('') }
      else throw new ErrorCustomType('incorrect commit')

      tabsrcRows.set(rowId, tabsrcRow)

      const oldVals: Partial<DocumentCreate> = {}
      for (const key in update) oldVals[key] = tabsrcRow[key]
      const { tabsrcTrnOper }: TabsourceTransactionOperT<DocumentCreate> = {
        tabsrcTrnOper: { rowIds: [rowId], commit: TABREP_COMMITS.update, oldVals, newVals: update }
      }
      tabsrcTrn.push(tabsrcTrnOper)
    }

    for (const tabsrcRow of tabsrcRows.values()) {
      if (tabsrcRow._commit === '') { tabsrcRow._commit = TABREP_COMMITS.update; tabsrcRow._inform = '' }
      else if (tabsrcRow._commit === TABREP_COMMITS.create) { }
      else if (tabsrcRow._commit === TABREP_COMMITS.credel) { console.error('Ошибка:\n', new ErrorCustomUnclassified('')); continue }
      else if (tabsrcRow._commit === TABREP_COMMITS.delete) { console.error('Ошибка:\n', new ErrorCustomUnclassified('')); continue }
      else if (tabsrcRow._commit === TABREP_COMMITS.update) { }
      else if (tabsrcRow._commit === TABREP_COMMITS.upddel) { console.error('Ошибка:\n', new ErrorCustomUnclassified('')); continue }
      else { console.error('Ошибка:\n', new ErrorCustomType('incorrect commit')); continue }
      // Обновляем строки табсорс.
      Object.assign(tabsrcRow, update)
    }

    // Обновляем стек табсорс транзакций и фронт.
    this.trnstack.push({ tabsrcTrn })
    this.front.update({ rows: tabsrcRows })
  }

  // Delete.
  delete({ filter }: FilterI<TabrepRowIdT>): void {
    const rowIds: TabrepRowIdT[] = [] // Общий список обновлений и удалений.
    const updates: typeof this.rows = new Map()
    const deletes: TabrepRowIdT[] = []

    for (const [rowId, tabsrcRow] of this.rows.entries()) {
      if (!filterUtil.isInFilter(rowId, filter)) continue

      if (tabsrcRow._commit === '') { updates.set(rowId, tabsrcRow) }
      else if (tabsrcRow._commit === TABREP_COMMITS.create) { deletes.push(rowId) }
      else if (tabsrcRow._commit === TABREP_COMMITS.credel) { throw new ErrorCustomType('') }
      else if (tabsrcRow._commit === TABREP_COMMITS.delete) { continue }
      else if (tabsrcRow._commit === TABREP_COMMITS.update) { updates.set(rowId, tabsrcRow) }
      else if (tabsrcRow._commit === TABREP_COMMITS.upddel) { throw new ErrorCustomType('') }
      else throw new ErrorCustomType('incorrect commit')

      rowIds.push(rowId)
    }

    const { tabsrcTrn }: TabsourceTransactionI<DocumentCreate> = { tabsrcTrn: [] }
    const { tabsrcTrnOper }: TabsourceTransactionOperT<DocumentCreate> = {
      tabsrcTrnOper: { rowIds, commit: TABREP_COMMITS.delete }
    }
    tabsrcTrn.push(tabsrcTrnOper)

    for (const rowId of rowIds) {
      const tabsrcRow = this.rows.get(rowId)
      if (!tabsrcRow) { console.error('Ошибка:\n', new ErrorCustomType('')); continue }

      if (tabsrcRow._commit === '') { tabsrcRow._commit = TABREP_COMMITS.delete; tabsrcRow._inform = '' }
      else if (tabsrcRow._commit === TABREP_COMMITS.create) { tabsrcRow._commit = TABREP_COMMITS.credel }
      else if (tabsrcRow._commit === TABREP_COMMITS.credel) { console.error('Ошибка:\n', new ErrorCustomType('')) }
      else if (tabsrcRow._commit === TABREP_COMMITS.delete) { continue }
      else if (tabsrcRow._commit === TABREP_COMMITS.update) { tabsrcRow._commit = TABREP_COMMITS.upddel }
      else if (tabsrcRow._commit === TABREP_COMMITS.upddel) { console.error('Ошибка:\n', new ErrorCustomType('')) }
      else { console.error('Ошибка:\n', new ErrorCustomType('incorrect commit')) }
    }

    // Обновляем стек табсорс транзакций и фронт.
    this.trnstack.push({ tabsrcTrn })
    this.front.update({ rows: updates })
    this.front.delete({ filter: { $in: deletes } })
  }
}

////////////////////////////////////////////////////////////////////////////////
// Transaction.
////////////////////////////////////////////////////////////////////////////////
type TabsourceTransactionOperPropsT<DocumentCreate> = {
  rowIds: TabrepRowIdT[]
} & ({
  commit: typeof TABREP_COMMITS['create'] | typeof TABREP_COMMITS['delete']
} | {
  commit: typeof TABREP_COMMITS['update']
  oldVals: Partial<DocumentCreate>
  newVals: Partial<DocumentCreate>
})

// Операция.
type TabsourceTransactionOperT<DocumentCreate> = {
  tabsrcTrnOper: TabsourceTransactionOperPropsT<DocumentCreate>
}

// Транзакция - это массив операций.
interface TabsourceTransactionI<DocumentCreate> {
  tabsrcTrn: TabsourceTransactionOperT<DocumentCreate>['tabsrcTrnOper'][]
}

// Массив транзакций.
interface TabsourceTransactionsI<DocumentCreate> {
  tabsrcTrns: TabsourceTransactionI<DocumentCreate>['tabsrcTrn'][]
}

class TabsourceTransactionStack<DocumentCreate> {
  private readonly stack: TabsourceTransactionsI<DocumentCreate>['tabsrcTrns'] = [] // Массив транзакций.
  private shift: number = 0

  clear(): void {
    this.shift = 0
    this.stack.length = 0
  }

  getUpdates(): Map<TabrepRowIdT, { oldVals: Partial<DocumentCreate>, newVals: Partial<DocumentCreate> }> {
    const updates: Map<TabrepRowIdT, { oldVals: Partial<DocumentCreate>, newVals: Partial<DocumentCreate> }> = new Map()

    for (const trnsac of this.stack) {
      for (const oper of trnsac) {
        if (oper.commit !== 'update') continue

        const { oldVals, newVals } = oper
        if (Object.keys(oldVals).length !== Object.keys(newVals).length) throw new ErrorCustomImpossible('')

        for (const rowId of oper.rowIds) {
          let update = updates.get(rowId)
          if (!update) { update = { oldVals: {}, newVals: {} }; updates.set(rowId, update) }

          for (const key in oldVals) {
            const oldVal = oldVals[key]
            const newVal = newVals[key]

            const updateNewVals = update.newVals
            if (key in updateNewVals) if (updateNewVals[key] !== oldVal) throw new ErrorCustomImpossible('')

            update.newVals[key] = newVal
          }
        }
      }
    }

    return updates
  }

  commit(): void { throw new ErrorCustomUnclassified('not implemented') }

  private slice(len: number): TabsourceTransactionsI<DocumentCreate> {
    if (!Number.isInteger(len)) throw new ErrorCustomType('')
    if (len === 0) throw new ErrorCustomType('')

    const borderLeft = len < 0 ? len + this.shift : this.shift
    const borderRigh = len > 0 ? len + this.shift : this.shift

    if (borderLeft < 0) throw new ErrorCustomType('')
    if (borderRigh > this.stack.length) throw new ErrorCustomType('')

    let tabsrcTrns: TabsourceTransactionsI<DocumentCreate>['tabsrcTrns']

    if (borderLeft > 0) {
      tabsrcTrns = this.stack.slice(-borderRigh, -borderLeft)
    } else if (borderLeft === 0) {
      tabsrcTrns = this.stack.slice(-borderRigh)
    } else throw new ErrorCustomType('')

    this.shift += len
    return { tabsrcTrns }
  }

  push({ tabsrcTrn }: TabsourceTransactionI<DocumentCreate>): void {
    if (this.shift < 0) throw new ErrorCustomType('')
    if (!Number.isInteger(this.shift)) throw new ErrorCustomType('')
    if (this.shift > this.stack.length) throw new ErrorCustomType('')

    if (this.shift > 0) {
      this.stack.splice(-this.shift, this.shift)
      this.shift = 0
    }

    this.stack.push(tabsrcTrn)
  }

  undo({ len }: { len?: number } = {}): TabsourceTransactionsI<DocumentCreate> {
    if (len === undefined) len = 1
    if (len < 1) throw new ErrorCustomType('')
    return this.slice(len)
  }

  redo({ len }: { len?: number } = {}): TabsourceTransactionsI<DocumentCreate> {
    if (len === undefined) len = 1
    if (len < 1) throw new ErrorCustomType('')
    return this.slice(-len)
  }
}
