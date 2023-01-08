import { ConfigQuery } from './share/config.js'
import { TabqueryRW } from './share/tabquery.js'

export type ApplicationsT = (typeof APPLICATIONS)[number]

export const APPLICATIONS = [
  TabqueryRW,
  ConfigQuery
] as const
