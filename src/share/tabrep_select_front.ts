import { ErrorCustomType, errorImpossible, errorType } from './error.js'
import { KEYS_TO_MOVE_CELL_FOCUS } from './keyboard_keys.js'
import { Messagebox } from './messagebox_front.js'
import { TABREP_KEYS } from './tabrep.js'
import { TABREP_CSS_CLASSES } from './tabrep_front.js'
import { trace, TRACE_TYP } from './trace.js'
import { copyToClipboard } from './util_front.js'

interface TabrepSelectedFlagI { selectedFlag: { active: boolean } }

////////////////////////////////////////////////////////////////////////////////
// Tabrep. Select.
////////////////////////////////////////////////////////////////////////////////
export function tabrepSelectFrontFunctionality(
  { tabMain, tabHead, tabBody, columns, messagebox, editingCell }
    : { tabMain: HTMLTableElement, tabHead: HTMLTableSectionElement, tabBody: HTMLTableSectionElement }
    & { columns: string[] }
    & { messagebox: Messagebox }
    & { editingCell: { td: HTMLTableCellElement | null } }
): void {
  const selectedFlag: TabrepSelectedFlagI['selectedFlag'] = { active: false }
  // Select cells area.
  let selectByMouseIsInProcess: boolean = false
  const selectVector = { deltaX: 0, deltaY: 0 }
  let selectByKeydownIsInProcess: boolean = false

  // Listeners.
  tabMain.addEventListener('keydown', onKeydownTable_copySelectAll)
  tabMain.addEventListener('keydown', onKeydownTable_moveFocus)
  tabMain.addEventListener('keydown', onKeydownTable_selectCells)
  tabMain.addEventListener('keyup', onKeyupTable_selectCells)

  tabMain.addEventListener('mousedown', onMousedownTable_selectCells)
  tabMain.addEventListener('mouseover', onMouseoverTable_selectCells)
  tabMain.addEventListener('mouseup', onMouseupTable_clearSelectFlag)


  //////////////////////////////////////////////////////////////////////////////
  // Listeners. Table, tbody.
  //////////////////////////////////////////////////////////////////////////////
  function onKeydownTable_copySelectAll(event: KeyboardEvent) {
    trace({ typ: TRACE_TYP.listener, msg: 'table: keydown: copySelectAll: ' + event.code })

    if (editingCell.td) return // if (event.target === editbox) return
    if (event.shiftKey || event.metaKey || event.altKey) return

    try {
      if (event.ctrlKey && event.code === 'KeyC') copyCells(tabBody)
      else if (event.ctrlKey && event.code === 'KeyA') { deselectAll({ selectedFlag }); tabBody.focus(); event.preventDefault() }
    } catch (err) { messagebox.message(err) }
  }

  function onKeydownTable_moveFocus(event: KeyboardEvent) {
    trace({ typ: TRACE_TYP.listener, msg: 'table: keydown: moveFocus: ' + event.code })

    if (event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return
    if (!KEYS_TO_MOVE_CELL_FOCUS.has(event.code)) return

    try { moveFocusOnKeydownTable({ event, selectedFlag, tabMain, editingCell }) } catch (err) { messagebox.message(err) }
  }

  function onKeydownTable_selectCells(event: KeyboardEvent) {
    trace({ typ: TRACE_TYP.listener, msg: 'table: keydown: selectCells: ' + event.code })

    if (editingCell.td) return // if (event.target === editbox) return
    if (event.ctrlKey || event.metaKey || event.altKey) return
    if (!event.shiftKey) return

    if (event.code === 'ArrowLeft') selectVector.deltaX -= 1
    else if (event.code === 'ArrowRight') selectVector.deltaX += 1
    else if (event.code === 'ArrowUp') selectVector.deltaY -= 1
    else if (event.code === 'ArrowDown') selectVector.deltaY += 1
    else return

    try {
      selectByKeydownIsInProcess = true
      const currSelectionVector = selectByShiftVector({
        ...selectVector, selectedFlag, columns, tabMain, tabHead
      })
      selectVector.deltaX = currSelectionVector.deltaX
      selectVector.deltaY = currSelectionVector.deltaY
    } catch (err) { messagebox.message(err) }
  }

  function onKeyupTable_selectCells(event: KeyboardEvent) {
    trace({ typ: TRACE_TYP.listener, msg: 'tbody: keyup: selectCells:' + event.code })

    if (event.key !== 'Shift') return
    if (!selectByKeydownIsInProcess) return

    selectByKeydownIsInProcess = false
    selectVector.deltaX = 0
    selectVector.deltaY = 0
  }

  function onMousedownTable_selectCells(event: MouseEvent) {
    trace({ typ: TRACE_TYP.listener, msg: 'table: mousedown: selectCells' })

    if (event.ctrlKey || event.metaKey || event.altKey) return
    let targetTd = event.target
    if (targetTd instanceof HTMLDivElement && targetTd.classList.contains(TABREP_CSS_CLASSES.header)) {
      targetTd = targetTd.parentElement
    }
    if (!(targetTd instanceof HTMLTableCellElement)) return

    selectByMouseIsInProcess = true
    event.preventDefault()
    if (!event.shiftKey) targetTd.focus()
    try { selectByTargetCell({ targetCell: targetTd, selectedFlag, columns, tabMain, tabHead }) }
    catch (err) { messagebox.message(err) }
  }

  function onMouseoverTable_selectCells(event: MouseEvent) {
    trace({ typ: TRACE_TYP.listener, msg: 'table: mouseover: selectCells' })

    if (!selectByMouseIsInProcess) return
    let targetTd = event.target
    if (targetTd instanceof HTMLDivElement && targetTd.classList.contains(TABREP_CSS_CLASSES.header)) {
      targetTd = targetTd.parentElement
    }
    if (!(targetTd instanceof HTMLTableCellElement)) return

    try { selectByTargetCell({ targetCell: targetTd, selectedFlag, columns, tabMain, tabHead }) }
    catch (err) { messagebox.message(err) }
  }

  function onMouseupTable_clearSelectFlag(event: MouseEvent) {
    trace({ typ: TRACE_TYP.listener, msg: 'table: mouseup: clearSelectFlag' })

    selectByMouseIsInProcess = false
  }
}

//////////////////////////////////////////////////////////////////////////////
// Util. Local and public.
//////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////
// Select.
//////////////////////////////////////////////////////////////////////////////
export function tabrepSelectGetSelected(tabBody: HTMLTableSectionElement): Map<HTMLTableRowElement, HTMLTableCellElement[]> {
  let selected: Map<HTMLTableRowElement, HTMLTableCellElement[]> = new Map()

  const elem0 = tabBody.querySelector('.' + TABREP_CSS_CLASSES.selected)
  if (elem0) {
    if (elem0 instanceof HTMLTableCellElement) {
      selected = getSelectedCellsArea()
      if (selected.size < 1) throw new ErrorCustomType('')
    }

    else if (elem0 instanceof HTMLTableRowElement) {
      const elems = tabBody.querySelectorAll('.' + TABREP_CSS_CLASSES.selected)
      for (const elem of elems) {
        if (!(elem instanceof HTMLTableRowElement)) throw new ErrorCustomType('')
        selected.set(elem, Array.from(elem.cells))
      }
    }

    else if (elem0 === tabBody) {
      Array.from(tabBody.rows).forEach((row) => selected.set(row, Array.from(row.cells)))
    }

    else throw new ErrorCustomType('')
    return selected
  }

  const activeElem = document.activeElement
  if (!activeElem) return selected

  if (activeElem instanceof HTMLTableCellElement) {
    const parent = activeElem.parentElement
    if (!(parent instanceof HTMLTableRowElement)) throw new ErrorCustomType('')
    selected.set(parent, [activeElem])

  } else if (activeElem instanceof HTMLTableRowElement) {
    selected.set(activeElem, Array.from(activeElem.cells))

  } else if (activeElem === tabBody) {
    Array.from(tabBody.rows).forEach((row) => selected.set(row, Array.from(row.cells)))

  } else throw new ErrorCustomType('')
  return selected

  // Util. Local.
  function getSelectedCellsArea(): Map<HTMLTableRowElement, HTMLTableCellElement[]> {
    const selected: Map<HTMLTableRowElement, HTMLTableCellElement[]> = new Map()
    const rows = tabBody.rows

    for (const row of rows) {
      const cells = row.querySelectorAll('.' + TABREP_CSS_CLASSES.selected)
      const selectedCells: HTMLTableCellElement[] = []
      for (const cell of cells) {
        if (!(cell instanceof HTMLTableCellElement)) throw new ErrorCustomType('')
        selectedCells.push(cell)
      }
      if (selectedCells.length > 0) selected.set(row, selectedCells)
    }

    return selected
  }
}

function deselectAll({ selectedFlag }: TabrepSelectedFlagI): void {
  if (!selectedFlag.active) return
  selectedFlag.active = false
  const elems = document.querySelectorAll('.' + TABREP_CSS_CLASSES.selected)
  for (let elem of elems) {
    elem.classList.remove(TABREP_CSS_CLASSES.selected)
  }
}

function selectByShiftVector(
  { deltaX, deltaY, selectedFlag, columns, tabMain, tabHead }
    : { deltaX: number, deltaY: number }
    & TabrepSelectedFlagI
    & { columns: string[]; tabMain: HTMLTableElement; tabHead: HTMLTableSectionElement },
): { deltaX: number, deltaY: number } {
  const activeCell = document.activeElement
  if (!(activeCell instanceof HTMLTableCellElement)) return { deltaX, deltaY }

  const activeRow = activeCell.parentElement instanceof HTMLTableRowElement ? activeCell.parentElement : errorType('')
  const activeRowIndex = activeRow.rowIndex

  const firstRowIndex = tabHead.contains(activeCell) ? 0 : tabHead.rows.length
  const lastRowIndex = tabMain.rows.length - 1

  const testRowIndex = activeRowIndex + deltaY
  if (testRowIndex < firstRowIndex) deltaY = firstRowIndex - activeRowIndex
  if (testRowIndex > lastRowIndex) deltaY = lastRowIndex - activeRowIndex

  const targetRowIndex = activeRowIndex + deltaY
  const targetRow = tabMain.rows[targetRowIndex] || errorImpossible('')

  const activeCellIndex = activeCell.cellIndex
  const testCellIndex = activeCellIndex + deltaX
  if (testCellIndex < 0) deltaX = -activeCellIndex
  if (testCellIndex > targetRow.cells.length - 1) deltaX = targetRow.cells.length - 1 - activeCellIndex

  const targetCellIndex = activeCellIndex + deltaX
  const targetCell = targetRow.cells[targetCellIndex] || errorImpossible('')

  selectByTargetCell({ targetCell, selectedFlag, columns, tabHead, tabMain })
  return { deltaX, deltaY }
}

// Select cells:
function selectByTargetCell(
  { targetCell, selectedFlag, columns, tabMain, tabHead }
    : { targetCell: HTMLTableCellElement }
    & TabrepSelectedFlagI
    & { columns: string[]; tabMain: HTMLTableElement; tabHead: HTMLTableSectionElement },
): void {
  const activeCell = document.activeElement
  if (!(activeCell instanceof HTMLTableCellElement)) return

  const activeCellCol = columns[activeCell.cellIndex]
  const targetCellCol = columns[targetCell.cellIndex]

  const activeRow = activeCell.parentElement instanceof HTMLTableRowElement ? activeCell.parentElement : errorType('')
  const targetRow = targetCell.parentElement instanceof HTMLTableRowElement ? targetCell.parentElement : errorType('')

  const activeCellIndex = activeCell.cellIndex
  const targetCellIndex = targetCell.cellIndex

  const activeRowIndex = activeRow.rowIndex
  const targetRowIndex = targetRow.rowIndex

  const celBegIndex = Math.min(targetCellIndex, activeCellIndex)
  const celEndIndex = Math.max(targetCellIndex, activeCellIndex)

  const rowBegIndex = Math.min(targetRowIndex, activeRowIndex)
  const rowEndIndex = Math.max(targetRowIndex, activeRowIndex)

  deselectAll({ selectedFlag })

  // Выделение колонок.
  if (tabHead.contains(activeCell) && tabHead.contains(targetCell)) {
    for (const row of tabMain.rows) {
      for (let i = celBegIndex; i <= celEndIndex; i++) {
        const cell = row.cells[i] || errorImpossible('')
        cell.classList.add(TABREP_CSS_CLASSES.selected)
      }
    }
  }

  // Выделение строк.
  else if (activeCellCol === TABREP_KEYS._check && targetCellCol === TABREP_KEYS._check) {
    for (let i = rowBegIndex; i <= rowEndIndex; i++) {
      const row = tabMain.rows[i] || errorImpossible('')
      row.classList.add(TABREP_CSS_CLASSES.selected)
    }
  }

  // Выделение ячеек.
  else {
    for (let i = rowBegIndex; i <= rowEndIndex; i++) {
      const row = tabMain.rows[i] || errorImpossible('')
      for (let j = celBegIndex; j <= celEndIndex; j++) {
        const cell = row.cells[j] || errorImpossible('')
        cell.classList.add(TABREP_CSS_CLASSES.selected)
      }
    }
  }

  selectedFlag.active = true
}

//////////////////////////////////////////////////////////////////////////////
// Active.
//////////////////////////////////////////////////////////////////////////////
function moveFocusOnKeydownTable(
  { event, selectedFlag, tabMain, editingCell }
    : { event: KeyboardEvent }
    & TabrepSelectedFlagI
    & { tabMain: HTMLTableElement }
    & { editingCell: { td: HTMLTableCellElement | null } }
): void {
  const c = event.code
  if (editingCell.td && (c === 'ArrowLeft' || c === 'ArrowUp' || c === 'ArrowRight' || c === 'ArrowDown')) return

  if (editingCell.td) editingCell.td.focus()

  const activeCell = document.activeElement
  if (!(activeCell instanceof HTMLTableCellElement)) return

  let deltaX = 0, deltaY = 0
  switch (event.code) {
    case 'Enter':
    case 'NumpadEnter':
    case 'ArrowDown': deltaX = 0; deltaY = 1; break
    case 'ArrowUp': deltaX = 0; deltaY = -1; break
    case 'ArrowLeft': deltaX = -1; deltaY = 0; break
    case 'Tab': return
    case 'ArrowRight': deltaX = 1; deltaY = 0; break
    default: throw new ErrorCustomType('')
  }

  const activeRow = activeCell.parentElement
  if (!(activeRow instanceof HTMLTableRowElement)) return

  const newColIndex = activeCell.cellIndex + deltaX
  const newRowIndex = activeRow.rowIndex + deltaY
  if (newColIndex < 0 || newRowIndex < 0) return // newRowIndex < tabHead.rows.length

  const newActiveRow = tabMain.rows[newRowIndex]
  if (!(newActiveRow instanceof HTMLTableRowElement)) return
  const newActiveCell = newActiveRow.cells[newColIndex]
  if (!(newActiveCell instanceof HTMLTableCellElement)) return

  deselectAll({ selectedFlag })
  newActiveCell.focus()
}

//////////////////////////////////////////////////////////////////////////////
// Copy.
//////////////////////////////////////////////////////////////////////////////
function copyCells(tabBody: HTMLTableSectionElement): void {
  const selected = tabrepSelectGetSelected(tabBody)
  const clipString: string = Array.from(selected.values())
    .map((cells) => cells.map((cell) => cell.textContent || '').join('\t'))
    .join('\n')
  copyToClipboard(clipString).then() // TODO. Show copy status.
}
