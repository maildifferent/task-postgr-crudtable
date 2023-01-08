import express from 'express'
import { authorizationPrivateUtil } from '../authorization_private.js'
import { driverApiPrivateUtil } from "../driver_api_private.js"
import { ApplicationOptions } from '../share/application.js'

export const driverApiAuthorizationController: {
  signin: express.RequestHandler,
  login: express.RequestHandler
} = ({
  async signin(req, res) {
    try {
      const { appOptions } = new ApplicationOptions({})
      
      const { filterSchema, password } = req.body
      const result = await authorizationPrivateUtil.login({ filterSchema, password, appOptions })
      
      return driverApiPrivateUtil.responseRes(res, result)
    } catch (error) {
      return driverApiPrivateUtil.responseErr(res, 401, error)
    }
  },

  async login(req, res) {
    try {
      const { appOptions } = new ApplicationOptions({})
      const { user } = req.body
      const result = await authorizationPrivateUtil.signin({ user, appOptions })

      return driverApiPrivateUtil.responseRes(res, result)
    } catch (error) {
      return driverApiPrivateUtil.responseErr(res, 401, error)
    }
  }
} as const)
