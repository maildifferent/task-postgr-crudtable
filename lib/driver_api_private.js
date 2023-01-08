////////////////////////////////////////////////////////////////////////////////
// Util. Public.
////////////////////////////////////////////////////////////////////////////////
export const driverApiPrivateUtil = Object.freeze({
    responseRes(res, result) {
        const response = { ok: true, result };
        res.json(response);
    },
    responseErr(res, status, error) {
        console.error('Ошибка:\n', error);
        let message = '';
        if (typeof error === 'object' && error) {
            const value = error['message'];
            if (typeof value === 'string')
                message = value;
        }
        const responseErr = { ok: false, error: message || error };
        return res.status(status).json(responseErr);
    },
    getLinkDataFromReq(req) {
        let something;
        something = req.params;
        if (typeof something === 'object' && something !== null && Object.keys(something).length > 0)
            return something;
        something = req.query;
        if (typeof something === 'object' && something !== null && Object.keys(something).length > 0)
            return something;
        return;
    }
});
