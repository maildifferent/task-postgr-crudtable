////////////////////////////////////////////////////////////////////////////////
// Tabrep. Constants and types.
////////////////////////////////////////////////////////////////////////////////
export const TABREP_KEYS = Object.freeze({
    _check: '_check',
    _commit: '_commit',
    _inform: '_inform',
});
export const TABREP_COMMITS = Object.freeze({
    create: 'create',
    credel: 'credel',
    delete: 'delete',
    update: 'update',
    upddel: 'upddel', // Update -> delete.
});
export const TABREP_INFORMS = Object.freeze({
    changed: 'changed',
    error: 'error',
    saved: 'saved',
});
export const tabrepRowTechnicalPropsDummy = Object.freeze({
    _check: '',
    _commit: '',
    _inform: '',
});
////////////////////////////////////////////////////////////////////////////////
// Tabrep. Source.
////////////////////////////////////////////////////////////////////////////////
export class Tabrep {
    static { }
    busyPromise = null;
    appOptions;
    front;
    // Счетчик для генерации ключа строки используется классами, которые
    // инициализируют и CRUD-ят строки.
    rowId = { counter: 0 };
    domSchemasConfig;
    rows = new Map();
    columns = [];
    constructor({ domSchemasConfig, front, appOptions }) {
        this.appOptions = appOptions;
        this.appOptions;
        this.domSchemasConfig = domSchemasConfig;
        this.front = front;
        // Fill columns.
        const { domSchemaMain } = this.domSchemasConfig;
        let keyTech;
        for (keyTech in tabrepRowTechnicalPropsDummy)
            this.columns.push(keyTech);
        for (const key in domSchemaMain)
            this.columns.push(key);
    }
    init() {
        const rendererFeed = new Map();
        for (const [rowId, tabsrcRow] of this.rows.entries()) {
            rendererFeed.set(rowId, tabsrcRow);
        }
        this.front.init({ rows: rendererFeed });
    }
}
