import { filterUtil } from './filter.js';
import { projectionUtil } from './projection.js';
import { Application } from './application.js';
import { applicaterOperListUtil, applicaterOperUtil } from './applicater.js';
import { settings, SETTINGS_CONSTS } from './settings.js';
import { ErrorCustomImpossible, ErrorCustomType, errorImpossible } from './error.js';
import { hasProperties2, typifyNotPartial } from './util.js';
import { domainSchemasList, domainSchemaUtil } from './domain_schema.js';
export class TabqueryRW extends Application {
    tabExpression;
    domSchemasConfigName;
    constructor({ tabExpression, domSchemasConfigName, appOptions }) {
        if (typeof tabExpression !== 'string')
            throw new ErrorCustomType('typeof tabExpression !== string');
        if (typeof domSchemasConfigName !== 'string')
            throw new ErrorCustomType('typeof domSchemasConfigName !== string');
        super({ appOptions, ctorFunc: TabqueryRW, ctorArgs: [{ tabExpression, domSchemasConfigName, appOptions }] });
        this.tabExpression = tabExpression;
        this.domSchemasConfigName = domSchemasConfigName;
    }
    async read({ filterSchema, project, projectOptions }) {
        // Инициализация.
        const { tabExpression, domSchemasConfigName, appOptions } = this;
        // Проверки аргументов функции.
        if (typeof tabExpression !== 'string')
            throw new ErrorCustomType('typeof tabExpression !== string');
        if (typeof domSchemasConfigName !== 'string')
            throw new ErrorCustomType('typeof domSchemasConfigName !== string');
        const domSchemas = await domainSchemasList.get({ configName: domSchemasConfigName, appOptions });
        const { domSchemaProject, domSchemaFilter } = domSchemas.config;
        if (!filterUtil.isFilterSchema(filterSchema, domSchemaFilter))
            throw new ErrorCustomType('');
        if (!projectionUtil.isProjection(project, domSchemaProject))
            throw new ErrorCustomType('');
        if (!projectionUtil.isProjectionOptionsT(projectOptions, project, domSchemaProject))
            throw new ErrorCustomType('');
        // Результат.
        if (settings.environment === SETTINGS_CONSTS.server) {
            if (!settings.tabqueryDriver)
                throw new ErrorCustomType('!settings.tabqueryDriver');
            // Driver DB.
            const driver = new settings.tabqueryDriver({ tabExpression, domSchemasConfigName, appOptions });
            return driver.read({ filterSchema, project, projectOptions });
        }
        else if (settings.environment === SETTINGS_CONSTS.browser) {
            const { applerOper } = applicaterOperUtil.operFromApp({
                app: this,
                method: (this.read),
                args: [{ filterSchema, project, projectOptions }]
            });
            const result = await applicaterOperListUtil.fetchFromClientSingle({ applerOper, appOptions });
            const { tabqRes } = typifyTabqueryResultDocsI({
                something: result,
                domSchemaProject, project
            });
            return { tabqRes };
        }
        else {
            throw new ErrorCustomType('incorrect settings.environment');
        }
    }
    async create({ create, project }) {
        // 1. Инициализация.
        const { tabExpression, domSchemasConfigName, appOptions } = this;
        // 2. Проверки аргументов функции.
        if (typeof tabExpression !== 'string')
            throw new ErrorCustomType('typeof tabExpression !== string');
        if (typeof domSchemasConfigName !== 'string')
            throw new ErrorCustomType('typeof domSchemasConfigName !== string');
        const domSchemas = await domainSchemasList.get({ configName: domSchemasConfigName, appOptions });
        const { domSchemaProject, domSchemaCreate } = domSchemas.config;
        if (!domSchemaCreate)
            throw new ErrorCustomImpossible('!domSchemaCreate');
        if (!domainSchemaUtil.isDocumentArr(create, domSchemaCreate))
            throw new ErrorCustomType('');
        if (!projectionUtil.isProjection(project, domSchemaProject))
            throw new ErrorCustomType('');
        const tabqRes = {};
        // 5. Добавление операции в транзакцию приложения.
        if (this.appOptions.trnapp) {
            const { applerOperId } = this.appOptions.trnapp.pushOperFromApp({ app: this, method: (this.create), args: [{ create, project }] });
            // Постпроцессор для обработки результата после коммита транзакции.
            this.appOptions.trnapp.resultProcessors.push(genResultPostprocessor({ tabqRes, applerOperId, domSchemaProject, project }));
        }
        // 6. Преобразования.
        const convertedDocs = await validateAndConvert({ docs: create, domSchema: domSchemaCreate });
        // 7. Результат моделирования.
        const dummyDoc = domainSchemaUtil.genDummyDocument({ domSchema: domSchemaProject });
        const projectDocs = [];
        for (let i = 0; i < convertedDocs.length; i++) {
            const convertedDoc = convertedDocs[i];
            if (!convertedDoc)
                throw new ErrorCustomImpossible('');
            const projectDoc = projectionUtil.pickProjectFromDoc(dummyDoc, project);
            for (const [key, value] of Object.entries(convertedDoc)) {
                if (key in projectDoc)
                    domainSchemaUtil.updDocumentPropertyValue(projectDoc, domSchemaProject, key, value);
            }
            projectDocs.push(projectDoc);
        }
        tabqRes.rows = projectDocs;
        tabqRes.rowCount = projectDocs.length;
        // 8. Добавление операции в транзакцию запроса к БД.
        if (this.appOptions.trntab) {
            const args = [{
                    create: convertedDocs,
                    project
                }];
            const { applerOperId } = this.appOptions.trntab.pushOperFromApp({ app: this, method: (this.create), args });
            // Постпроцессор для обработки результата после коммита транзакции.
            this.appOptions.trntab.resultProcessors.push(genResultPostprocessor({ tabqRes, applerOperId, domSchemaProject, project }));
        }
        return { tabqRes: typifyNotPartial(tabqRes, 2) };
    }
    async update({ filterSchema, update, project }) {
        // 1. Инициализация.
        const { tabExpression, domSchemasConfigName, appOptions } = this;
        // 2. Проверки аргументов функции.
        if (typeof tabExpression !== 'string')
            throw new ErrorCustomType('typeof tabExpression !== string');
        if (typeof domSchemasConfigName !== 'string')
            throw new ErrorCustomType('typeof domSchemasConfigName !== string');
        if (Object.keys(filterSchema).length < 1)
            throw new ErrorCustomType('');
        const domSchemas = await domainSchemasList.get({ configName: domSchemasConfigName, appOptions });
        const { domSchemaProject, domSchemaFilter, domSchemaCreate } = domSchemas.config;
        if (!domSchemaCreate)
            throw new ErrorCustomImpossible('!domSchemaCreate');
        if (!filterUtil.isFilterSchema(filterSchema, domSchemaFilter))
            throw new ErrorCustomType('');
        if (!domainSchemaUtil.isDocumentPick(update, domSchemaCreate, update))
            throw new ErrorCustomType('');
        if (!projectionUtil.isProjection(project, domSchemaProject))
            throw new ErrorCustomType('');
        const tabqRes = {};
        // 5. Добавление операции в транзакцию приложения.
        if (this.appOptions.trnapp) {
            const { applerOperId } = this.appOptions.trnapp.pushOperFromApp({ app: this, method: (this.update), args: [{ filterSchema, update, project }] });
            // Постпроцессор для обработки результата после коммита транзакции.
            this.appOptions.trnapp.resultProcessors.push(genResultPostprocessor({ tabqRes, applerOperId, domSchemaProject, project }));
        }
        // 6. Преобразования.
        const convertedDocs = await validateAndConvert({ docs: [update], domSchema: domSchemaCreate });
        const convertedDoc = convertedDocs[0] || errorImpossible('');
        // 7. Результат моделирования.
        tabqRes.rows = [];
        tabqRes.rowCount = 0;
        // 8. Добавление операции в транзакцию запроса к БД.
        if (this.appOptions.trntab) {
            const args = [{
                    filterSchema,
                    update: convertedDoc,
                    project
                }];
            const { applerOperId } = this.appOptions.trntab.pushOperFromApp({ app: this, method: (this.update), args });
            // Постпроцессор для обработки результата после коммита транзакции.
            this.appOptions.trntab.resultProcessors.push(genResultPostprocessor({ tabqRes, applerOperId, domSchemaProject, project }));
        }
        return { tabqRes: typifyNotPartial(tabqRes, 2) };
    }
    async delete({ filterSchema, project }) {
        // 1. Инициализация.
        const { tabExpression, domSchemasConfigName, appOptions } = this;
        // 2. Проверки аргументов функции.
        if (typeof tabExpression !== 'string')
            throw new ErrorCustomType('typeof tabExpression !== string');
        if (typeof domSchemasConfigName !== 'string')
            throw new ErrorCustomType('typeof domSchemasConfigName !== string');
        if (Object.keys(filterSchema).length < 1)
            throw new ErrorCustomType('');
        const domSchemas = await domainSchemasList.get({ configName: domSchemasConfigName, appOptions });
        const { domSchemaProject, domSchemaFilter } = domSchemas.config;
        if (!filterUtil.isFilterSchema(filterSchema, domSchemaFilter))
            throw new ErrorCustomType('');
        if (!projectionUtil.isProjection(project, domSchemaProject))
            throw new ErrorCustomType('');
        const tabqRes = {};
        // 5. Добавление операции в транзакцию приложения.
        if (this.appOptions.trnapp) {
            const { applerOperId } = this.appOptions.trnapp.pushOperFromApp({ app: this, method: (this.delete), args: [{ filterSchema, project }] });
            // Постпроцессор для обработки результата после коммита транзакции.
            this.appOptions.trnapp.resultProcessors.push(genResultPostprocessor({ tabqRes, applerOperId, domSchemaProject, project }));
        }
        // 6. Преобразования.
        // ...
        // 7. Результат моделирования.
        tabqRes.rows = [];
        tabqRes.rowCount = 0;
        // 8. Добавление операции в транзакцию запроса к БД.
        if (this.appOptions.trntab) {
            const args = [{ filterSchema, project }];
            const { applerOperId } = this.appOptions.trntab.pushOperFromApp({ app: this, method: (this.delete), args });
            // Постпроцессор для обработки результата после коммита транзакции.
            this.appOptions.trntab.resultProcessors.push(genResultPostprocessor({ tabqRes, applerOperId, domSchemaProject, project }));
        }
        return { tabqRes: typifyNotPartial(tabqRes, 2) };
    }
}
////////////////////////////////////////////////////////////////////////////////
// Util. Private.
////////////////////////////////////////////////////////////////////////////////
async function validateAndConvert({ docs, domSchema }) {
    for (const doc of docs) {
        domainSchemaUtil.applyDomainValidatorToDoc(domSchema, doc);
    }
    const convertedDocs = [];
    for (const doc of docs) {
        const convertedDoc = Object.assign({}, doc);
        await domainSchemaUtil.applyDomainConverterToDoc(domSchema, convertedDoc);
        convertedDocs.push(convertedDoc);
    }
    return convertedDocs;
}
function genResultPostprocessor({ tabqRes, applerOperId, domSchemaProject, project }) {
    return async ({ applerRess }) => {
        const resUntyped = applerRess.get(applerOperId);
        const resTyped = typifyTabqueryResultDocsI({
            something: resUntyped,
            domSchemaProject,
            project
        });
        const { rows, rowCount } = resTyped.tabqRes;
        tabqRes.rows = rows;
        tabqRes.rowCount = rowCount;
    };
}
function typifyTabqueryResultDocsI({ something, domSchemaProject, project }) {
    if (!hasProperties2(something, ['tabqRes']))
        throw new ErrorCustomType('');
    const tabqRes = something['tabqRes'];
    if (!hasProperties2(tabqRes, ['rows', 'rowCount']))
        throw new ErrorCustomType('');
    const rows = tabqRes['rows'];
    const rowCount = tabqRes['rowCount'];
    if (!domainSchemaUtil.isDocumentPickArr(rows, domSchemaProject, project))
        throw new ErrorCustomType('');
    if (typeof rowCount !== 'number')
        throw new ErrorCustomType('  ');
    return { tabqRes: { rows, rowCount } };
}
////////////////////////////////////////////////////////////////////////////////
// Util. Public.
////////////////////////////////////////////////////////////////////////////////
