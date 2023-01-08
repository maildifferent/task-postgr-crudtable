import { ApplicationOptions } from './application.js';
import { domainSchemasUser } from './domain_schemas/domain_schemas_user.js';
import { ErrorCustomUnclassified } from './error.js';
import { FiltersourceFront } from './filtersource_front.js';
import { Messagebox } from './messagebox_front.js';
import { TabqueryTabrepCrud } from './tabquery_tabrep_crud.js';
import { TabqueryTabrepInit } from './tabquery_tabrep_init.js';
import { tabrepColresizerDblclickFunctionality, tabrepColresizerFunctionality } from './tabrep_colresizer_front.js';
import { tabrepEditbarFrontFunctionality } from './tabrep_editbar_front.js';
import { tabrepEditboxFrontFunctionality } from './tabrep_editbox_front.js';
import { TabrepFront } from './tabrep_front.js';
import { tabrepSelectFrontFunctionality } from './tabrep_select_front.js';
import { documentZ } from './util_front.js';
export const TABQUERY_CSS_CLASSES = Object.freeze({
    tabquery_container: 'tabquery_container',
    tabquery_payload: 'tabquery_payload',
    tabquery_toolbar: 'tabquery_toolbar',
});
main();
async function main() {
    const body = document.body;
    const tabqueryContainer = documentZ.createElement('div')
        .classlist.add(TABQUERY_CSS_CLASSES.tabquery_container).appendTo(body).getElem();
    const tabqueryToolbar = documentZ.createElement('div')
        .classlist.add(TABQUERY_CSS_CLASSES.tabquery_toolbar).appendTo(tabqueryContainer).getElem();
    const runButton = documentZ.createElement('button').appendTo(tabqueryToolbar).getElem();
    runButton.textContent = 'Run report';
    const span = documentZ.createElement('h3').appendTo(tabqueryToolbar).getElem();
    span.textContent = 'Tabquery report';
    const { appOptions } = new ApplicationOptions({});
    appOptions.authrz = { token: '' };
    // Messagebox.
    const messagebox = new Messagebox(tabqueryContainer);
    // Filtersource.
    const { domSchemaFilter } = domainSchemasUser;
    const filtersource = new FiltersourceFront({
        filterSchema: {}, domSchema: domSchemaFilter, appOptions, parent: tabqueryContainer
    });
    // Payload.
    const payloadContainer = documentZ.createElement('div')
        .classlist.add(TABQUERY_CSS_CLASSES.tabquery_payload).appendTo(tabqueryContainer).getElem();
    // Run report.
    let runBusyFlag = false;
    runButton.addEventListener('click', async () => {
        if (runBusyFlag) {
            messagebox.message(new ErrorCustomUnclassified('runBusyFlag'));
            return;
        }
        runBusyFlag = true;
        try {
            payloadContainer.innerHTML = '';
            const { filterSchema } = filtersource.getFilterSchema();
            await genPayload({ filterSchema, parent: payloadContainer, messagebox, appOptions });
        }
        catch (error) {
            messagebox.message(error);
        }
        finally {
            runBusyFlag = false;
        }
    });
}
async function genPayload({ filterSchema, parent, messagebox, appOptions }) {
    messagebox.clear();
    const tabrepFront = new TabrepFront({ domSchemasConfig: domainSchemasUser, parent, appOptions });
    const { tabrep } = tabrepFront;
    const { columns } = tabrep;
    const { tabExpression } = { tabExpression: 'users' };
    const { container, tabMain, toolbar, tabHead, tabBody } = tabrepFront.elems;
    // Add rows initializer.
    const tabqueryTabrepInit = new TabqueryTabrepInit({ tabExpression, tabrep, appOptions });
    await tabqueryTabrepInit.initAsync({ filterSchema: filterSchema });
    // Add columns resizer functionality.
    const resizers = tabrepColresizerFunctionality(tabMain, tabHead);
    tabrepColresizerDblclickFunctionality(tabMain, resizers);
    // Add select functionality.
    const editingCell = { td: null };
    tabrepSelectFrontFunctionality({ tabMain, tabHead, tabBody, columns, messagebox, editingCell });
    // Add CRUD.
    const tabqueryTabrepCrud = new TabqueryTabrepCrud({ tabExpression, tabrep, appOptions });
    // Add editbar functionality.
    const tabrepEditbar = tabrepEditbarFrontFunctionality({ tabrepCrud: tabqueryTabrepCrud, parent: toolbar, messagebox });
    tabrepEditbar;
    // Add editbox functionality.
    tabrepEditboxFrontFunctionality({
        container, tabMain, tabBody,
        tabrepCrud: tabqueryTabrepCrud, domSchemasConfig: domainSchemasUser, columns, editingCell, messagebox
    });
}
