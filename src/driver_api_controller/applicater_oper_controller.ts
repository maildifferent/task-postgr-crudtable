import express from 'express'
import { applicaterOpersPrivateUtil } from '../applicater_oper_private.js'
import { driverApiPrivateUtil } from '../driver_api_private.js'
import { ApplicationOptions } from '../share/application.js'

export const driverApiApplicaterOperController: {
  processOpers: express.RequestHandler
} = {
  processOpers: async (req, res) => {
    try {
      const { appOptions } = new ApplicationOptions({})
      if (req.auth) appOptions.authrz = req.auth

      const { applerListTuples } = req.body
      const result = await applicaterOpersPrivateUtil.fetchProcessOnServer({ applerListTuples, appOptions })

      return driverApiPrivateUtil.responseRes(res, result)
    } catch (error) {
      return driverApiPrivateUtil.responseErr(res, 500, error)
    }
  }
}
