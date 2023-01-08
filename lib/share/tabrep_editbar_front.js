import { ErrorCustomType } from './error.js';
import { tabrepFrontGetRowId, TABREP_CSS_CLASSES } from './tabrep_front.js';
import { documentZ } from './util_front.js';
export function tabrepEditbarFrontFunctionality({ tabrepCrud, parent, messagebox }) {
    const butnCreate = createButton({ text: 'Create', listener: onButnCreateClick, parent });
    const butnDelete = createButton({ text: 'Delete', listener: onButnDeleteClick, parent });
    const butnCommit = createButton({ text: 'Commit', listener: onButnCommitClick, parent });
    return { butnCreate, butnDelete, butnCommit };
    //////////////////////////////////////////////////////////////////////////////
    // Util. Local.
    //////////////////////////////////////////////////////////////////////////////
    function onButnCreateClick(event) {
        // const row: string[] = new Array(tabsource.fields.length).fill('')
        try {
            tabrepCrud.createEmptyRow();
        }
        catch (error) {
            messagebox.message(error);
        }
    }
    function onButnDeleteClick(event) {
        try {
            const rowIds = [];
            const rows = document.querySelectorAll('tr.' + TABREP_CSS_CLASSES.selected);
            for (const row of rows) {
                if (!(row instanceof HTMLTableRowElement))
                    throw new ErrorCustomType('');
                const rowId = tabrepFrontGetRowId(row);
                rowIds.push(rowId);
            }
            tabrepCrud.delete({ filter: { $in: rowIds } });
        }
        catch (error) {
            messagebox.message(error);
        }
    }
    async function onButnCommitClick(event) {
        try {
            await tabrepCrud.commitAsync();
        }
        catch (error) {
            messagebox.message(error);
        }
    }
    function createButton({ text, parent, listener }) {
        const button = documentZ.createElement('button').appendTo(parent).getElem();
        const span = documentZ.createElement('span').appendTo(button).getElem();
        span.textContent = text;
        const div = documentZ.createElement('div')
            .classlist.add(TABREP_CSS_CLASSES.icon).appendTo(button).getElem();
        div.style.backgroundImage = 'url(./icons_svg/login.svg)';
        // parent.append('\u00A0') // append(document.createTextNode("\u00A0"))
        button.addEventListener('click', listener);
        return button;
    }
}
