import { domainSchemaUtil } from './domain_schema.js';
import { TabqueryRW } from './tabquery.js';
import { tabrepRowTechnicalPropsDummy } from './tabrep.js';
import { genProjectionFromDoc } from './util.js';
export class TabqueryTabrepInit {
    busyPromise = null;
    appOptions;
    tabrep;
    domSchemasConfig;
    rows = new Map();
    rowId;
    tabExpression;
    constructor({ tabExpression, tabrep, appOptions }) {
        this.appOptions = appOptions;
        this.tabExpression = tabExpression;
        this.tabrep = tabrep;
        const { domSchemasConfig, rows, rowId } = tabrep;
        this.domSchemasConfig = domSchemasConfig;
        this.rows = rows;
        this.rowId = rowId;
    }
    async initAsync({ filterSchema }) {
        const { tabExpression, appOptions } = this;
        const { domSchemasConfigName, domSchemaMain, domSchemaProject } = this.domSchemasConfig;
        const tabquery = new TabqueryRW({ tabExpression, domSchemasConfigName, appOptions });
        const { tabqRes } = await tabquery.read({
            filterSchema,
            project: genProjectionFromDoc(domSchemaProject, true),
            projectOptions: {}
        });
        const docs = tabqRes.rows;
        const docMainDummy = domainSchemaUtil.genDummyDocument({ domSchema: domSchemaMain });
        for (const doc of docs) {
            const tabsrcRow = {
                ...tabrepRowTechnicalPropsDummy, ...docMainDummy, ...doc
            };
            const rowId = this.rowId.counter++;
            this.rows.set(rowId, tabsrcRow);
        }
        this.tabrep.init();
    }
}
