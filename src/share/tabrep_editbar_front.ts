import { ErrorCustomType } from './error.js'
import { Messagebox } from './messagebox_front.js'
import { TabrepRowIdT } from './tabrep.js'
import { TabrepCrudAbstract } from './tabrep_crud_abstract.js'
import { tabrepFrontGetRowId, TABREP_CSS_CLASSES } from './tabrep_front.js'
import { documentZ } from './util_front.js'

export function tabrepEditbarFrontFunctionality<
  DocumentKey,
  DocumentMain extends DocumentKey & DocumentProject & DocumentFilter & DocumentCreate,
  DocumentProject extends DocumentKey,
  DocumentFilter extends DocumentKey,
  DocumentCreate
>({ tabrepCrud, parent, messagebox }
  : { tabrepCrud: TabrepCrudAbstract<DocumentKey, DocumentMain, DocumentProject, DocumentFilter, DocumentCreate> }
  & { parent: HTMLElement }
  & { messagebox: Messagebox }
) {
  const butnCreate = createButton({ text: 'Create', listener: onButnCreateClick, parent })
  const butnDelete = createButton({ text: 'Delete', listener: onButnDeleteClick, parent })
  const butnCommit = createButton({ text: 'Commit', listener: onButnCommitClick, parent })

  return { butnCreate, butnDelete, butnCommit }

  //////////////////////////////////////////////////////////////////////////////
  // Util. Local.
  //////////////////////////////////////////////////////////////////////////////
  function onButnCreateClick(event: MouseEvent) {
    // const row: string[] = new Array(tabsource.fields.length).fill('')
    try { tabrepCrud.createEmptyRow() } catch (error) { messagebox.message(error) }
  }

  function onButnDeleteClick(event: MouseEvent) {
    try {
      const rowIds: TabrepRowIdT[] = []
      const rows = document.querySelectorAll('tr.' + TABREP_CSS_CLASSES.selected)
      for (const row of rows) {
        if (!(row instanceof HTMLTableRowElement)) throw new ErrorCustomType('')
        const rowId = tabrepFrontGetRowId(row)
        rowIds.push(rowId)
      }
      tabrepCrud.delete({ filter: { $in: rowIds } })
    } catch (error) { messagebox.message(error) }

  }

  async function onButnCommitClick(event: MouseEvent) {
    try { await tabrepCrud.commitAsync() } catch (error) { messagebox.message(error) }
  }

  function createButton(
    { text, parent, listener }
      : { text: string, parent: HTMLElement, listener: (event: MouseEvent) => void }
  ): HTMLButtonElement {
    const button = documentZ.createElement('button').appendTo(parent).getElem()
    const span = documentZ.createElement('span').appendTo(button).getElem()
    span.textContent = text
    const div = documentZ.createElement('div')
      .classlist.add(TABREP_CSS_CLASSES.icon).appendTo(button).getElem()
    div.style.backgroundImage = 'url(./icons_svg/login.svg)'

    // parent.append('\u00A0') // append(document.createTextNode("\u00A0"))
    button.addEventListener('click', listener)
    return button
  }
}
