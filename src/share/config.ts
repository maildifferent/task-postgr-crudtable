import { applicaterOperListUtil, applicaterOperUtil } from './applicater.js'
import { Application, ApplicationOptions } from './application.js'
import { ErrorCustomImpossible, ErrorCustomType, errorImpossible } from './error.js'
import { settings, SETTINGS_CONSTS } from './settings.js'

export type ConfigNameT = string
interface ConfigNameI { configName: ConfigNameT }
type ConfigFileNameT = string
interface ConfigFileNameI { configFileName?: ConfigFileNameT }

export interface ConfigPropsI<Config> extends ConfigNameI, ConfigFileNameI {
  config: Config
}

////////////////////////////////////////////////////////////////////////////////
// Config. List.
////////////////////////////////////////////////////////////////////////////////
const configFileNames: Map<ConfigNameT, ConfigFileNameT> = new Map()

export abstract class ConfigList<ConfigListItem> {
  private readonly map = new Map<ConfigNameT, ConfigPropsI<ConfigListItem>>

  async get<Config>(
    { configName, appOptions }: ConfigNameI & ApplicationOptions
  ): Promise<ConfigPropsI<Config>> {
    let config: ConfigPropsI<ConfigListItem> | undefined = this.map.get(configName)
    if (config) return config as any as ConfigPropsI<Config>

    if (settings.environment === SETTINGS_CONSTS.server) throw new ErrorCustomType('settings.environment === server')

    const configQuery = new ConfigQuery({ appOptions })
    const { applerOper } = applicaterOperUtil.operFromApp(
      { app: configQuery, method: configQuery.getFileName, args: [{ configName }] }
    )

    const result: ReturnType<typeof configQuery.getFileName>
      = await applicaterOperListUtil.fetchFromClientSingle({ applerOper, appOptions }) as any
    if (typeof result !== 'object' || !result) throw new ErrorCustomType('typeof result !== object || !result')
    const { configFileName } = result
    if (typeof configFileName !== 'string') throw new ErrorCustomType('typeof configFileName !== string')

    await import(configFileName)

    config = this.map.get(configName) || errorImpossible('config')
    return config as any as ConfigPropsI<Config>
  }

  has({ configName }: ConfigNameI): boolean {
    return this.map.has(configName)
  }

  async set({ configProps }: { configProps: ConfigPropsI<ConfigListItem> }) {
    if (this.map.has(configProps.configName)) throw new ErrorCustomImpossible('this.map.has(configProps.configName)')
    if (settings.environment === SETTINGS_CONSTS.server) {
      if (!configProps.configFileName) throw new ErrorCustomType('!domSchemas.fileName')
      configFileNames.set(configProps.configName, configProps.configFileName)
    }
    this.map.set(configProps.configName, configProps)
  }
}

////////////////////////////////////////////////////////////////////////////////
// Config. Query.
////////////////////////////////////////////////////////////////////////////////
export class ConfigQuery extends Application<typeof ConfigQuery> {
  constructor({ appOptions }: ApplicationOptions) {
    super({ appOptions, ctorFunc: ConfigQuery, ctorArgs: [{ appOptions }] })
  }

  getFileName({ configName }: ConfigNameI): ConfigFileNameI {
    if (typeof configName !== 'string') throw new ErrorCustomType('typeof configName !== string')
    const configFileName = configFileNames.get(configName) || errorImpossible('configFileName')
    return { configFileName }
  }
}
