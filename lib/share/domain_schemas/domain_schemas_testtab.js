import { domainSchemasUtil, domainSchemasList } from '../domain_schema.js';
import { settings, SETTINGS_CONSTS } from '../settings.js';
////////////////////////////////////////////////////////////////////////////////
// Domain schema. Main.
////////////////////////////////////////////////////////////////////////////////
const domSchemaMain = Object.freeze({
    uid: {
        type: 'string',
        isNullable: false,
        validate(uid) {
            const regExp = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
            return !regExp.test(uid);
        }
    },
    name: {
        type: 'string',
        isNullable: false,
        validate(value) {
            if (value.length < 1)
                return false;
            if (value.length > 100)
                return false;
            return true;
        }
    },
    position: {
        type: 'string',
        isNullable: false,
        validate(value) {
            if (value.length < 1)
                return false;
            if (value.length > 100)
                return false;
            return true;
        }
    },
    skills: {
        type: 'string',
        isNullable: false,
        validate(value) {
            if (value.length < 1)
                return false;
            if (value.length > 100)
                return false;
            return true;
        }
    },
    comment: {
        type: 'string',
        isNullable: false,
        validate(value) {
            if (value.length < 1)
                return false;
            if (value.length > 100)
                return false;
            return true;
        }
    },
});
////////////////////////////////////////////////////////////////////////////////
// Domain schema. Other.
////////////////////////////////////////////////////////////////////////////////
const domSchemaKey = Object.freeze((() => {
    const { uid } = domSchemaMain;
    return { uid };
})());
const domSchemaProject = Object.freeze((() => {
    return domSchemaMain;
})());
const domSchemaFilter = Object.freeze((() => {
    return domSchemaMain;
})());
const domSchemaCreate = (() => {
    const { uid, ...other } = domSchemaMain;
    return other;
})();
////////////////////////////////////////////////////////////////////////////////
// Main.
////////////////////////////////////////////////////////////////////////////////
export const domainSchemasTesttab = {
    domSchemasConfigName: 'domainSchemasTesttab',
    domSchemaKey,
    domSchemaMain,
    domSchemaProject,
    domSchemaFilter,
    domSchemaCreate
};
const configProps = {
    configName: domainSchemasTesttab.domSchemasConfigName,
    config: domainSchemasTesttab
};
if (settings.environment === SETTINGS_CONSTS.server) {
    const url = await import('url');
    configProps.configFileName = await domainSchemasUtil.genRelativeFileName(url.fileURLToPath(import.meta.url));
}
await domainSchemasList.set({ configProps });
