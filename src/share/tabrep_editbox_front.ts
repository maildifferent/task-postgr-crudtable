import { DomainSchemasConfigI, DomainSchemaT, domainSchemaUtil } from './domain_schema.js'
import { ErrorCustomImpossible, ErrorCustomType, ErrorCustomUnclassified, errorType } from './error.js'
import { KEYS_CHARACTERS, KEYS_NUMPAD } from './keyboard_keys.js'
import { Messagebox } from './messagebox_front.js'
import { projectionUtil } from './projection.js'
import { TabrepRowIdT } from './tabrep.js'
import { TabrepCrudAbstract } from './tabrep_crud_abstract.js'
import { tabrepFrontGetRowId, TABREP_CSS_CLASSES } from './tabrep_front.js'
import { tabrepSelectGetSelected } from './tabrep_select_front.js'
import { trace, TRACE_TYP } from './trace.js'
import { convertClipboardTextToArray } from './util.js'
import { documentZ } from './util_front.js'

////////////////////////////////////////////////////////////////////////////////
// Cell editor.
////////////////////////////////////////////////////////////////////////////////
export function tabrepEditboxFrontFunctionality<
  DocumentKey,
  DocumentMain extends DocumentKey & DocumentProject & DocumentFilter & DocumentCreate,
  DocumentProject extends DocumentKey,
  DocumentFilter extends DocumentKey,
  DocumentCreate
>(
  { container, tabMain, tabBody, tabrepCrud, domSchemasConfig, columns, editingCell, messagebox }
    : { container: HTMLDivElement, tabMain: HTMLTableElement, tabBody: HTMLTableSectionElement }
    & { tabrepCrud: TabrepCrudAbstract<DocumentKey, DocumentMain, DocumentProject, DocumentFilter, DocumentCreate> }
    & DomainSchemasConfigI<DocumentKey, DocumentMain, DocumentProject, DocumentFilter, DocumentCreate>
    & { columns: string[] }
    & { editingCell: { td: HTMLTableCellElement | null } }
    & { messagebox: Messagebox }
): void {
  const { domSchemaCreate } = domSchemasConfig
  if (!domSchemaCreate) throw new ErrorCustomImpossible('!domSchemaCreate')

  editingCell
  let editingCellOldHtml: string | null = null
  const editbox = documentZ.createElement('input').classlist.add(TABREP_CSS_CLASSES.editBox).getElem()

  const pasteCell: { td: HTMLTableCellElement | null } = { td: null }

  const pasteCaptureArea = (() => {
    const captureAreaContainer = documentZ.createElement('div').classlist
      .add(TABREP_CSS_CLASSES.paste_capture_area).appendTo(container).getElem()
    captureAreaContainer.style.zIndex = '-500'
    captureAreaContainer.style.width = '0px'
    captureAreaContainer.style.height = '0px'
    captureAreaContainer.style.overflow = 'hidden'
    captureAreaContainer.style.position = 'fixed'

    const captureArea = documentZ.createElement('div').appendTo(captureAreaContainer).getElem()
    captureArea.contentEditable = 'true'
    captureArea.addEventListener('paste', (event: ClipboardEvent) => {
      if (!pasteCell.td) return
      const targetCell = pasteCell.td
      pasteCell.td = null
      targetCell.focus()

      pasteClipboardEventDataIntoCell({ inpCell: targetCell, event, focusElem: null, domSchemaCreate, columns, tabMain, tabrepCrud })
    })

    return captureArea
  })()

  // Listeners.
  editbox.addEventListener('blur', onBlurEditbox_doNothing)
  editbox.addEventListener('focusout', onFocusoutEditbox_finishEdit)
  editbox.addEventListener('keydown', onKeydownEditbox_finishEdit)

  tabBody.addEventListener('click', onClickTbody_doNothing)
  tabBody.addEventListener('dblclick', onDblclickTbody_makeEditable)
  tabBody.addEventListener('focusin', onFocusinTbody_doNothing)

  tabMain.addEventListener('keydown', onKeydownTable_copyPasteSelectAllClear)
  tabBody.addEventListener('keydown', onKeydownTbody_makeCellEditable)

  tabBody.addEventListener('paste', onPasteTbody_pasteIntoActiveCell)

  //////////////////////////////////////////////////////////////////////////////
  // Listeners. Editbox.
  //////////////////////////////////////////////////////////////////////////////

  function onBlurEditbox_doNothing(event: FocusEvent) {
    trace({ typ: TRACE_TYP.listener, msg: 'editbox: blur: doNothing' })
  }

  function onFocusoutEditbox_finishEdit(event: FocusEvent) {
    trace({ typ: TRACE_TYP.listener, msg: 'editbox: focusout: finishEdit' })

    const focusElem = event.relatedTarget instanceof HTMLElement ? event.relatedTarget : null
    try { finishCellEdit({ isOk: true, focusElem }) } catch (err) { messagebox.message(err) }
  }

  function onKeydownEditbox_finishEdit(event: KeyboardEvent) {
    trace({ typ: TRACE_TYP.listener, msg: 'editbox: keydown: finishEdit: ' + event.code })

    if (event.ctrlKey || event.shiftKey || event.metaKey || event.altKey) return
    const c = event.code
    if (c !== 'Escape' && c !== 'Enter' && c !== 'NumpadEnter' && c !== 'Tab') return

    const updateFlag = !(c === 'Escape')

    try { finishCellEdit({ isOk: updateFlag, focusElem: null }) } catch (err) { messagebox.message(err) }
  }

  //////////////////////////////////////////////////////////////////////////////
  // Listeners. Table, tbody.
  //////////////////////////////////////////////////////////////////////////////
  function onClickTbody_doNothing(event: MouseEvent) {
    trace({ typ: TRACE_TYP.listener, msg: 'tbody: click: doNothing' })
  }

  function onDblclickTbody_makeEditable(event: MouseEvent) {
    trace({ typ: TRACE_TYP.listener, msg: 'tbody: dblclick: makeEditable' })

    if (event.ctrlKey || event.shiftKey || event.metaKey || event.altKey) return
    try { makeEventTargetEditable(event.target) } catch (err) { messagebox.message(err) }
  }

  function onFocusinTbody_doNothing(event: FocusEvent) {
    trace({ typ: TRACE_TYP.listener, msg: 'tbody: focusin: doNothing' })

  }

  function onKeydownTable_copyPasteSelectAllClear(event: KeyboardEvent) {
    trace({ typ: TRACE_TYP.listener, msg: 'table: keydown: copyPasteSelectAllClear: ' + event.code })

    if (event.target === editbox) return
    if (event.shiftKey || event.metaKey || event.altKey) return

    try {
      if (!domSchemaCreate) throw new ErrorCustomImpossible('!domSchemaCreate')
      if (event.ctrlKey && event.code === 'KeyV') pasteIntoCaptureArea({ tabBody, pasteCell, pasteCaptureArea })
      else if (!event.ctrlKey && event.code === 'Delete') clearCells({ domSchemaCreate, tabBody, columns, tabMain, tabrepCrud })
    } catch (err) { messagebox.message(err) }
  }

  function onKeydownTbody_makeCellEditable(event: KeyboardEvent) {
    trace({ typ: TRACE_TYP.listener, msg: 'tbody: keydown: makeCellEditable: ' + event.code })

    if (event.target === editbox) return
    if (event.ctrlKey || event.metaKey || event.altKey) return
    if (event.code === 'F2') { }
    else if (KEYS_CHARACTERS.has(event.code)) { }
    else if ((KEYS_NUMPAD.has(event.code) && event.getModifierState('NumLock'))) { }
    else return

    try { makeEventTargetEditable(event.target) } catch (err) { messagebox.message(err) }
  }


  function onPasteTbody_pasteIntoActiveCell(event: ClipboardEvent) {
    trace({ typ: TRACE_TYP.listener, msg: 'tbody: paste: pasteIntoActiveCell' })

    // СЮДА БОЛЬШЕ НЕ ПОПАДАЕМ!
    console.error('Сюда попадать вроде больше не должны.')

    const activeCell = document.activeElement
    if (!(activeCell instanceof HTMLTableCellElement)) throw new ErrorCustomType('')

    if (!domSchemaCreate) throw new ErrorCustomImpossible('!domSchemaCreate')
    try { pasteClipboardEventDataIntoCell({ inpCell: activeCell, event, focusElem: null, domSchemaCreate, columns, tabMain, tabrepCrud }) } catch (err) { messagebox.message(err) }
  }

  //////////////////////////////////////////////////////////////////////////////
  // Util. Local.
  //////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////
  // Edit.
  //////////////////////////////////////////////////////////////////////////////
  function isEditableCell(tdElem: HTMLTableCellElement): boolean {
    const key = columns[tdElem.cellIndex] || errorType('')

    const { domSchemaCreate } = domSchemasConfig
    if (!domSchemaCreate) throw new ErrorCustomImpossible('!domSchemaCreate')
    if (!(key in domSchemaCreate)) throw new ErrorCustomType('!(key in domSchemaCreate)')

    return true
  }

  function makeEventTargetEditable(eventTarget: EventTarget | null): void {
    if (!(eventTarget instanceof HTMLTableCellElement)) throw new ErrorCustomType()
    if (!tabBody.contains(eventTarget)) throw new ErrorCustomType()
    makeCellEditable(eventTarget)
  }

  function makeCellEditable(tdElem: HTMLTableCellElement): void {
    if (editingCell.td) return
    editingCell.td = tdElem
    try { isEditableCell(tdElem) } catch (error) { editingCell.td = null; throw error }

    const bordersWidth = editingCell.td.offsetWidth - editingCell.td.clientWidth
    const bordersHeight = editingCell.td.offsetHeight - editingCell.td.clientHeight
    const rect = editingCell.td.getBoundingClientRect()
    editbox.style.width = (rect.width - bordersWidth) + 'px'
    editbox.style.height = (rect.height - bordersHeight) + 'px'

    editingCellOldHtml = editingCell.td.innerHTML
    editbox.value = editingCell.td.innerHTML

    editingCell.td.classList.add(TABREP_CSS_CLASSES.editCel)
    editingCell.td.innerHTML = ''
    editingCell.td.append(editbox)
    editbox.focus()
  }

  function finishCellEdit(
    { isOk, focusElem }
      : { isOk: boolean, focusElem: HTMLElement | null }
  ): void {
    if (!editingCell.td) return

    const editingCell_ = editingCell.td; editingCell.td = null
    const value = editbox.value; editbox.value = ''
    const oldHtml = editingCellOldHtml; editingCellOldHtml = null

    editingCell_.classList.remove(TABREP_CSS_CLASSES.editCel)


    const focusFlag = (document.activeElement === editbox)
    editingCell_.innerHTML = ''
    if (focusFlag) editingCell_.focus()

    try {
      if (!isOk || value === oldHtml) {

        editingCell_.innerHTML = oldHtml || ''
        return
      }

      if (!domSchemaCreate) throw new ErrorCustomImpossible('!domSchemaCreate')

      pasteClipboardArrayIntoCell({ inpCell: editingCell_, strArrs: [[value]], focusElem, domSchemaCreate, columns, tabMain, tabrepCrud })


      editingCell_.innerHTML = value
    } catch (error) {

      editingCell_.innerHTML = oldHtml || ''
      throw error
    }
  }
}

//////////////////////////////////////////////////////////////////////////////
// Paste.
//////////////////////////////////////////////////////////////////////////////
interface ClassesCellI { cellIndex: number, classes: string[] }
interface ClassesRowI { rowIndex: number, classes: string[], cells: ClassesCellI[] }

function pasteIntoCaptureArea(
  { tabBody, pasteCell, pasteCaptureArea }
    : { tabBody: HTMLTableSectionElement; pasteCell: { td: HTMLTableCellElement | null }; pasteCaptureArea: HTMLDivElement }
): void {
  const activeCell = document.activeElement
  if (!(activeCell instanceof HTMLTableCellElement)) throw new ErrorCustomType('')
  if (!tabBody.contains(activeCell)) return
  pasteCell.td = activeCell
  pasteCaptureArea.focus()
}

function pasteClipboardEventDataIntoCell<
  DocumentKey,
  DocumentMain extends DocumentKey & DocumentProject & DocumentFilter & DocumentCreate,
  DocumentProject extends DocumentKey,
  DocumentFilter extends DocumentKey,
  DocumentCreate
>(
  { inpCell, event, focusElem, domSchemaCreate, columns, tabMain, tabrepCrud }
    : { inpCell: HTMLTableCellElement, event: ClipboardEvent, focusElem: HTMLElement | null }
    & { domSchemaCreate: DomainSchemaT<DocumentCreate> }
    & { columns: string[] }
    & { tabMain: HTMLTableElement }
    & { tabrepCrud: TabrepCrudAbstract<DocumentKey, DocumentMain, DocumentProject, DocumentFilter, DocumentCreate> }
): void {
  // (event.clipboardData || window.clipboardData)
  if (event.clipboardData === null) return
  const clipText = (event.clipboardData).getData('text')
  const clipArr = convertClipboardTextToArray(clipText)

  pasteClipboardArrayIntoCell({ inpCell, strArrs: clipArr, focusElem, domSchemaCreate, columns, tabMain, tabrepCrud })
}

function pasteClipboardArrayIntoCell<
  DocumentKey,
  DocumentMain extends DocumentKey & DocumentProject & DocumentFilter & DocumentCreate,
  DocumentProject extends DocumentKey,
  DocumentFilter extends DocumentKey,
  DocumentCreate
>(
  { inpCell, strArrs, focusElem, domSchemaCreate, columns, tabMain, tabrepCrud }
    : { inpCell: HTMLTableCellElement, strArrs: string[][], focusElem: HTMLElement | null }
    & { domSchemaCreate: DomainSchemaT<DocumentCreate> }
    & { columns: string[] }
    & { tabMain: HTMLTableElement }
    & { tabrepCrud: TabrepCrudAbstract<DocumentKey, DocumentMain, DocumentProject, DocumentFilter, DocumentCreate> }
): void {
  const inpCellIndex = inpCell.cellIndex
  const docsPartial: Map<TabrepRowIdT, Partial<DocumentCreate>> = new Map()
  const classesList: ClassesRowI[] = []

  // Form documents to update source.
  let currTr: Element | null = inpCell.parentElement
  for (const strArr of strArrs) {
    if (!(currTr instanceof HTMLTableRowElement)) throw new ErrorCustomUnclassified('!(currTr instanceof HTMLTableRowElement)')

    const rowId = tabrepFrontGetRowId(currTr)
    const project: Record<string, unknown> = {}
    const classesRow: ClassesRowI = { rowIndex: currTr.rowIndex, classes: Array.from(currTr.classList), cells: [] }

    // Form document keys.
    for (let i = 0; i < strArr.length; i++) {
      const key = columns[inpCellIndex + i] || errorType('')
      project[key] = true

      // And save cell classes.
      const cell = currTr.cells[inpCellIndex + i]
      if (!cell) continue
      classesRow.cells.push({ cellIndex: cell.cellIndex, classes: Array.from(cell.classList) })
    }

    // Form document from document keys.
    if (!projectionUtil.isProjection(project, domSchemaCreate)) throw new ErrorCustomType('!projectionUtil.isProjection(project, domSchemaCreate)')
    const docPartial = domainSchemaUtil.convStringArrToDoc({
      strArr, domSchema: domSchemaCreate, project
    })

    docsPartial.set(rowId, docPartial)
    classesList.push(classesRow)
    currTr = currTr.nextElementSibling
  }

  updateTabsourceRetainingConfig({ docs: docsPartial, classesList, focusElem, tabMain, tabrepCrud })
}

function updateTabsourceRetainingConfig<
  DocumentKey,
  DocumentMain extends DocumentKey & DocumentProject & DocumentFilter & DocumentCreate,
  DocumentProject extends DocumentKey,
  DocumentFilter extends DocumentKey,
  DocumentCreate
>(
  { docs, classesList, focusElem, tabMain, tabrepCrud }
    : {
      docs: Map<TabrepRowIdT, Partial<DocumentCreate>>,
      classesList: ClassesRowI[],
      focusElem: HTMLElement | null
    }
    & { tabMain: HTMLTableElement }
    & { tabrepCrud: TabrepCrudAbstract<DocumentKey, DocumentMain, DocumentProject, DocumentFilter, DocumentCreate> }
): void {
  const activeElem = focusElem || document.activeElement
  let activeRowIndex: number | null = null
  let activeColIndex: number | null = null
  if (activeElem instanceof HTMLTableCellElement) {
    activeColIndex = activeElem.cellIndex
    const activeRow = activeElem.parentElement
    if (!(activeRow instanceof HTMLTableRowElement)) throw new ErrorCustomType('!(activeRow instanceof HTMLTableRowElement)')
    activeRowIndex = activeRow.rowIndex
  }
  else if (activeElem instanceof HTMLTableRowElement) activeRowIndex = activeElem.rowIndex

  for (const [rowId, doc] of docs.entries()) {
    tabrepCrud.update({ filter: rowId, update: doc })
  }

  // Восстанавливаем фокус.
  if (activeColIndex !== null) {
    if (activeRowIndex === null) throw new ErrorCustomImpossible('')
    const newTr: HTMLTableRowElement = tabMain.rows[activeRowIndex] || errorType('tabMain.rows[activeRowIndex]')
    const newTd: HTMLTableCellElement = newTr.cells[activeColIndex] || errorType('newTr.cells[activeColIndex]')
    newTd.focus()
  }
  else if (activeRowIndex !== null) {
    const newTr: HTMLTableRowElement = tabMain.rows[activeRowIndex] || errorType('tabMain.rows[activeRowIndex]')
    newTr.focus()
  }

  // Восстанавливаем классы в строках и ячейках.
  for (const classesRow of classesList) {
    const row = tabMain.rows[classesRow.rowIndex]
    if (!row) continue
    row.classList.add(...classesRow.classes)
    for (const classesCell of classesRow.cells) {
      row.cells[classesCell.cellIndex]?.classList.add(...classesCell.classes)
    }
  }
}

//////////////////////////////////////////////////////////////////////////////
// Clear.
//////////////////////////////////////////////////////////////////////////////
function clearCells<
  DocumentKey,
  DocumentMain extends DocumentKey & DocumentProject & DocumentFilter & DocumentCreate,
  DocumentProject extends DocumentKey,
  DocumentFilter extends DocumentKey,
  DocumentCreate
>(
  { domSchemaCreate, tabBody, columns, tabMain, tabrepCrud }
    : { domSchemaCreate: DomainSchemaT<DocumentCreate>; tabBody: HTMLTableSectionElement; columns: string[] }
    & { tabMain: HTMLTableElement }
    & { tabrepCrud: TabrepCrudAbstract<DocumentKey, DocumentMain, DocumentProject, DocumentFilter, DocumentCreate> }
): void {
  const dummyDoc = domainSchemaUtil.genDummyDocument({ domSchema: domSchemaCreate })
  const docsPartial: Map<TabrepRowIdT, Partial<DocumentCreate>> = new Map()
  const classesList: ClassesRowI[] = []

  const selected = tabrepSelectGetSelected(tabBody)
  for (const [row, cells] of selected.entries()) setDocsAndClassesVars(row, cells)

  if (docsPartial.size < 1) return
  return updateTabsourceRetainingConfig({ docs: docsPartial, classesList, focusElem: null, tabMain, tabrepCrud })

  // Util. Local.
  function setDocsAndClassesVars(row: HTMLTableRowElement, cells: HTMLTableCellElement[]) {
    const classesRow: ClassesRowI = { rowIndex: row.rowIndex, classes: Array.from(row.classList), cells: [] }
    const project: Record<string, unknown> = {}

    // Form document keys.
    for (const cell of cells) {
      const key = columns[cell.cellIndex] || errorType('')
      project[key] = true

      // And save cell classes.
      classesRow.cells.push({ cellIndex: cell.cellIndex, classes: Array.from(cell.classList) })
    }

    // Form document from document keys.
    if (!domSchemaCreate) throw new ErrorCustomImpossible('!domSchemaCreate')
    if (!projectionUtil.isProjection(project, domSchemaCreate)) throw new ErrorCustomType('')
    const docPartial: Partial<DocumentCreate> = {}
    for (const key in project) {
      docPartial[key] = dummyDoc[key]
    }

    const rowId = tabrepFrontGetRowId(row)
    docsPartial.set(rowId, docPartial)
    classesList.push(classesRow)
  }
}
