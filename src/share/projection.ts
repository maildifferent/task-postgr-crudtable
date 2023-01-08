import { DomainSchemaT } from "./domain_schema.js"
import { ErrorCustomType, ErrorCustomSyntax } from './error.js'
import { typifyNotPartial } from './util.js'

export type ProjectionGroupT = 'group' | 'count' | 'sum' | 'avg' | 'max' | 'min'

export type ProjectionSortT = 'asc' | 'des'

export type ProjectionSortNullsT = 'first' | 'last'

////////////////////////////////////////////////////////////////////////////////
// Main.
////////////////////////////////////////////////////////////////////////////////
export interface ProjectionI<DocumentProject, ProjectFields extends keyof DocumentProject> {
  project: Record<ProjectFields, true>,
}

export interface ProjectionAnyI<DocumentProject, ProjectFields extends keyof DocumentProject> {
  project: Record<ProjectFields, unknown>,
}

export interface ProjectOptionsI<DocumentProject, ProjectFields extends keyof DocumentProject> {
  projectOptions: OptionsPropsT<DocumentProject, ProjectFields>
}

type OptionsPropsT<DocumentProject, ProjectFields extends keyof DocumentProject> = {
  group?: Partial<Record<ProjectFields, ProjectionGroupT>>,
  // groupFilter?: FilterSchemaT<Pick<DocumentProject, ProjectFields>>,
  sort?: Partial<Record<ProjectFields, ProjectionSortT | unknown>>,
  sortNulls?: Partial<Record<ProjectFields, ProjectionSortNullsT | unknown>>,
  limit?: number,
  skip?: number,
}

////////////////////////////////////////////////////////////////////////////////
// Util. Public.
////////////////////////////////////////////////////////////////////////////////
export const projectionUtil = Object.freeze({
  isProjection<ProjectFields extends keyof DocumentProject, DocumentProject>(
    something: unknown,
    domSchemaProject: DomainSchemaT<DocumentProject>,
  ): something is Record<ProjectFields, unknown> {
    if (typeof something !== 'object' || !something) throw new ErrorCustomType('typeof something !== object || !something')

    for (const key in something) {
      if (!(key in domSchemaProject)) throw new ErrorCustomType('!(key in domSchemaProject)')
    }
    return true
  },

  pickProjectFromDoc<ProjectFields extends keyof DocumentProject, DocumentProject>(
    doc: DocumentProject,
    project: Record<ProjectFields, unknown>,
  ): Pick<DocumentProject, ProjectFields> {
    const docPartial: Partial<Pick<DocumentProject, ProjectFields>> = {}
    let key: ProjectFields
    for(key in project) {
      docPartial[key] = doc[key]
    }
    const result: Pick<DocumentProject, ProjectFields> = typifyNotPartial(docPartial, Object.keys(project).length)
    return result
  },

  isProjectionOptionsT<ProjectFields extends keyof DocumentProject, DocumentProject>(
    something: unknown,
    project: Record<ProjectFields, unknown>,
    domSchemaProject: DomainSchemaT<DocumentProject>
  ): something is OptionsPropsT<DocumentProject, ProjectFields> {
    if (typeof something !== 'object' || !something) throw new ErrorCustomType('typeof something !== object || !something')

    let key: string
    let value: unknown // Иначе ниже в цикле типизация value: any.
    for ([key, value] of Object.entries(something)) {
      if (key === 'group') throw new ErrorCustomSyntax('Not implemented.')
      if (key === 'groupFilter') throw new ErrorCustomSyntax('Not implemented.')

      if (key === 'sort') {
        const sort = value
        if (!isPartial(sort, project)) throw new ErrorCustomType('!isPartial(sort, project)')
      } else if (key === 'sortNulls') {
        const sortNulls = value
        if (!isPartial(sortNulls, project)) throw new ErrorCustomType('!isPartial(sortNulls, project)')

      } else if (key === 'limit') {
        const limit = value
        if (typeof limit !== 'number') throw new ErrorCustomType('typeof limit !== number')
      } else if (key === 'skip') {
        const skip = value
        if (typeof skip !== 'number') throw new ErrorCustomType('typeof skip !== number')

      } else {
        throw new ErrorCustomType('Incorrect key.')
      }
    }

    return true
  }
} as const)

////////////////////////////////////////////////////////////////////////////////
// Util. Private.
////////////////////////////////////////////////////////////////////////////////
function isPartial<Doc extends Record<string, unknown>>(
  something: unknown,
  doc: Doc,
): something is Partial<Record<keyof Doc, unknown>> {
  if (typeof something !== 'object' || !something) throw new ErrorCustomType('typeof something !== object || !something')

  for (const key in something) if (!(key in doc)) throw new ErrorCustomType('!(key in doc)')

  return true
}
