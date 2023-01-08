import { domainSchemasUtil, domainSchemasList } from '../domain_schema.js';
import { ErrorCustomType } from '../error.js';
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
    email: {
        type: 'string',
        isNullable: false,
        validate(email) {
            const regExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return regExp.test(email.toLowerCase());
        },
        async convert(email) {
            return email.toLowerCase();
        }
    },
    nickname: {
        type: 'string',
        isNullable: false,
        validate(nickname) {
            return nickname.length > 0;
        }
    },
    password: {
        type: 'string',
        isNullable: false,
        validate(password) {
            // password: минимальная длина 8 символов
            if (password.length < 8)
                throw new ErrorCustomType('password.length < 8');
            // password: должен содержать как минимум одну цифру, одну заглавную и одну строчную буквы.
            if (!/[A-Z]/.test(password))
                throw new ErrorCustomType('!/[A-Z]/.test(password)');
            if (!/[a-z]/.test(password))
                throw new ErrorCustomType('!/[a-z]/.test(password)');
            if (!/\d/.test(password))
                throw new ErrorCustomType('!/\d/.test(password)');
            return true;
        }
    }
});
////////////////////////////////////////////////////////////////////////////////
// Domain schema. Other.
////////////////////////////////////////////////////////////////////////////////
const domSchemaKey = Object.freeze((() => {
    const { uid } = domSchemaMain;
    return { uid };
})());
const domSchemaProject = Object.freeze((() => {
    const { password, ...other } = domSchemaMain;
    return other;
})());
const domSchemaFilter = Object.freeze((() => {
    const { password, ...other } = domSchemaMain;
    return other;
})());
const domSchemaCreate = (() => {
    const { uid, ...other } = domSchemaMain;
    return other;
})();
////////////////////////////////////////////////////////////////////////////////
// Main.
////////////////////////////////////////////////////////////////////////////////
export const domainSchemasUser = {
    domSchemasConfigName: 'domainSchemasUser',
    domSchemaKey,
    domSchemaMain,
    domSchemaProject,
    domSchemaFilter,
    domSchemaCreate
};
const configProps = {
    configName: domainSchemasUser.domSchemasConfigName,
    config: domainSchemasUser
};
if (settings.environment === SETTINGS_CONSTS.server) {
    const url = await import('url');
    configProps.configFileName = await domainSchemasUtil.genRelativeFileName(url.fileURLToPath(import.meta.url));
}
await domainSchemasList.set({ configProps });
