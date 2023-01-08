import { domainSchemaUtil } from './domain_schema.js';
import { ErrorCustomImpossible, ErrorCustomType, ErrorCustomUnclassified, errorImpossible } from './error.js';
import { filterUtil } from './filter.js';
import { TabqueryRW } from './tabquery.js';
import { tabrepRowTechnicalPropsDummy, TABREP_COMMITS, TABREP_INFORMS } from './tabrep.js';
import { TransactionClient } from './transaction.js';
import { genProjectionFromDoc, typifyNotPartial } from './util.js';
////////////////////////////////////////////////////////////////////////////////
// Tabquery. Tabrep CRUD.
////////////////////////////////////////////////////////////////////////////////
export class TabqueryTabrepCrud {
    static { }
    busyPromise = null;
    appOptions;
    front;
    domSchemasConfig;
    rows = new Map();
    rowId;
    tabExpression;
    trnstack = new TabsourceTransactionStack();
    constructor({ tabExpression, tabrep, appOptions }) {
        this.appOptions = appOptions;
        this.tabExpression = tabExpression;
        const { front, domSchemasConfig, rows, rowId } = tabrep;
        this.front = front;
        this.domSchemasConfig = domSchemasConfig;
        this.rows = rows;
        this.rowId = rowId;
    }
    // Commit.
    async commitAsync() {
        if (this.busyPromise)
            throw new ErrorCustomUnclassified('busyPromise');
        this.busyPromise = this.commitAsync_();
        try {
            await this.busyPromise;
        }
        finally {
            this.busyPromise = null;
        }
    }
    async commitAsync_() {
        const { tabExpression, appOptions } = this;
        const { domSchemasConfigName, domSchemaKey, domSchemaMain, domSchemaProject, domSchemaCreate } = this.domSchemasConfig;
        if (!domSchemaCreate)
            throw new ErrorCustomImpossible('!domSchemaCreate');
        // Подготовка данных для табквери.
        const creates = new Map();
        const credels = new Map();
        const updates = new Map();
        const deletes = new Map();
        for (const [rowId, tabsrcRow] of this.rows) {
            if (tabsrcRow._commit === '') {
                continue;
            }
            else if (tabsrcRow._commit === TABREP_COMMITS.create) {
                creates.set(rowId, tabsrcRow);
            }
            else if (tabsrcRow._commit === TABREP_COMMITS.credel) {
                credels.set(rowId, tabsrcRow);
            }
            else if (tabsrcRow._commit === TABREP_COMMITS.update) {
                updates.set(rowId, tabsrcRow);
            }
            else if (tabsrcRow._commit === TABREP_COMMITS.upddel) {
                deletes.set(rowId, tabsrcRow);
            }
            else if (tabsrcRow._commit === TABREP_COMMITS.delete) {
                deletes.set(rowId, tabsrcRow);
            }
            else
                throw new ErrorCustomImpossible('incorrect commit');
        }
        if (creates.size < 1 && credels.size < 1 && updates.size < 1 && deletes.size < 1)
            throw new ErrorCustomUnclassified('creates.size < 1 && credels.size < 1 && updates.size < 1 && deletes.size < ');
        ////////////////////////////////////////////////////////////////////////////
        // Формирование запросов.
        ////////////////////////////////////////////////////////////////////////////
        // Формирование запросов из данных. Create.
        const createRequests = new Map();
        const createArray = Array.from(creates.values())
            .map((tabsrcRow) => genExtractDocFromMainDoc({ docMain: tabsrcRow, domSchema: domSchemaCreate }));
        if (createArray.length > 0)
            createRequests.set(Array.from(creates.keys()), createArray);
        // Формирование запросов из данных. Update.
        const updateRequests = new Map();
        const trnUpdates = this.trnstack.getUpdates();
        for (const [rowId, tabsrcRow] of updates.entries()) {
            const trnUpdate = trnUpdates.get(rowId) || errorImpossible('');
            const { newVals } = trnUpdate;
            for (const key in newVals)
                if (newVals[key] !== tabsrcRow[key])
                    throw new ErrorCustomImpossible('');
            const keyDoc = genExtractDocFromMainDoc({ docMain: tabsrcRow, domSchema: domSchemaKey });
            if (typeof keyDoc !== 'object' || !keyDoc)
                throw new ErrorCustomType('');
            // const { filterSchema } = filtersource.getFilterSchema()
            // await tabsource.init<keyof typeof filterSchema>({ filterSchema: filterSchema as UndoPartial<typeof filterSchema> })
            updateRequests.set(rowId, { filterSchema: keyDoc, update: newVals });
        }
        // Формирование запросов из данных. Delete.
        const deleteRequests = new Map();
        for (const [rowId, tabsrcRow] of deletes.entries()) {
            const keyDoc = genExtractDocFromMainDoc({ docMain: tabsrcRow, domSchema: domSchemaKey });
            // if (typeof keyDoc !== 'object' || !keyDoc) throw new ErrorCustomType('')
            deleteRequests.set(rowId, keyDoc);
        }
        ////////////////////////////////////////////////////////////////////////////
        // Табквери.
        ////////////////////////////////////////////////////////////////////////////
        if (appOptions.trnapp)
            throw new ErrorCustomType('');
        const createRess = new Map();
        const updateRess = new Map();
        const deleteRess = new Map();
        try {
            appOptions.trnapp = new TransactionClient();
            const tabquery = new TabqueryRW({ tabExpression, domSchemasConfigName, appOptions });
            for (const [key, create] of createRequests.entries()) {
                const createRes = await tabquery.create({
                    create,
                    project: genProjectionFromDoc(domSchemaProject, true)
                });
                createRess.set(key, createRes);
            }
            for (const [key, updRequest] of updateRequests.entries()) {
                const { filterSchema, update } = updRequest;
                const updateRes = await tabquery.update({
                    filterSchema,
                    update: typifyNotPartial(update, Object.keys(update).length),
                    project: genProjectionFromDoc(domSchemaProject, true)
                });
                updateRess.set(key, updateRes);
            }
            for (const [key, filterSchema] of deleteRequests) {
                const deleteRes = await tabquery.delete({
                    filterSchema,
                    project: genProjectionFromDoc(domSchemaProject, true)
                });
                deleteRess.set(key, deleteRes);
            }
            await appOptions.trnapp.commit({ appOptions });
            creates.forEach((tabsrcRow) => { tabsrcRow._commit = ''; tabsrcRow._inform = TABREP_INFORMS.saved; });
            updates.forEach((tabsrcRow) => { tabsrcRow._commit = ''; tabsrcRow._inform = TABREP_INFORMS.saved; });
            deletes.forEach((tabsrcRow) => { tabsrcRow._commit = ''; tabsrcRow._inform = TABREP_INFORMS.saved; });
        }
        catch (error) {
            throw error;
        }
        finally {
            delete appOptions.trnapp;
        }
        ////////////////////////////////////////////////////////////////////////////
        // Обработка результата.
        ////////////////////////////////////////////////////////////////////////////
        // Обработка результата коммита табквери. Create.
        const docMainDummy = domainSchemaUtil.genDummyDocument({ domSchema: domSchemaMain });
        for (const rowIds of createRequests.keys()) {
            const reqResult = createRess.get(rowIds);
            if (!reqResult)
                throw new ErrorCustomType('');
            const createdDocs = reqResult.tabqRes.rows;
            const oldDocs = Array.from(creates.values());
            if (createdDocs.length !== oldDocs.length)
                throw new ErrorCustomType('');
            for (let i = 0; i < oldDocs.length; i++) {
                const createdDoc = createdDocs[i];
                if (!createdDoc)
                    throw new ErrorCustomImpossible('');
                const oldDoc = oldDocs[i];
                if (!oldDoc)
                    throw new ErrorCustomImpossible('');
                Object.assign(oldDoc, docMainDummy, createdDoc);
            }
        }
        // Обработка результата коммита табквери. Update.
        for (const rowId of updateRequests.keys()) {
            const reqResult = updateRess.get(rowId);
            if (!reqResult)
                throw new ErrorCustomType('');
            const updatedDocs = reqResult.tabqRes.rows;
            if (updatedDocs.length !== 1)
                throw new ErrorCustomType('');
            const updatedDoc = updatedDocs[0];
            if (!updatedDoc)
                throw new ErrorCustomType('');
            if (Object.keys(updatedDoc).length !== Object.keys(domSchemaProject).length)
                throw new ErrorCustomType('');
            const oldDoc = updates.get(rowId);
            if (!oldDoc)
                throw new ErrorCustomImpossible('');
            Object.assign(oldDoc, updatedDoc);
        }
        // Обработка результата коммита табквери. Delete.
        for (const rowId of deleteRequests.keys()) {
            const reqResult = deleteRess.get(rowId);
            if (!reqResult)
                throw new ErrorCustomType('');
            const deletedDocs = reqResult.tabqRes.rows;
            if (deletedDocs.length !== 1)
                throw new ErrorCustomType('');
            const deletedDoc = deletedDocs[0];
            if (!deletedDoc)
                throw new ErrorCustomType('');
            if (Object.keys(deletedDoc).length !== Object.keys(domSchemaProject).length)
                throw new ErrorCustomType('');
            const oldDoc = deletes.get(rowId);
            if (!oldDoc)
                throw new ErrorCustomImpossible('');
            Object.assign(oldDoc, deletedDoc);
            this.rows.delete(rowId);
        }
        if (deleteRequests.size > 0) {
            for (const rowId of credels.keys())
                this.rows.delete(rowId);
        }
        ////////////////////////////////////////////////////////////////////////////
        // Обновление фронта.
        ////////////////////////////////////////////////////////////////////////////
        if (creates.size > 0)
            this.front.update({ rows: creates });
        if (updates.size > 0)
            this.front.update({ rows: updates });
        if (deletes.size > 0)
            this.front.delete({ filter: { $in: Array.from(deletes.keys()) } });
        if (deletes.size > 0 && credels.size > 0)
            this.front.delete({ filter: { $in: Array.from(credels.keys()) } });
        ////////////////////////////////////////////////////////////////////////////
        // Util. Local.
        ////////////////////////////////////////////////////////////////////////////
        function genExtractDocFromMainDoc({ docMain, domSchema }) {
            const partialDoc = {};
            for (const key in domSchema)
                partialDoc[key] = docMain[key];
            return typifyNotPartial(partialDoc, Object.keys(domSchema).length);
        }
    }
    // Create.
    createEmptyRow() {
        const { domSchemaCreate } = this.domSchemasConfig;
        if (!domSchemaCreate)
            throw new ErrorCustomImpossible('!domSchemaCreate');
        const docCreateDummy = domainSchemaUtil.genDummyDocument({ domSchema: domSchemaCreate });
        this.create({ create: [docCreateDummy] });
    }
    create({ create }) {
        const { domSchemaMain } = this.domSchemasConfig;
        const docMainDummy = domainSchemaUtil.genDummyDocument({ domSchema: domSchemaMain });
        const tabsrcRows = new Map();
        for (const doc of create) {
            const tabsrcRow = {
                ...tabrepRowTechnicalPropsDummy, ...docMainDummy, ...doc
            };
            tabsrcRow._commit = TABREP_COMMITS.create;
            tabsrcRows.set(this.rowId.counter++, tabsrcRow);
        }
        // Обновляем стек табсорс транзакций.
        const { tabsrcTrn } = { tabsrcTrn: [] };
        const { tabsrcTrnOper } = {
            tabsrcTrnOper: { rowIds: Array.from(tabsrcRows.keys()), commit: TABREP_COMMITS.create }
        };
        tabsrcTrn.push(tabsrcTrnOper);
        this.trnstack.push({ tabsrcTrn });
        // Обновляем строки табсорс и фронт.
        tabsrcRows.forEach((value, key) => this.rows.set(key, value));
        this.front.create({ rows: tabsrcRows });
    }
    // Read.
    // @ts-ignore
    read({ filter }) {
        const result = new Map();
        for (const [rowId, tabsrcRow] of this.rows.entries()) {
            if (!filterUtil.isInFilter(rowId, filter))
                continue;
            result.set(rowId, tabsrcRow);
        }
        return result;
    }
    // Update.
    update({ filter, update }) {
        const tabsrcRows = new Map();
        const { tabsrcTrn } = { tabsrcTrn: [] };
        for (const [rowId, tabsrcRow] of this.rows.entries()) {
            if (!filterUtil.isInFilter(rowId, filter))
                continue;
            if (tabsrcRow._commit === '') { } // Do nothing.
            else if (tabsrcRow._commit === TABREP_COMMITS.create) { } // Do nothing. 
            else if (tabsrcRow._commit === TABREP_COMMITS.credel) {
                throw new ErrorCustomUnclassified('');
            }
            else if (tabsrcRow._commit === TABREP_COMMITS.delete) {
                throw new ErrorCustomUnclassified('');
            }
            else if (tabsrcRow._commit === TABREP_COMMITS.update) { } // Do nothing. 
            else if (tabsrcRow._commit === TABREP_COMMITS.upddel) {
                throw new ErrorCustomUnclassified('');
            }
            else
                throw new ErrorCustomType('incorrect commit');
            tabsrcRows.set(rowId, tabsrcRow);
            const oldVals = {};
            for (const key in update)
                oldVals[key] = tabsrcRow[key];
            const { tabsrcTrnOper } = {
                tabsrcTrnOper: { rowIds: [rowId], commit: TABREP_COMMITS.update, oldVals, newVals: update }
            };
            tabsrcTrn.push(tabsrcTrnOper);
        }
        for (const tabsrcRow of tabsrcRows.values()) {
            if (tabsrcRow._commit === '') {
                tabsrcRow._commit = TABREP_COMMITS.update;
                tabsrcRow._inform = '';
            }
            else if (tabsrcRow._commit === TABREP_COMMITS.create) { }
            else if (tabsrcRow._commit === TABREP_COMMITS.credel) {
                console.error('Ошибка:\n', new ErrorCustomUnclassified(''));
                continue;
            }
            else if (tabsrcRow._commit === TABREP_COMMITS.delete) {
                console.error('Ошибка:\n', new ErrorCustomUnclassified(''));
                continue;
            }
            else if (tabsrcRow._commit === TABREP_COMMITS.update) { }
            else if (tabsrcRow._commit === TABREP_COMMITS.upddel) {
                console.error('Ошибка:\n', new ErrorCustomUnclassified(''));
                continue;
            }
            else {
                console.error('Ошибка:\n', new ErrorCustomType('incorrect commit'));
                continue;
            }
            // Обновляем строки табсорс.
            Object.assign(tabsrcRow, update);
        }
        // Обновляем стек табсорс транзакций и фронт.
        this.trnstack.push({ tabsrcTrn });
        this.front.update({ rows: tabsrcRows });
    }
    // Delete.
    delete({ filter }) {
        const rowIds = []; // Общий список обновлений и удалений.
        const updates = new Map();
        const deletes = [];
        for (const [rowId, tabsrcRow] of this.rows.entries()) {
            if (!filterUtil.isInFilter(rowId, filter))
                continue;
            if (tabsrcRow._commit === '') {
                updates.set(rowId, tabsrcRow);
            }
            else if (tabsrcRow._commit === TABREP_COMMITS.create) {
                deletes.push(rowId);
            }
            else if (tabsrcRow._commit === TABREP_COMMITS.credel) {
                throw new ErrorCustomType('');
            }
            else if (tabsrcRow._commit === TABREP_COMMITS.delete) {
                continue;
            }
            else if (tabsrcRow._commit === TABREP_COMMITS.update) {
                updates.set(rowId, tabsrcRow);
            }
            else if (tabsrcRow._commit === TABREP_COMMITS.upddel) {
                throw new ErrorCustomType('');
            }
            else
                throw new ErrorCustomType('incorrect commit');
            rowIds.push(rowId);
        }
        const { tabsrcTrn } = { tabsrcTrn: [] };
        const { tabsrcTrnOper } = {
            tabsrcTrnOper: { rowIds, commit: TABREP_COMMITS.delete }
        };
        tabsrcTrn.push(tabsrcTrnOper);
        for (const rowId of rowIds) {
            const tabsrcRow = this.rows.get(rowId);
            if (!tabsrcRow) {
                console.error('Ошибка:\n', new ErrorCustomType(''));
                continue;
            }
            if (tabsrcRow._commit === '') {
                tabsrcRow._commit = TABREP_COMMITS.delete;
                tabsrcRow._inform = '';
            }
            else if (tabsrcRow._commit === TABREP_COMMITS.create) {
                tabsrcRow._commit = TABREP_COMMITS.credel;
            }
            else if (tabsrcRow._commit === TABREP_COMMITS.credel) {
                console.error('Ошибка:\n', new ErrorCustomType(''));
            }
            else if (tabsrcRow._commit === TABREP_COMMITS.delete) {
                continue;
            }
            else if (tabsrcRow._commit === TABREP_COMMITS.update) {
                tabsrcRow._commit = TABREP_COMMITS.upddel;
            }
            else if (tabsrcRow._commit === TABREP_COMMITS.upddel) {
                console.error('Ошибка:\n', new ErrorCustomType(''));
            }
            else {
                console.error('Ошибка:\n', new ErrorCustomType('incorrect commit'));
            }
        }
        // Обновляем стек табсорс транзакций и фронт.
        this.trnstack.push({ tabsrcTrn });
        this.front.update({ rows: updates });
        this.front.delete({ filter: { $in: deletes } });
    }
}
class TabsourceTransactionStack {
    stack = []; // Массив транзакций.
    shift = 0;
    clear() {
        this.shift = 0;
        this.stack.length = 0;
    }
    getUpdates() {
        const updates = new Map();
        for (const trnsac of this.stack) {
            for (const oper of trnsac) {
                if (oper.commit !== 'update')
                    continue;
                const { oldVals, newVals } = oper;
                if (Object.keys(oldVals).length !== Object.keys(newVals).length)
                    throw new ErrorCustomImpossible('');
                for (const rowId of oper.rowIds) {
                    let update = updates.get(rowId);
                    if (!update) {
                        update = { oldVals: {}, newVals: {} };
                        updates.set(rowId, update);
                    }
                    for (const key in oldVals) {
                        const oldVal = oldVals[key];
                        const newVal = newVals[key];
                        const updateNewVals = update.newVals;
                        if (key in updateNewVals)
                            if (updateNewVals[key] !== oldVal)
                                throw new ErrorCustomImpossible('');
                        update.newVals[key] = newVal;
                    }
                }
            }
        }
        return updates;
    }
    commit() { throw new ErrorCustomUnclassified('not implemented'); }
    slice(len) {
        if (!Number.isInteger(len))
            throw new ErrorCustomType('');
        if (len === 0)
            throw new ErrorCustomType('');
        const borderLeft = len < 0 ? len + this.shift : this.shift;
        const borderRigh = len > 0 ? len + this.shift : this.shift;
        if (borderLeft < 0)
            throw new ErrorCustomType('');
        if (borderRigh > this.stack.length)
            throw new ErrorCustomType('');
        let tabsrcTrns;
        if (borderLeft > 0) {
            tabsrcTrns = this.stack.slice(-borderRigh, -borderLeft);
        }
        else if (borderLeft === 0) {
            tabsrcTrns = this.stack.slice(-borderRigh);
        }
        else
            throw new ErrorCustomType('');
        this.shift += len;
        return { tabsrcTrns };
    }
    push({ tabsrcTrn }) {
        if (this.shift < 0)
            throw new ErrorCustomType('');
        if (!Number.isInteger(this.shift))
            throw new ErrorCustomType('');
        if (this.shift > this.stack.length)
            throw new ErrorCustomType('');
        if (this.shift > 0) {
            this.stack.splice(-this.shift, this.shift);
            this.shift = 0;
        }
        this.stack.push(tabsrcTrn);
    }
    undo({ len } = {}) {
        if (len === undefined)
            len = 1;
        if (len < 1)
            throw new ErrorCustomType('');
        return this.slice(len);
    }
    redo({ len } = {}) {
        if (len === undefined)
            len = 1;
        if (len < 1)
            throw new ErrorCustomType('');
        return this.slice(-len);
    }
}
