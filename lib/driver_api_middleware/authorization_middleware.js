import { authorizationPrivateUtil } from '../authorization_private.js';
import { ErrorCustomSyntax, ErrorCustomType } from '../share/error.js';
import { driverApiPrivateUtil } from '../driver_api_private.js';
import { DRIVER_API_CONSTS } from '../share/driver_api_consts.js';
import { ApplicationOptions } from '../share/application.js';
export const driverApiAuthorizationMiddleware = ({
    async authProtect(req, res, next) {
        try {
            const { appOptions } = new ApplicationOptions({});
            const token = getTokenFromRequest(req);
            const verifyTokenRes = await authorizationPrivateUtil.verifyTokenAsync({ token, appOptions });
            if (DRIVER_API_CONSTS.auth in req)
                throw new ErrorCustomSyntax('DRIVER_API_CONSTS.auth in req');
            req[DRIVER_API_CONSTS.auth] = verifyTokenRes;
            return next();
        }
        catch (error) {
            return driverApiPrivateUtil.responseErr(res, 401, error);
        }
    }
});
////////////////////////////////////////////////////////////////////////////////
// Util. Private.
////////////////////////////////////////////////////////////////////////////////
function getTokenFromRequest(req) {
    if (!req || !req.headers || !req.headers.authorization)
        throw new ErrorCustomType('!req || !req.headers || !req.headers.authorization');
    if (!req.headers.authorization.startsWith('Bearer '))
        throw new ErrorCustomType('!req.headers.authorization.startsWith(Bearer )');
    const token = req.headers.authorization.split(' ')[1];
    if (typeof token !== 'string')
        throw new ErrorCustomType('typeof token !== string');
    return token;
}
