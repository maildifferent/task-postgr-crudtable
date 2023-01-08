import express from 'express';
import { driverApiApplicaterOperController } from '../driver_api_controller/applicater_oper_controller.js';
// import { driverApiAuthorizationMiddleware } from '../driver_api_middleware/authorization.middleware.js'
import { DRIVER_API_CONSTS } from '../share/driver_api_consts.js';
export const driverApiApplicaterOperRouter = express.Router();
const contrl = driverApiApplicaterOperController;
// const middlw = driverApiAuthorizationMiddleware
const router = driverApiApplicaterOperRouter;
const applst = DRIVER_API_CONSTS.applerListTuples;
// routr.post('/' + appop, middlw.authProtect, contr.process)
router.post('/' + applst, contrl.processOpers);
