import { ErrorCustomType, ErrorCustomUnclassified } from './error.js';
export const kbServer = {
    url: 'https://task-postgr-crudtable.onrender.com',
    createHeaders({ appOptions }) {
        const headers = { 'Content-Type': 'application/json' };
        const token = appOptions?.authrz?.token;
        if (token)
            headers['Authorization'] = 'Bearer ' + token;
        return headers;
    },
    async query(fetchReq) {
        const { reqTxt, method, headers, bodyObj } = fetchReq;
        const url = this.url + reqTxt;
        let init;
        if (method || bodyObj || headers) {
            init = {};
            if (method)
                init.method = method;
            if (headers)
                init.headers = headers;
            if (bodyObj)
                init.body = JSON.stringify(bodyObj);
        }
        const fetchResponse = await fetch(url, init);
        let fetchResult;
        fetchResult = await fetchResponse.json();
        if (!isApiResponse(fetchResult))
            throw new ErrorCustomType('!isApiResponse(fetchResult)');
        if (!fetchResult.ok) {
            if (typeof fetchResult.error === 'string')
                throw new ErrorCustomUnclassified(fetchResult.error);
            throw fetchResult.error;
        }
        return fetchResult.result;
    }
};
////////////////////////////////////////////////////////////////////////////////
// Util. Private.
////////////////////////////////////////////////////////////////////////////////
function isApiResponse(something) {
    if (typeof something !== 'object' || !something)
        throw new ErrorCustomType('typeof something !== object || !something');
    if (Object.keys(something).length !== 2)
        throw new ErrorCustomType('Object.keys(something).length !== 2');
    let ok;
    let result;
    let error;
    for (const [key, value] of Object.entries(something)) {
        if (key === 'ok') {
            ok = value;
            continue;
        }
        if (key === 'result') {
            result = value;
            continue;
        }
        if (key === 'error') {
            error = value;
            continue;
        }
        throw new ErrorCustomType('incorrect key');
    }
    if (ok === true && result !== undefined)
        return true;
    if (ok === false && error !== undefined)
        return true;
    return false;
}
