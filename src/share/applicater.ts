import { DRIVER_API_CONSTS } from './driver_api_consts.js'
import { ErrorCustomSyntax, ErrorCustomType, ErrorCustomUnclassified } from './error.js'
import { kbServer, KbServerRequestI } from './kbserver.js'
import { ObjectId } from './object_id.js'
import { TransactionClient } from './transaction.js'
import { typifyArrayWithTypeGuard, typifyTuple2 } from './util.js'
import { Application, ApplicationOptions } from './application.js'
import { ConstructorAnyT, MethodAnyT } from './util.js'

type ApplicaterOperOriginPropsAnyT = ApplicaterOperOriginProps<ConstructorAnyT, MethodAnyT>
type ApplicaterOperFromClassPropsI<
  Constr extends ConstructorAnyT,
  Method extends MethodAnyT
> = Pick<
  ApplicaterOperOriginProps<Constr, Method>,
  'ctorArgs' | 'ctorFunc' | 'methArgs' | 'methFunc'
>

// @ts-ignore
interface ApplicaterOperOriginI<
  Constr extends ConstructorAnyT,
  Method extends MethodAnyT
> { applerOperOrig: ApplicaterOperOriginProps<Constr, Method> }

class ApplicaterOperOriginProps<
  Constr extends ConstructorAnyT,
  Method extends MethodAnyT
> {
  readonly ctorArgs: ConstructorParameters<Constr>
  readonly ctorFunc: Constr
  readonly methArgs: Parameters<Method>
  readonly methFunc: Method

  constructor(
    { ctorArgs, ctorFunc, methArgs, methFunc }: ApplicaterOperFromClassPropsI<Constr, Method>
  ) {
    this.ctorArgs = ctorArgs
    this.ctorFunc = ctorFunc
    this.methArgs = methArgs
    this.methFunc = methFunc
  }

  toJSON() {
    return this.toApplerOper()
  }

  toApplerOper(): ApplicaterOperPropsI<Constr, Method> {
    const { ctorArgs, methArgs } = this
    const ctorName = this.ctorFunc.name
    const methName = this.methFunc.name
    return { ctorArgs, ctorName, methArgs, methName }
  }
}

////////////////////////////////////////////////////////////////////////////////
// Applicater oper.
////////////////////////////////////////////////////////////////////////////////
export type ApplicaterOperAnyI = ApplicaterOperI<ConstructorAnyT, MethodAnyT>

interface ApplicaterOperI<
  Constr extends ConstructorAnyT,
  Method extends MethodAnyT
> { applerOper: ApplicaterOperPropsI<Constr, Method> }

interface ApplicaterOperPropsI<
  Constr extends ConstructorAnyT,
  Method extends MethodAnyT
> extends Pick<ApplicaterOperOriginProps<Constr, Method>, 'ctorArgs' | 'methArgs'> {
  readonly ctorName: ApplicaterOperOriginPropsAnyT['ctorFunc']['name'] // Constr['name'] не работает.
  readonly methName: ApplicaterOperOriginPropsAnyT['methFunc']['name'] // Method['name'] не работает.
}

////////////////////////////////////////////////////////////////////////////////
// Util. Public.
////////////////////////////////////////////////////////////////////////////////
export interface ApplicaterOperFromAppPropsI<
  Constr extends ConstructorAnyT,
  Method extends MethodAnyT
> { app: Application<Constr>; method: Method; args: Parameters<Method> }

export const applicaterOperUtil = Object.freeze({
  operFromApp<
    Constr extends ConstructorAnyT, Method extends MethodAnyT
  >(
    { app, method, args }: ApplicaterOperFromAppPropsI<Constr, Method>
  ): ApplicaterOperI<Constr, Method> {
    const applerOper: ApplicaterOperI<Constr, Method>['applerOper'] = {
      ctorArgs: app.ctorArgs,
      ctorName: app.ctorFunc.name,
      methArgs: args,
      methName: method.name
    }
    return { applerOper }
  },

  typifyApplicaterOperAny(
    // something: unknown
    something: ApplicaterOperI<ConstructorAnyT, MethodAnyT>['applerOper']
  ): ApplicaterOperI<ConstructorAnyT, MethodAnyT>['applerOper'] {
    if (typeof something !== 'object' || !something) throw new ErrorCustomType('')

    const ctorName: unknown = something['ctorName' as keyof typeof something]
    const ctorArgs: unknown = something['ctorArgs' as keyof typeof something]
    const methName: unknown = something['methName' as keyof typeof something]
    const methArgs: unknown = something['methArgs' as keyof typeof something]

    if (typeof ctorName !== 'string') throw new ErrorCustomType('')
    if (!Array.isArray(ctorArgs)) throw new ErrorCustomType('')
    if (typeof methName !== 'string') throw new ErrorCustomType('')
    if (!Array.isArray(methArgs)) throw new ErrorCustomType('')

    return { ctorName, ctorArgs, methName, methArgs }
  },
} as const)

////////////////////////////////////////////////////////////////////////////////
// Applicater oper. List.
////////////////////////////////////////////////////////////////////////////////
type OperIdT = string
export interface ApplicaterOperIdI {
  applerOperId: OperIdT
}

class ApplicaterOperList {
  readonly applerList: Map<OperIdT, ApplicaterOperI<ConstructorAnyT, MethodAnyT>['applerOper']> = new Map();

  protected pushOper_<
    Constr extends ConstructorAnyT, Method extends MethodAnyT
  >(
    { applerOper, applerOperId }: ApplicaterOperI<Constr, Method> & Partial<ApplicaterOperIdI>
  ): ApplicaterOperIdI {
    if (!applerOperId) ({ applerOperId } = applicaterOperListUtil.genOperId())

    if (this.applerList.has(applerOperId)) throw new ErrorCustomSyntax('')
    this.applerList.set(applerOperId, applerOper)

    return { applerOperId }
  }

  protected pushOperFromClass_<
    Constr extends ConstructorAnyT, Method extends MethodAnyT
  >(
    { ctorArgs, ctorFunc, methArgs, methFunc, applerOperId }
      : ApplicaterOperFromClassPropsI<Constr, Method> & Partial<ApplicaterOperIdI>
  ): ApplicaterOperIdI {
    const origOper = new ApplicaterOperOriginProps({ ctorArgs, ctorFunc, methArgs, methFunc })
    const applerOper = origOper.toApplerOper()

    const params: ApplicaterOperI<Constr, Method> & Partial<ApplicaterOperIdI> = { applerOper }
    if (applerOperId) params.applerOperId = applerOperId

    return this.pushOper_(params)
  }

  protected pushOperFromApp_<
    Constr extends ConstructorAnyT, Method extends MethodAnyT
  >(
    { app, method, args, applerOperId }: ApplicaterOperFromAppPropsI<Constr, Method>
      & Partial<ApplicaterOperIdI>
  ): ApplicaterOperIdI {
    const oper = applicaterOperUtil.operFromApp({ app, method, args })

    const params: ApplicaterOperI<Constr, Method> & Partial<ApplicaterOperIdI> = oper
    if (applerOperId) params.applerOperId = applerOperId

    return this.pushOper_(params)
  }
}

////////////////////////////////////////////////////////////////////////////////
// Util. Public.
////////////////////////////////////////////////////////////////////////////////
export interface ApplicaterOperListTuplesI {
  applerListTuples: [OperIdT, ApplicaterOperI<ConstructorAnyT, MethodAnyT>['applerOper']][]
}

export interface ApplicaterOperListRessI<Result> {
  applerRess: Map<OperIdT, Result>
}

export type ApplicaterOperListResTupleT<Result> = [OperIdT, Result]

export interface ApplicaterOperListResTuplesI<Result> {
  applerResTuples: ApplicaterOperListResTupleT<Result>[]
}

export const applicaterOperListUtil = Object.freeze({
  genOperId(): ApplicaterOperIdI {
    return { applerOperId: new ObjectId().toHexString() }
  },

  async fetchFromClient(
    { applerList, appOptions }: Pick<TransactionClient, 'applerList'> & ApplicationOptions
  ): Promise<ApplicaterOperListResTuplesI<unknown>> {
    const { applerListTuples }: ApplicaterOperListTuplesI = { applerListTuples: Array.from(applerList.entries()) }

    const fetchRequest: KbServerRequestI = {
      reqTxt: '/api/' + DRIVER_API_CONSTS.applerListTuples,
      method: 'POST',
      headers: kbServer.createHeaders({ appOptions }),
      bodyObj: { applerListTuples }
    }
    const result = await kbServer.query(fetchRequest)
    if (typeof result !== 'object' || !result) throw new ErrorCustomType('typeof result !== object || ! result')

    const { applerResTuples }: ApplicaterOperListResTuplesI<unknown> = {
      applerResTuples: typifyArrayWithTypeGuard(result['applerResTuples' as keyof typeof result], typifyTuple2)
    }
    return { applerResTuples }
  },

  async fetchFromClientSingle(
    { applerOper, appOptions }: ApplicaterOperI<ConstructorAnyT, MethodAnyT> & ApplicationOptions
  ): Promise<unknown> {

    const { applerList }: Pick<TransactionClient, 'applerList'> = { applerList: new Map() }
    const { applerOperId } = applicaterOperListUtil.genOperId()
    applerList.set(applerOperId, applerOper)

    const result = await applicaterOperListUtil.fetchFromClient({ applerList, appOptions })
    const { applerResTuples } = result

    if (applerResTuples.length !== 1) throw new ErrorCustomType('')
    const applerResTuple0 = applerResTuples[0]
    if (!applerResTuple0) throw new ErrorCustomType('')
    const [id, arr1] = applerResTuple0
    if (id !== applerOperId) throw new ErrorCustomType('')

    return arr1
  }
} as const)

////////////////////////////////////////////////////////////////////////////////
// Applicater oper. List with status.
////////////////////////////////////////////////////////////////////////////////
export const APPLICATER_STATUSES = Object.freeze({
  open: 'open',
  committing: 'committing',
  committed: 'committed',
  rolledback: 'rolledback',
  error: 'error',
} as const)

export class ApplicaterOperListWithStatus extends ApplicaterOperList {
  protected status: keyof typeof APPLICATER_STATUSES = APPLICATER_STATUSES.open;

  private checkForPushOper() {
    if (this.status !== APPLICATER_STATUSES.open) throw new ErrorCustomSyntax('this.status !== open')
  }

  // Statuses: open -> open.
  protected pushOperCheckStatus_<
    Constr extends ConstructorAnyT, Method extends MethodAnyT
  // >(...args: Parameters<ApplicaterOperListWithStatus['pushOper_']>) {
  // @ts-ignore
  >(...args: Parameters<typeof this.pushOper_<Constr, Method>>) {

    this.checkForPushOper()
    return this.pushOper_(...args)
  }

  // Statuses: open -> open.
  protected pushOperFromClassCheckStatus_<
    Constr extends ConstructorAnyT, Method extends MethodAnyT
  // >(...args: Parameters<ApplicaterOperListWithStatus['pushOperFromClass_']>) {
  // @ts-ignore
  >(...args: Parameters<typeof this.pushOperFromClass_<Constr, Method>>) {
    this.checkForPushOper()
    return this.pushOperFromClass_(...args)
  }

  // Statuses: open -> open.
  protected pushOperFromAppCheckStatus_<
    Constr extends ConstructorAnyT, Method extends MethodAnyT
  // @ts-ignore
  >(...args: Parameters<typeof this.pushOperFromApp_<Constr, Method>>) {
    this.checkForPushOper()
    return this.pushOperFromApp_(...args)
  }

  // Statuses: committing -> committed.
  protected setStatusCommitted(): void {
    if (this.status !== APPLICATER_STATUSES.committing) throw new ErrorCustomUnclassified('this.status !== committing')
    this.status = APPLICATER_STATUSES.committed
  }

  // Statuses: committing -> rolledback.
  protected setStatusRolledback(): void {
    if (this.status !== APPLICATER_STATUSES.committing) throw new ErrorCustomUnclassified('this.status !== committing')
    this.status = APPLICATER_STATUSES.rolledback
  }

  // Statuses: * -> error.
  setStatusError(): void {
    this.status = APPLICATER_STATUSES.error
  }
}
