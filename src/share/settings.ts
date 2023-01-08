import { TransactionTabqueryCommitterAbstractI } from "./transaction.js"
import { TabqueryRW } from './tabquery.js'

export const SETTINGS_CONSTS = Object.freeze({
  browser: 'browser',
  server: 'server1',
} as const)

export const settings: {
  environment: 'browser' | 'server1'
  transactionTabqueryCommitterDriver: TransactionTabqueryCommitterAbstractI | null
  tabqueryDriver: typeof TabqueryRW | null
} = {
  environment: SETTINGS_CONSTS.browser,
  transactionTabqueryCommitterDriver: null,
  tabqueryDriver: null
}
