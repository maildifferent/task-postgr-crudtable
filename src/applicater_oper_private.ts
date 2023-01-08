import { APPLICATIONS } from './applications.js'
import { ApplicationOptions } from './share/application.js'
import { applicaterOperUtil, ApplicaterOperListRessI, ApplicaterOperListResTuplesI, ApplicaterOperListTuplesI, ApplicaterOperAnyI } from './share/applicater.js'
import { ErrorCustomType } from './share/error.js'
import { typifyArrayWithTypeGuard, typifyTupleWithStringIdAndTypeGuard } from './share/util.js'
import { TransactionTabquery } from './share/transaction.js'

////////////////////////////////////////////////////////////////////////////////
// Util. Public.
////////////////////////////////////////////////////////////////////////////////
export const applicaterOpersPrivateUtil = Object.freeze({
  // CLIENT -> "{ operTuples }" -> SERVER -> "{ applerResTuples }" -> CLIENT.
  // async fetchFromClient => applicater.ts
  async fetchProcessOnServer(
    { applerListTuples, appOptions }: ApplicaterOperListTuplesI & ApplicationOptions
  ): Promise<ApplicaterOperListResTuplesI<unknown>> {

    function typeGuard(
      something: [string, ApplicaterOperAnyI['applerOper']]
    ): [string, ApplicaterOperAnyI['applerOper']] {
      return typifyTupleWithStringIdAndTypeGuard(something, applicaterOperUtil.typifyApplicaterOperAny)
    }

    applerListTuples = typifyArrayWithTypeGuard(applerListTuples, typeGuard)

    if (appOptions.trntab) throw new ErrorCustomType('')
    appOptions.trntab = new TransactionTabquery()

    const { applerRess }: ApplicaterOperListRessI<unknown> = { applerRess: new Map() }
    for (const operTuple of applerListTuples) {
      const operId = operTuple[0]
      const applerOper = operTuple[1]
      const result = await fetchProcessOnServerSingle({ applerOper, appOptions })
      applerRess.set(operId, result)
    }

    applerRess
    await appOptions.trntab.commit({ appOptions })
    const { applerResTuples }: ApplicaterOperListResTuplesI<unknown> = {
      applerResTuples: Array.from(applerRess.entries())
    }

    return { applerResTuples }
  },
} as const)

////////////////////////////////////////////////////////////////////////////////
// Util. Private.
////////////////////////////////////////////////////////////////////////////////
async function fetchProcessOnServerSingle(
  { applerOper, appOptions }: ApplicaterOperAnyI & ApplicationOptions
): Promise<unknown> {
  applerOper = applicaterOperUtil.typifyApplicaterOperAny(applerOper)

  const App = APPLICATIONS.find((value) => value.name === applerOper.ctorName)
  if (!App) throw new ErrorCustomType('!app')

  const arg0: unknown = applerOper.ctorArgs[0]
  if (typeof arg0 !== 'object' || !arg0) throw new ErrorCustomType('')
  const appOptions0 = arg0['appOptions' as keyof typeof arg0]
  if (typeof appOptions0 !== 'object' || !appOptions0) throw new ErrorCustomType('')
  if (Object.keys(appOptions0).length !== 0) throw new ErrorCustomType('')
  Object.assign(appOptions0, appOptions)

  // @ts-ignore
  const obj = new App(...applerOper.ctorArgs)
  const meth: unknown = obj[applerOper.methName as keyof typeof obj]
  if (typeof meth !== 'function') throw new ErrorCustomType('typeof meth !== function')
  const result: unknown = await meth.apply(obj, applerOper.methArgs)
  return result
}
