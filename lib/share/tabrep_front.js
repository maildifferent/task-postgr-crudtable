import { ErrorCustomType, errorImpossible, errorType } from './error.js';
import { filterUtil } from './filter.js';
import { Tabrep, TABREP_KEYS } from './tabrep.js';
import { documentZ } from './util_front.js';
export const TABREP_CSS_CLASSES = Object.freeze({
    icon: 'icon',
    tabsource_container: 'tabsource_container',
    tabsource_toolbar: 'tabsource_toolbar',
    tabsource_check: 'tabsource_check',
    editCel: 'editcel',
    editBox: 'editbox',
    header: 'header',
    paste_capture_area: 'paste_capture_area',
    selected: 'selected',
    resizer: 'resizer',
});
////////////////////////////////////////////////////////////////////////////////
// Main.
////////////////////////////////////////////////////////////////////////////////
export class TabrepFront {
    appOptions;
    elems;
    tabrep;
    constructor({ domSchemasConfig, parent, appOptions }) {
        this.appOptions = appOptions;
        this.appOptions;
        this.elems = createTableElems({ parent });
        this.tabrep = new Tabrep({ domSchemasConfig, appOptions, front: this });
        const { columns } = this.tabrep;
        const { tabHead } = this.elems;
        initColumnHeaders({ columns, tabHead });
    }
    init({ rows }) {
        this.elems.tabBody.innerHTML = '';
        this.create({ rows });
    }
    create({ rows }) {
        const trs = [];
        for (const [rowId, row] of rows.entries())
            trs.push(renderRow({ rowId, row }));
        this.elems.tabBody.prepend(...trs);
    }
    update({ rows }) {
        for (const [rowId, row] of rows.entries()) {
            const newTr = renderRow({ rowId, row });
            const oldTr = this.elems.tabBody.querySelector('tr[data-id="' + rowId + '"]') || errorType('');
            oldTr.replaceWith(newTr);
        }
    }
    delete({ filter }) {
        const trs = this.elems.tabBody.querySelectorAll('tr');
        for (const tr of trs) {
            const id = tr.dataset['id'] || errorImpossible('');
            const rowId = Number(id);
            if (filterUtil.isInFilter(rowId, filter))
                tr.remove();
        }
    }
}
////////////////////////////////////////////////////////////////////////////////
// Util. Local.
////////////////////////////////////////////////////////////////////////////////
function initColumnHeaders({ columns, tabHead }) {
    tabHead.innerHTML = '';
    tabHead.setAttribute('style', '');
    let tr = document.createElement('tr');
    tabHead.append(tr);
    for (let i = 0; i < columns.length; i++) {
        const fieldName = columns[i] || errorType('');
        const td = document.createElement('td');
        td.tabIndex = 0;
        td.dataset['id'] = fieldName;
        tr.append(td);
        const div = documentZ.createElement('div').classlist.add(TABREP_CSS_CLASSES.header).appendTo(td).getElem();
        div.textContent = fieldName;
    }
}
function renderRow({ rowId, row }) {
    const tr = document.createElement('tr');
    tr.tabIndex = 0;
    tr.dataset['id'] = '' + rowId;
    for (const [key, value] of Object.entries(row)) {
        const td = document.createElement('td');
        td.tabIndex = 0;
        tr.append(td);
        td.textContent = '' + value;
        if (key === TABREP_KEYS._check) {
            td.classList.add(TABREP_CSS_CLASSES.tabsource_check);
        }
    }
    return tr;
}
function createTableElems({ parent }) {
    const container = documentZ.createElement('div')
        .classlist.add(TABREP_CSS_CLASSES.tabsource_container)
        .appendTo(parent)
        .getElem();
    // Toolbar.
    const toolbar = documentZ.createElement('div')
        .classlist.add(TABREP_CSS_CLASSES.tabsource_toolbar)
        .appendTo(container)
        .getElem();
    toolbar.style.position = 'sticky';
    toolbar.style.top = '0';
    toolbar.style.backgroundColor = 'white';
    // Table.
    const tabMain = documentZ.createElement('table')
        .appendTo(container)
        .getElem();
    const tabHead = documentZ.createElement('thead')
        .appendTo(tabMain)
        .getElem();
    const tabBody = documentZ.createElement('tbody')
        .appendTo(tabMain)
        .getElem();
    tabBody.tabIndex = 0;
    const tabFoot = documentZ.createElement('tfoot')
        .appendTo(tabMain)
        .getElem();
    return {
        container,
        toolbar,
        tabMain, tabHead, tabBody, tabFoot
    };
}
////////////////////////////////////////////////////////////////////////////////
// Util. Public.
////////////////////////////////////////////////////////////////////////////////
export function tabrepFrontGetRowId(row) {
    const rowIdString = row.dataset['id'] || errorType('row.dataset[id]');
    const rowId = Number(rowIdString);
    if (!Number.isInteger(rowId) || rowId < 0)
        throw new ErrorCustomType('!Number.isInteger(rowId) || rowId < 0');
    return rowId;
}
