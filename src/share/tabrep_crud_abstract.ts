import { FilterI } from './filter.js'
import { TabrepRowIdT, TabrepRowTechnicalPropsI } from './tabrep.js'

export abstract class TabrepCrudAbstract<
  DocumentKey,
  DocumentMain extends DocumentKey & DocumentProject & DocumentFilter & DocumentCreate,
  DocumentProject extends DocumentKey,
  DocumentFilter extends DocumentKey,
  DocumentCreate
> {
  abstract commitAsync(): Promise<void>
  abstract createEmptyRow(): void
  abstract create({ create }: { create: DocumentCreate[]} ): void
  abstract read({ filter }: FilterI<TabrepRowIdT>): Map<TabrepRowIdT, TabrepRowTechnicalPropsI & DocumentMain>
  abstract update({ filter, update }: FilterI<TabrepRowIdT> & { update: Partial<DocumentCreate>} ): void
  abstract delete({ filter }: FilterI<TabrepRowIdT>): void
}
