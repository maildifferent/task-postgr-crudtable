import express from 'express'
import { DriverApiResponseResultT, DriverApiResponseErrorI } from './share/driver_api_response.js'

////////////////////////////////////////////////////////////////////////////////
// Util. Public.
////////////////////////////////////////////////////////////////////////////////
export const driverApiPrivateUtil = Object.freeze({
  responseRes(res: express.Response, result: unknown) {
    const response: DriverApiResponseResultT<typeof result> = { ok: true, result }
    res.json(response)
  },

  responseErr(res: express.Response, status: number, error: unknown) {
    console.error('Ошибка:\n', error)

    let message: string = ''
    if (typeof error === 'object' && error) {
      const value = error['message' as keyof typeof error]
      if (typeof value === 'string') message = value
    }

    const responseErr: DriverApiResponseErrorI = { ok: false, error: message || error }
    return res.status(status).json(responseErr)
  },

  getLinkDataFromReq(req: express.Request): unknown {
    let something: unknown
    something = req.params
    if (typeof something === 'object' && something !== null && Object.keys(something).length > 0)
      return something
    something = req.query
    if (typeof something === 'object' && something !== null && Object.keys(something).length > 0)
      return something

    return
  }
} as const)
