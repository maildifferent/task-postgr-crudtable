import { applicaterOperListUtil, applicaterOperUtil } from './applicater.js';
import { Application } from './application.js';
import { ErrorCustomImpossible, ErrorCustomType, errorImpossible } from './error.js';
import { settings, SETTINGS_CONSTS } from './settings.js';
////////////////////////////////////////////////////////////////////////////////
// Config. List.
////////////////////////////////////////////////////////////////////////////////
const configFileNames = new Map();
export class ConfigList {
    map = new Map;
    async get({ configName, appOptions }) {
        let config = this.map.get(configName);
        if (config)
            return config;
        if (settings.environment === SETTINGS_CONSTS.server)
            throw new ErrorCustomType('settings.environment === server');
        const configQuery = new ConfigQuery({ appOptions });
        const { applerOper } = applicaterOperUtil.operFromApp({ app: configQuery, method: configQuery.getFileName, args: [{ configName }] });
        const result = await applicaterOperListUtil.fetchFromClientSingle({ applerOper, appOptions });
        if (typeof result !== 'object' || !result)
            throw new ErrorCustomType('typeof result !== object || !result');
        const { configFileName } = result;
        if (typeof configFileName !== 'string')
            throw new ErrorCustomType('typeof configFileName !== string');
        await import(configFileName);
        config = this.map.get(configName) || errorImpossible('config');
        return config;
    }
    has({ configName }) {
        return this.map.has(configName);
    }
    async set({ configProps }) {
        if (this.map.has(configProps.configName))
            throw new ErrorCustomImpossible('this.map.has(configProps.configName)');
        if (settings.environment === SETTINGS_CONSTS.server) {
            if (!configProps.configFileName)
                throw new ErrorCustomType('!domSchemas.fileName');
            configFileNames.set(configProps.configName, configProps.configFileName);
        }
        this.map.set(configProps.configName, configProps);
    }
}
////////////////////////////////////////////////////////////////////////////////
// Config. Query.
////////////////////////////////////////////////////////////////////////////////
export class ConfigQuery extends Application {
    constructor({ appOptions }) {
        super({ appOptions, ctorFunc: ConfigQuery, ctorArgs: [{ appOptions }] });
    }
    getFileName({ configName }) {
        if (typeof configName !== 'string')
            throw new ErrorCustomType('typeof configName !== string');
        const configFileName = configFileNames.get(configName) || errorImpossible('configFileName');
        return { configFileName };
    }
}
