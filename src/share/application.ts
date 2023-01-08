import { AuthorizationT } from './authorization.js'
import { TransactionClient, TransactionTabquery } from './transaction.js'

////////////////////////////////////////////////////////////////////////////////
// Application. Options.
/////////////////////////////////////////////////////////////////////////////
type OptionsPropsT = Pick<OptionsInternal, 'authrz' | 'trnapp' | 'trntab'>

class OptionsInternal {
  authrz?: AuthorizationT
  trnapp?: TransactionClient
  trntab?: TransactionTabquery
  constructor({ authrz, trnapp, trntab }: OptionsPropsT) {
    if (authrz) this.authrz = authrz
    if (trnapp) this.trnapp = trnapp
    if (trntab) this.trntab = trntab
  }
  toJSON() { return {} }
}

export class ApplicationOptions {
  appOptions: OptionsInternal
  constructor({ authrz, trnapp, trntab }: OptionsPropsT) {
    const optionsProps: OptionsPropsT = {}
    if (authrz) optionsProps.authrz = authrz
    if (trnapp) optionsProps.trnapp = trnapp
    if (trntab) optionsProps.trntab = trntab
    this.appOptions = new OptionsInternal(optionsProps)
  }
}

////////////////////////////////////////////////////////////////////////////////
// Application.
////////////////////////////////////////////////////////////////////////////////
type ConstructorAnyT = new (...args: any[]) => any
export type ApplicationAnyT = Application<ConstructorAnyT>

export class Application<Constr extends ConstructorAnyT> {
  readonly appOptions: ApplicationOptions['appOptions']
  readonly ctorArgs: ConstructorParameters<Constr>
  readonly ctorFunc: Constr
  constructor(
    { appOptions, ctorFunc, ctorArgs }: ApplicationOptions
      & { ctorFunc: Constr }
      & { ctorArgs: ConstructorParameters<Constr> }
  ) {
    this.appOptions = appOptions
    this.ctorFunc = ctorFunc
    this.ctorArgs = ctorArgs
  }
}

////////////////////////////////////////////////////////////////////////////////
// Application. Some tests.
////////////////////////////////////////////////////////////////////////////////
() => {
  class TestCl extends Application<typeof TestCl> {
    prop1

    constructor(
      { appOptions, prop1 }: ApplicationOptions & { prop1: number }
    ) {
      super({ appOptions, ctorFunc: TestCl, ctorArgs: [{ appOptions, prop1 }] })
      this.prop1 = prop1
    }
  }
  const { appOptions } = new ApplicationOptions({})
  const test = new TestCl({ appOptions, prop1: 1 })
  test
}
