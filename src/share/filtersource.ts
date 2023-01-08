import { ApplicationOptions } from './application.js'
import { DomainSchemaI } from './domain_schema.js'
import { ErrorCustomType } from './error.js'
import { FilterI, FilterSchemaI } from './filter.js'
import { FiltersourceFront } from './filtersource_front.js'

export class Filtersource<DocumentFilter> {
  private readonly appOptions: ApplicationOptions['appOptions']
  private readonly front: FiltersourceFront<DocumentFilter>

  private readonly filterSchema: Partial<FilterSchemaI<DocumentFilter, keyof DocumentFilter>['filterSchema']>
  public readonly domSchema: DomainSchemaI<DocumentFilter>['domSchema']

  constructor(
    { filterSchema, domSchema, appOptions, front }
      : { filterSchema: Partial<FilterSchemaI<DocumentFilter, keyof DocumentFilter>['filterSchema']> }
      & DomainSchemaI<DocumentFilter>
      & ApplicationOptions
      & { front: FiltersourceFront<DocumentFilter> }
  ) {
    this.appOptions = appOptions
    this.front = front
    this.filterSchema = filterSchema
    this.domSchema = domSchema
    this.appOptions
  }

  create<KeysFilter extends keyof DocumentFilter>(
    { key, filter }: { key: KeysFilter } & FilterI<DocumentFilter[KeysFilter]>
  ): void {
    const { filterSchema, front } = this
    if (key in filterSchema) throw new ErrorCustomType('')
    filterSchema[key] = filter
    front.create({ key, filter })
  }

  read<KeysFilter extends keyof DocumentFilter>(
    { key }: { key: KeysFilter }
  ): FilterI<DocumentFilter[KeysFilter]>['filter'] | undefined {
    const { filterSchema } = this
    return filterSchema[key]
  }

  update<KeysFilter extends keyof DocumentFilter>(
    { key, filter }: { key: KeysFilter } & FilterI<DocumentFilter[KeysFilter]>
  ): void {
    const { filterSchema, front } = this
    if (!(key in filterSchema)) throw new ErrorCustomType('')
    filterSchema[key] = filter
    front.update({ key, filter })
  }

  delete<KeysFilter extends keyof DocumentFilter>(
    { key }: { key: KeysFilter }
  ): void {
    const { filterSchema, front } = this
    if (!(key in filterSchema)) throw new ErrorCustomType('')
    delete filterSchema[key]
    front.delete({ key })
  }

  getFilterSchema() { const { filterSchema } = this; return { filterSchema } }
}
