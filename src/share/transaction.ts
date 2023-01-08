import { DocumentPrimitiveT } from './document.js'
import { ErrorCustomSyntax } from './error.js'
import { settings } from './settings.js'
import { ApplicationOptions } from './application.js'
import { APPLICATER_STATUSES, applicaterOperListUtil, ApplicaterOperListRessI, ApplicaterOperListWithStatus, ApplicaterOperIdI } from './applicater.js'
import { ConstructorAnyT, MethodAnyT } from './util.js'
import { TabqueryResultDocsI } from './tabquery.js'

////////////////////////////////////////////////////////////////////////////////
// Transaction.
////////////////////////////////////////////////////////////////////////////////
abstract class Transaction<Result> extends ApplicaterOperListWithStatus {
  readonly resultProcessors: (
    ({ applerRess }: ApplicaterOperListRessI<Result>) => Promise<void>
  )[] = []

  abstract committer(
    { applerList, appOptions }: Pick<Transaction<Result>, 'applerList'> & ApplicationOptions
  ): Promise<ApplicaterOperListRessI<Result>>


  async processResults({ applerRess }: ApplicaterOperListRessI<Result>) {
    for (const resultProcessor of this.resultProcessors) {
      resultProcessor({ applerRess })
    }
  }

  // Statuses: open -> committing.
  async commit(
    { appOptions }: ApplicationOptions
  ): Promise<void> {
    if (this.status !== APPLICATER_STATUSES.open) throw new ErrorCustomSyntax('this.status !== open')
    this.status = APPLICATER_STATUSES.committing

    let applerRess: ApplicaterOperListRessI<Result>['applerRess']

    try {
      const { applerList }: Pick<TransactionTabquery, 'applerList'> = this;

      ({ applerRess } = await this.committer({ applerList, appOptions }))
      this.setStatusCommitted()
    } catch (error) {
      this.setStatusRolledback()
      throw error
    }

    for (const resultProcessor of this.resultProcessors) {
      await resultProcessor({ applerRess })
    }
  }
}

////////////////////////////////////////////////////////////////////////////////
// Transaction. Client.
////////////////////////////////////////////////////////////////////////////////
export class TransactionClient extends Transaction<unknown> {
  async committer(
    { applerList, appOptions }: Pick<Transaction<unknown>, 'applerList'> & ApplicationOptions
  ): Promise<ApplicaterOperListRessI<unknown>> {
    const result = await applicaterOperListUtil.fetchFromClient({ applerList, appOptions })

    const { applerResTuples } = result
    const applerRess = new Map(applerResTuples)

    return { applerRess }
  }

  //////////////////////////////////////////////////////////////////////////////
  // Transaction. Client. Special features.
  //////////////////////////////////////////////////////////////////////////////
  isFull: boolean = false
  flush() {
    this.isFull = false
    return this
  }

  // Statuses: open -> open.
  pushOperFromApp<
    Constr extends ConstructorAnyT, Method extends MethodAnyT
  // @ts-ignore
  >(...args: Parameters<typeof this.pushOperFromAppCheckStatus_<Constr, Method>>): ApplicaterOperIdI {
    if (this.isFull) return { applerOperId: '' }
    return this.pushOperFromAppCheckStatus_(...args)
  }
}

////////////////////////////////////////////////////////////////////////////////
// Transaction. Tabquery.
////////////////////////////////////////////////////////////////////////////////
type ResultT = TabqueryResultDocsI<Pick<DocumentPrimitiveT, string>>

export interface TransactionTabqueryCommitterAbstractI {
  commit(
    { applerList, appOptions }: Pick<TransactionTabquery, 'applerList'> & ApplicationOptions
  ): Promise<ApplicaterOperListRessI<ResultT>>
}

export class TransactionTabquery extends Transaction<ResultT> {
  pushOperFromApp = this.pushOperFromAppCheckStatus_

  async committer(
    { applerList, appOptions }
      : Pick<Transaction<ResultT>, 'applerList'> & ApplicationOptions
  ): Promise<ApplicaterOperListRessI<ResultT>> {
    if (!settings.transactionTabqueryCommitterDriver) throw new ErrorCustomSyntax('!settings.driverDbTablerCommit')
    const { applerRess }: ApplicaterOperListRessI<ResultT> = await settings.transactionTabqueryCommitterDriver.commit({ applerList, appOptions })

    return { applerRess }
  }
}
