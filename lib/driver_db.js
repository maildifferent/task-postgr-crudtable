import pg from 'pg';
import { CONFIG } from './config.js';
import { Application } from './share/application.js';
import { documentUtil } from './share/document.js';
import { domainSchemasList } from './share/domain_schema.js';
import { ErrorCustomImpossible, ErrorCustomSyntax, ErrorCustomType, errorType } from './share/error.js';
import { TabqueryRW } from './share/tabquery.js';
const pgPool = CONFIG.isProduction
    ? new pg.Pool({
        connectionString: process.env['DATABASE_URL'],
        ssl: {
            rejectUnauthorized: false
        }
    })
    : new pg.Pool({
        user: 'postgres',
        password: '12345678',
        host: 'localhost',
        port: 5432,
        database: 'task_cruduser'
    });
////////////////////////////////////////////////////////////////////////////////
// Tabquery.
////////////////////////////////////////////////////////////////////////////////
export class DriverDbTabquery extends Application {
    tabExpression;
    domSchemasConfigName;
    constructor({ tabExpression, domSchemasConfigName, appOptions }) {
        if (typeof tabExpression !== 'string')
            throw new ErrorCustomType('typeof tabExpression !== string');
        super({ appOptions, ctorFunc: DriverDbTabquery, ctorArgs: [{ tabExpression, domSchemasConfigName, appOptions }] });
        this.tabExpression = tabExpression;
        this.domSchemasConfigName = domSchemasConfigName;
    }
    async read({ filterSchema, project, projectOptions }) {
        const { tabExpression, appOptions } = this;
        const query = genQueryRead({ tabExpression, filterSchema, project, projectOptions, appOptions });
        const { tabqRes } = await queryProcessor(query, pgPool);
        return { tabqRes };
    }
    async create({ create, project }) {
        const { tabExpression, domSchemasConfigName, appOptions } = this;
        const query = await genQueryCreate({ tabExpression, domSchemasConfigName, create, project, appOptions });
        const { tabqRes } = await queryProcessor(query, pgPool);
        return { tabqRes };
    }
    async update({ filterSchema, update, project }) {
        const { tabExpression, appOptions } = this;
        const query = genQueryUpdate({ tabExpression, filterSchema, update, project, appOptions });
        const { tabqRes } = await queryProcessor(query, pgPool);
        return { tabqRes };
    }
    async delete({ filterSchema, project }) {
        const { tabExpression, appOptions } = this;
        const query = genQueryDelete({ tabExpression, filterSchema, project, appOptions });
        const { tabqRes } = await queryProcessor(query, pgPool);
        return { tabqRes };
    }
}
////////////////////////////////////////////////////////////////////////////////
// Tabquery transaction.
////////////////////////////////////////////////////////////////////////////////
class TransactionTabqueryCommitter {
    async commit({ applerList, appOptions }) {
        const queries = new Map();
        for (const [id, oper] of applerList.entries()) {
            if (oper.ctorName !== TabqueryRW.name)
                throw new ErrorCustomType('oper.ctorName !== TabqueryRW.name');
            const arg0 = oper.ctorArgs[0];
            if (typeof arg0 !== 'object' || !arg0)
                throw new ErrorCustomType('typeof arg0 !== object || !arg0');
            const tabExpressionUnknown = arg0['tabExpression'];
            if (typeof tabExpressionUnknown !== 'string')
                throw new ErrorCustomType('typeof tabExpressionUnknown !== string');
            const { tabExpression } = { tabExpression: tabExpressionUnknown };
            const domSchemasConfigNameUnknown = arg0['domSchemasConfigName'];
            if (typeof domSchemasConfigNameUnknown !== 'string')
                throw new ErrorCustomType('typeof domSchemasConfigName !== string');
            const { domSchemasConfigName } = { domSchemasConfigName: domSchemasConfigNameUnknown };
            const queryGenerator = new DriverDbGenerateQuery({ tabExpression, domSchemasConfigName, appOptions });
            let query;
            if (oper.methName === 'read') {
                // @ts-ignore TODO.
                query = queryGenerator.read(...oper.methArgs);
            }
            else if (oper.methName === 'create') {
                // @ts-ignore TODO.
                query = await queryGenerator.create(...oper.methArgs);
            }
            else if (oper.methName === 'update') {
                // @ts-ignore TODO.
                query = queryGenerator.update(...oper.methArgs);
            }
            else if (oper.methName === 'delete') {
                // @ts-ignore TODO.
                query = queryGenerator.delete(...oper.methArgs);
            }
            else
                throw new ErrorCustomType('incorrect oper.methName');
            if (!query)
                throw new ErrorCustomType('!query');
            queries.set(id, query);
        }
        const { applerRess } = { applerRess: new Map() };
        const client = await pgPool.connect();
        try {
            await client.query('BEGIN');
            for (const [id, query] of queries) {
                const result = await queryProcessor(query, client);
                applerRess.set(id, result);
            }
            await client.query('COMMIT');
            return { applerRess };
        }
        catch (err) {
            await client.query('ROLLBACK');
            throw err;
        }
        finally {
            client.release();
        }
    }
}
export const driverDbTransactionTabqueryCommitter = new TransactionTabqueryCommitter();
////////////////////////////////////////////////////////////////////////////////
// Util. Private.
////////////////////////////////////////////////////////////////////////////////
async function queryProcessor(query, driver) {
    const queryRes = await driver.query({
        // rowMode: 'array',
        text: query.text
    }, query.vals);
    return {
        tabqRes: {
            // fields,
            rows: queryRes.rows,
            rowCount: queryRes.rowCount
        }
    };
}
////////////////////////////////////////////////////////////////////////////////
// Util. Private. Query generator.
////////////////////////////////////////////////////////////////////////////////
class DriverDbGenerateQuery extends Application {
    tabExpression;
    domSchemasConfigName;
    constructor({ tabExpression, domSchemasConfigName, appOptions }) {
        if (typeof tabExpression !== 'string')
            throw new ErrorCustomType('typeof tabExpression !== string');
        super({ appOptions, ctorFunc: DriverDbGenerateQuery, ctorArgs: [{ tabExpression, domSchemasConfigName, appOptions }] });
        this.tabExpression = tabExpression;
        this.domSchemasConfigName = domSchemasConfigName;
    }
    read({ filterSchema, project, projectOptions }) {
        const { tabExpression, appOptions } = this;
        return genQueryRead({ tabExpression, filterSchema, project, projectOptions, appOptions });
    }
    async create({ create, project }) {
        const { tabExpression, domSchemasConfigName, appOptions } = this;
        return genQueryCreate({ tabExpression, domSchemasConfigName, create, project, appOptions });
    }
    update({ filterSchema, update, project }) {
        const { tabExpression, appOptions } = this;
        return genQueryUpdate({ tabExpression, filterSchema, update, project, appOptions });
    }
    delete({ filterSchema, project }) {
        const { tabExpression, appOptions } = this;
        return genQueryDelete({ tabExpression, filterSchema, project, appOptions });
    }
}
////////////////////////////////////////////////////////////////////////////////
// Util. Private. Query generator functions.
////////////////////////////////////////////////////////////////////////////////
async function genQueryCreate({ tabExpression, domSchemasConfigName, create, project, appOptions }) {
    // Проверки аргументов функции.
    if (typeof tabExpression !== 'string')
        throw new ErrorCustomType('typeof tabExpression !== string');
    if (typeof domSchemasConfigName !== 'string')
        throw new ErrorCustomType('typeof domSchemasConfigName !== string');
    const domSchemas = await domainSchemasList.get({ configName: domSchemasConfigName, appOptions });
    const { domSchemaCreate } = domSchemas.config;
    if (!domSchemaCreate)
        throw new ErrorCustomImpossible('!domSchemaCreate');
    // Create query construction blocks.
    const fields = Object.keys(domSchemaCreate);
    const rowsPrimitive = [];
    for (const doc of create) {
        if (typeof doc !== 'object' || !doc)
            throw new ErrorCustomType('typeof doc !== object || !doc');
        const row = [];
        for (const field of fields) {
            const value = doc[field];
            const valuePrimitive = documentUtil.typifyDocumentValuePrimitivesT(value);
            row.push(valuePrimitive);
        }
        rowsPrimitive.push(row);
    }
    // Build query.
    // Массив строк: ['$1, $2, $3', '$4, $5, $6', ...]
    let counter = 1;
    const valuesQueryTextArr = rowsPrimitive.map((row) => { return row.map(() => `$${counter++}`).join(', '); });
    // Строка из массива: '($1, $2, $3), ($4, $5, $6), ...'
    let valuesQueryText = '(' + valuesQueryTextArr.join('), (') + ')';
    // INSERT INTO tagstab (creator, name, sortorder) VALUES ($1, $2, $3), ($4, $5, $6) RETURNING id, creator...
    let queryText = 'INSERT INTO ' + tabExpression + ' (' + fields.join(', ') + ')'
        + ' VALUES ' + valuesQueryText;
    const projectKeys = Object.keys(project);
    if (projectKeys.length > 0)
        queryText += ' RETURNING ' + projectKeys.join(', ');
    const queryVals = [];
    for (const row of rowsPrimitive)
        for (const elem of row)
            queryVals.push(elem);
    // Result.
    const resQuery = {
        text: queryText,
        vals: queryVals
    };
    return resQuery;
}
function genQueryRead({ tabExpression, filterSchema, project, projectOptions, appOptions }) {
    // Create query construction blocks.
    const { queryFilter, queryFilterVals } = genQueryFilter({ filterSchema });
    // Some other needed calculations...
    const sortExpression = genQuerySortExpression({ project, projectOptions });
    // Build query.
    // SELECT id, creator FROM tagstab WHERE id=$1 AND creator IN ($2, $3, ...)
    // SELECT product_id, p.name, (sum(s.units) * (p.price - p.cost)) AS profit
    //    FROM products p LEFT JOIN sales s USING (product_id)
    //    WHERE s.date > CURRENT_DATE - INTERVAL '4 weeks'
    //    GROUP BY product_id, p.name, p.price, p.cost
    //    HAVING sum(p.price * s.units) > 5000;
    // SELECT a + b AS sum, c FROM table1 ORDER BY sum, c DESC NULLS LAST LIMIT 20 OFFSET 10
    // SELECT * FROM (VALUES (1, 'one'), (2, 'two'), (3, 'three')) AS t (num,letter);
    let queryText = 'SELECT ' + Object.keys(project).join(', ') + ' FROM ' + tabExpression;
    if (queryFilter)
        queryText += ' WHERE ' + queryFilter;
    if (sortExpression)
        queryText += ' ORDER BY ' + sortExpression;
    if (projectOptions.skip)
        queryText += ' OFFSET ' + projectOptions.skip;
    if (projectOptions.limit)
        queryText += ' LIMIT ' + projectOptions.limit;
    // Result.
    const resQuery = {
        text: queryText,
        vals: queryFilterVals
    };
    return resQuery;
}
function genQueryUpdate({ tabExpression, filterSchema, update, project, appOptions }) {
    if (Object.keys(filterSchema).length < 1)
        throw new ErrorCustomType('Object.keys(filterSchema).length < 1');
    // Create query construction blocks.
    const { queryFilter, queryFilterVals } = genQueryFilter({ filterSchema });
    const fields = Object.keys(update);
    const values = Object.values(update);
    // Build query.
    // UPDATE tagstab SET creator=$1 WHERE id=$2 AND ... RETURNING *;
    let queryText = 'UPDATE ' + tabExpression;
    let counter = queryFilterVals.length + 1;
    const querySet = fields.map((field) => field + '=$' + counter++).join(', ');
    queryText += ' SET ' + querySet;
    if (!queryFilter)
        throw new ErrorCustomType('!queryFilter');
    queryText += ' WHERE ' + queryFilter;
    const projectKeys = Object.keys(project);
    if (projectKeys.length > 0)
        queryText += ' RETURNING ' + projectKeys.join(', ');
    // Result.
    const resQuery = {
        text: queryText,
        vals: [...queryFilterVals, ...values]
    };
    return resQuery;
}
function genQueryDelete({ tabExpression, filterSchema, project, appOptions }) {
    if (Object.keys(filterSchema).length < 1)
        throw new ErrorCustomType('Object.keys(filterSchema).length < 1');
    // Create query construction blocks.
    const { queryFilter, queryFilterVals } = genQueryFilter({ filterSchema });
    // Build query.
    // DELETE FROM tagstab WHERE id=$1 AND creator=$2 AND ... RETURNING *;
    let queryText = 'DELETE FROM ' + tabExpression;
    if (!queryFilter)
        throw new ErrorCustomType('!queryFilter');
    queryText += ' WHERE ' + queryFilter;
    const projectKeys = Object.keys(project);
    if (projectKeys.length > 0)
        queryText += ' RETURNING ' + projectKeys.join(', ');
    // Result.
    const resQuery = {
        text: queryText,
        vals: queryFilterVals
    };
    return resQuery;
}
function genQuerySortExpression({ project, projectOptions }) {
    const projectSort = projectOptions.sort;
    const projectSortNulls = projectOptions.sortNulls;
    // Пример: ['name', 'age DESC NULLS LAST', 'gender DESC']
    let sortExpressionArr = [];
    for (const key in project) {
        let field = '';
        let sortToken = '';
        if (projectSort) {
            field = key;
            const sort = projectSort[key];
            if (sort === 'des') {
                sortToken = ' DESC';
            }
            else if (sort === 'asc') {
                sortToken = ' ASC';
            }
        }
        if (projectSortNulls) {
            field = key;
            const sortNulls = projectSortNulls[key];
            if (sortNulls === 'last') {
                sortToken += ' NULLS LAST';
            }
            else if (sortNulls === 'first') {
                sortToken += ' NULLS FIRST';
            }
        }
        if (field)
            sortExpressionArr.push(field + sortToken);
    }
    //Пример: ORDER BY name, age DESC NULLS LAST, gender DESC
    return sortExpressionArr.join(', ');
}
////////////////////////////////////////////////////////////////////////////////
// Filter.
////////////////////////////////////////////////////////////////////////////////
const FILTER_OPERATORS_MAP_TO_SQL = Object.freeze({
    $eq: '=',
    $ne: '!=',
    $in: 'IN',
    $nin: 'NOT IN',
    // $regex: '$regex',
    $il: 'LIKE',
    $nil: 'NOT LIKE',
    $gt: '>',
    $gte: '>=',
    $lt: '<',
    $lte: '<=',
});
const FILTER_OPERATORS_MAP_TO_SQL_ = { ...FILTER_OPERATORS_MAP_TO_SQL };
// Filter for field 'qty':
// qty: [{ $gt: 10, $lt: 20, $in: [13, 15] }, { $gt: 20, $lt: 30 }] // Implicit OR.
// =>
// '( (qty >= 10 AND qty <= 20 AND qty IN (13,15)) OR (qty >= 20 AND qty <= 30) ) AND ... '
// =>
// '( (qty >= $1 AND qty <= $2 AND qty IN ($3,$4)) OR (qty >= $5 AND qty <= $6) ) AND ... '
function genQueryFilter({ filterSchema }) {
    const incorrectFields = [];
    const queryFields = [];
    const queryVals = [];
    const queryANDs = []; // E.g. ['age > $22 AND age < $33', 'height > $11 AND height ...'].
    for (const field in filterSchema) {
        const fieldVal = filterSchema[field];
        if (fieldVal === undefined)
            throw new ErrorCustomType('fieldVal === undefined');
        // Case {qty: 5}.
        if (documentUtil.isDocumentValuePrimitivesT(fieldVal)) {
            queryVals.push(fieldVal);
            queryFields.push(field);
            queryANDs.push(field + ' = $' + queryVals.length);
            continue;
        }
        if (typeof fieldVal !== 'object' || !fieldVal) {
            incorrectFields.push(field);
            continue;
        }
        // Case {qty: [{ $lt: 5 }, { $gt: 50 }]} not implemented.
        if (Array.isArray(fieldVal))
            throw new ErrorCustomSyntax('Not implemented.');
        // На этом этапе должны остаться только варианты типа: {qty: { $lt: 5 }} или
        // {qty: { $gt: 10, $lt: 20, $nin: [13, 15] }}...
        const fieldANDs = []; // E.g. ['age > $22', 'age < $33'].
        for (const operator in fieldVal) {
            const operand = fieldVal[operator];
            const operatorSQL = FILTER_OPERATORS_MAP_TO_SQL_[operator] || errorType('operatorSQL');
            if (['$eq', '$ne', '$gt', '$lt', '$gte', '$lte'].includes(operator)) {
                if (!documentUtil.isDocumentValuePrimitivesT(operand)) {
                    incorrectFields.push(field);
                    break;
                }
                queryVals.push(operand);
                if (queryFields)
                    queryFields.push(field);
                fieldANDs.push(field + ' ' + operatorSQL + ' $' + queryVals.length); // E.g. 'age > $22'.
                continue;
            }
            if (['$in', '$nin'].includes(operator)) {
                if (!Array.isArray(operand)) {
                    incorrectFields.push(field);
                    break;
                }
                const inOperandVals = [];
                let arrayVal;
                for (arrayVal of operand) {
                    if (!documentUtil.isDocumentValuePrimitivesT(arrayVal)) {
                        incorrectFields.push(field);
                        break;
                    }
                    queryVals.push(arrayVal);
                    if (queryFields)
                        queryFields.push(field);
                    inOperandVals.push('$' + queryVals.length);
                }
                fieldANDs.push(field + ' ' + operatorSQL + ' (' + inOperandVals.join(',') + ') ');
                continue;
            }
            if (operator === '$il' || operator === '$nil') {
                if (!Array.isArray(operand)) {
                    incorrectFields.push(field);
                    break;
                }
                const ilOperandVals = [];
                let arrayVal;
                for (arrayVal of operand) {
                    if (typeof arrayVal !== 'string') {
                        incorrectFields.push(field);
                        break;
                    }
                    const likeOperand = convWildcardStringToPostgreLikeOperand(arrayVal);
                    queryVals.push(likeOperand);
                    if (queryFields)
                        queryFields.push(field);
                    ilOperandVals.push(field + ' ' + operatorSQL + ' ' + '$' + queryVals.length);
                }
                if (operator === '$il')
                    fieldANDs.push(ilOperandVals.join(' OR '));
                else if (operator === '$nil')
                    fieldANDs.push(ilOperandVals.join(' AND '));
                else
                    throw new ErrorCustomType('Incorrect operator.');
                continue;
            }
            // Incorrect operator.
            throw new ErrorCustomType('Incorrect operator.');
        }
        const queryANDItem = '(' + fieldANDs.join(' AND ') + ')';
        queryANDs.push(queryANDItem);
    }
    if (incorrectFields.length > 0)
        throw new ErrorCustomType(JSON.stringify(['Incorrect fields:', ...incorrectFields]));
    if (queryFields && queryFields.length !== queryVals.length)
        throw new ErrorCustomSyntax('queryFields && queryFields.length !== queryVals.length');
    const queryFilter = queryANDs.join(' AND ');
    return { queryFilter, queryFilterFields: queryFields, queryFilterVals: queryVals };
    //////////////////////////////////////////////////////////////////////////////
    // Util. Local.
    //////////////////////////////////////////////////////////////////////////////
    function convWildcardStringToPostgreLikeOperand(str) {
        console.log(str);
        return str.replaceAll('_', '\_')
            .replaceAll('%', '\%')
            .replaceAll('?', '_')
            .replaceAll('*', '%');
    }
}
////////////////////////////////////////////////////////////////////////////////
// Some tests.
////////////////////////////////////////////////////////////////////////////////
() => {
    function testI1F(inp) { }
    function testI2F(inp) { }
    testI1F;
    testI2F;
    // //
    // testI1F<TestI>({ prop0: 'ww', prop1: '', prop2: 1 }) // Error OK.
    // testI1F<TestT>({ prop0: 'ww', prop1: '', prop2: 1 }) // Error OK.
    // //
    // testI2F<TestI>({ prop0: 'ww', prop1: '', prop2: 1 }) // Error difference.
    // testI2F<TestT>({ prop0: 'ww', prop1: '', prop2: 1 }) // Error difference.
    //
    testI2F({ prop0: 'ww', prop1: '', prop2: 1 });
    testI2F({ prop0: 'ww', prop1: '', prop2: 1 });
};
