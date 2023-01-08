"use strict"
console.clear()

// Config. Server part.
settings.environment = SETTINGS_CONSTS.server
settings.transactionTabqueryCommitterDriver = driverDbTransactionTabqueryCommitter
settings.tabqueryDriver = DriverDbTabquery
import './domain_schemas_confserv.js'
import './global_express_request_authorization.js'

// Other.
import express from 'express'
import path from 'path'
import { CONFIG } from './config.js'
import { driverApiAuthorizationRouter } from './driver_api_route/authorization_route.js'
import { driverApiApplicaterOperRouter } from './driver_api_route/applicater_oper_route.js'
import { settings, SETTINGS_CONSTS } from './share/settings.js'
import { DriverDbTabquery, driverDbTransactionTabqueryCommitter } from './driver_db.js'

const PORT = CONFIG.port || 8080
const app = express()

// app.all("*", (req, res, next) => {
//   console.log('\n==== NEW REQUEST: ====')
//   console.log('<< req.baseUrl >>\n', req.baseUrl)
//   console.log('<< req.method >>\n', req.method)
//   console.log('<< req.originalUrl >>\n', req.originalUrl)
//   console.log('<< req.path >>\n', req.path)
//   next()
// })

app.use(express.json())

// https://groups.google.com/g/express-js/c/cdtY3yx00Go/m/59ESc_RIdOsJ
// https://stackoverflow.com/a/7069902
app.options('*', function (req, res) {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Credentials', 'true')
  res.header('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
})

app.use('/api', driverApiAuthorizationRouter)
app.use('/api', driverApiApplicaterOperRouter)

app.get('/', (req, res) => { res.json({ message: 'Server works message...' }) })
app.use('/pub', express.static(path.resolve() + '/pub'))
app.use('/lib/share', express.static(path.resolve() + '/lib/share'))
app.use('/lib/front', express.static(path.resolve() + '/lib/front'))

app.listen(PORT, () => { console.log(`Server started on port: ${PORT}`) })