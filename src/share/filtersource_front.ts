import { ApplicationOptions } from './application.js'
import { DomainSchemaI, domainSchemaUtil } from "./domain_schema.js"
import { ErrorCustomType, errorType } from './error.js'
import { FilterI, FilterSchemaI } from './filter.js'
import { Filtersource } from './filtersource.js'
import { documentZ } from './util_front.js'

const CSS_CLASSES = Object.freeze({
  filtersource_container: 'filtersource_container',
  filtersource_filters: 'filtersource_filters',
  filtersource_delete: 'filtersource_delete',
  filtersource_focus: 'filtersource_focus',
} as const)

const CONSTS = Object.freeze({
  field: 'field',
} as const)

// Filter:
export class FiltersourceFront<DocumentFilter> {
  private readonly appOptions: ApplicationOptions['appOptions']
  private readonly elems
  private readonly filtersource: Filtersource<DocumentFilter>

  constructor(
    { filterSchema, domSchema, appOptions, parent }
      : { filterSchema: Partial<FilterSchemaI<DocumentFilter, keyof DocumentFilter>['filterSchema']> }
      & DomainSchemaI<DocumentFilter>
      & ApplicationOptions
      & { parent: HTMLElement }
  ) {
    this.appOptions = appOptions
    this.elems = createFilterElems({ parent })
    this.filtersource = new Filtersource<DocumentFilter>({
      filterSchema, domSchema, appOptions: this.appOptions, front: this
    })

    const { form, select, input_text, filters } = this.elems
    for (const key of Object.keys(this.filtersource.domSchema)) {
      const option = new Option('- ' + key, key)
      select.append(option)
    }

    const { filtersource } = this

    // Listeners.
    select.addEventListener('change', onChangeSelect_getFilter)
    form.addEventListener('submit', onSubmitForm_setFilter)
    filters.addEventListener('click', onClickDiv_selectOrDeleteFilter)

    //////////////////////////////////////////////////////////////////////////////
    // Listeners.
    //////////////////////////////////////////////////////////////////////////////
    function onChangeSelect_getFilter(event: Event): void {
      if (!event.target) throw new ErrorCustomType()

      const select = event.target
      if (!(select instanceof HTMLSelectElement)) throw new ErrorCustomType()

      if (!(select.value in domSchema)) throw new ErrorCustomType()
      const key = select.value as keyof typeof domSchema

      const filter = filtersource.read({ key })
      input_text.value = filter === undefined ? '' : getDisplayStringFromFilter({ filter })
    }

    function onSubmitForm_setFilter(event: SubmitEvent): void {
      if (!(select.value in domSchema)) throw new ErrorCustomType()
      const key = select.value as keyof typeof domSchema

      const text = input_text.value
      const value = domainSchemaUtil.convStringToDomainValueType(text, key, domSchema)
      let newFilter: FilterI<DocumentFilter[typeof key]>['filter']
      if (typeof value === 'string' && (value.includes('*') || value.includes('?'))) {
        newFilter = { '$il': [value] }
      } else newFilter = value

      const oldFilter = filtersource.read({ key })
      if (oldFilter === undefined) filtersource.create({ key, filter: newFilter })
      else filtersource.update({ key, filter: newFilter })

      event.preventDefault()
    }

    function onClickDiv_selectOrDeleteFilter(event: MouseEvent): void {
      const button = event.target
      if (!(button instanceof HTMLButtonElement)) return

      const span = button.closest('span') || errorType('')

      const div = span.closest('div')
      if (div !== filters) throw new ErrorCustomType('')

      if (button.classList.contains(CSS_CLASSES.filtersource_delete)) {
        const key = span.dataset[CONSTS.field] || errorType('')
        if (key in domSchema) filtersource.delete({ key: key as keyof typeof domSchema })
        else throw new ErrorCustomType('')
      }

      else if (button.classList.contains(CSS_CLASSES.filtersource_focus)) {
        const key = span.dataset[CONSTS.field] || errorType('')
        let { filter }: FilterI<DocumentFilter[keyof DocumentFilter]> | { filter: undefined } = { filter: undefined }

        if (key in domSchema) filter = filtersource.read({ key: key as keyof typeof domSchema })
        else throw new ErrorCustomType('')
        if (filter === undefined) throw new ErrorCustomType('')

        select.value = key
        input_text.value = getDisplayStringFromFilter({ filter })
      }

      else throw new ErrorCustomType('')
    }
  }

  create<Key extends keyof DocumentFilter>(
    { key, filter }: { key: Key } & FilterI<DocumentFilter[Key]>
  ): void {
    const span = createFilterSpan({ key, filter })
    this.elems.filters.append(span)
  }

  update<Key extends keyof DocumentFilter>(
    { key, filter }: { key: Key } & FilterI<DocumentFilter[Key]>
  ): void {
    const span = getFilterSpanById<DocumentFilter, Key>(key, this.elems.filters)
    const spanNew = createFilterSpan({ key, filter })
    span.replaceWith(spanNew)
  }

  delete<Key extends keyof DocumentFilter>({ key }: { key: Key }): void {
    const span = getFilterSpanById<DocumentFilter, Key>(key, this.elems.filters)
    span.remove()
  }

  getFilterSchema() { return this.filtersource.getFilterSchema() }
}

////////////////////////////////////////////////////////////////////////////////
// Util. Private.
////////////////////////////////////////////////////////////////////////////////
function getDisplayStringFromFilter<DocumentFilter, Key extends keyof DocumentFilter>(
  { filter }: FilterI<DocumentFilter[Key]>
): string {
  const value = (typeof filter === 'string') ? filter
    : (typeof filter === 'object' && filter !== null) ? ''
      : JSON.stringify(filter)
  return value
}

function createFilterSpan<DocumentFilter, Key extends keyof DocumentFilter>(
  { key, filter }: { key: Key } & FilterI<DocumentFilter[Key]>
): HTMLSpanElement {
  if (typeof key !== 'string') throw new ErrorCustomType('')

  const span = document.createElement('span')
  span.dataset[CONSTS.field] = key

  const butnFocus = document.createElement('button')
  const butnDelete = document.createElement('button')

  butnFocus.classList.add(CSS_CLASSES.filtersource_focus)
  butnDelete.classList.add(CSS_CLASSES.filtersource_delete)

  span.append(butnFocus)
  span.append(butnDelete)

  let value: unknown = '...'
  if (typeof filter === 'object' && filter !== null) {
    const filterValues = Object.values(filter)
    if(filterValues.length === 1) {
      const filterValue: unknown = filterValues[0]
      if(Array.isArray(filterValue)) {
        if(filterValue.length === 1) {
          const reading: unknown = filterValue[0]
          if(typeof reading === 'object' && reading !== null) {
            // Do nothing.
          } else {
            value = '' + reading
          }
        }
      }
    }
  } else {
    value = '' + filter
  }

  butnFocus.textContent = key + ': ' + value
  butnDelete.textContent = 'X'

  return span
}

function getFilterSpanById<DocumentFilter, Key extends keyof DocumentFilter>(
  key: Key, parent: HTMLElement
): HTMLSpanElement {
  if (typeof key !== 'string') throw new ErrorCustomType('')

  const spans = Array.from(parent.querySelectorAll(`span[data-${CONSTS.field}="${key}"]`))
  if (spans.length !== 1) throw new ErrorCustomType('')
  const span = spans[0] || errorType('')
  if (!(span instanceof HTMLSpanElement)) throw new ErrorCustomType()

  return span
}

////////////////////////////////////////////////////////////////////////////////
// Create elements.
////////////////////////////////////////////////////////////////////////////////
function createFilterElems({ parent }: { parent: HTMLElement }) {
  const container = documentZ.createElement('div')
    .classlist.add(CSS_CLASSES.filtersource_container)
    .appendTo(parent).getElem()

  const h5 = documentZ.createElement('h5').appendTo(container).getElem()
  h5.textContent = 'Filter:'

  const form = documentZ.createElement('form').appendTo(container).getElem()
  const select = documentZ.createElement('select').appendTo(form).getElem()

  const input_text = documentZ.createElement('input').appendTo(form).getElem()
  input_text.type = 'text'
  input_text.placeholder = 'Filter'

  const input_submit = documentZ.createElement('input').appendTo(form).getElem()
  input_submit.type = 'submit'
  input_submit.value = 'Set filter'

  const filters = documentZ.createElement('div')
    .classlist.add(CSS_CLASSES.filtersource_filters)
    .appendTo(container).getElem()

  return { container, form, select, input_text, input_submit, filters }
}
