import express from 'express'
import { driverApiAuthorizationController } from '../driver_api_controller/authorization_controller.js'
import { DRIVER_API_CONSTS } from '../share/driver_api_consts.js'

export const driverApiAuthorizationRouter = express.Router()

const contrl = driverApiAuthorizationController
const router = driverApiAuthorizationRouter
const login = DRIVER_API_CONSTS.login
const sigin = DRIVER_API_CONSTS.signin

router.post('/' + login, contrl.login)
router.post('/' + sigin, contrl.signin)