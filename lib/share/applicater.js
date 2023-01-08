import { DRIVER_API_CONSTS } from './driver_api_consts.js';
import { ErrorCustomSyntax, ErrorCustomType, ErrorCustomUnclassified } from './error.js';
import { kbServer } from './kbserver.js';
import { ObjectId } from './object_id.js';
import { typifyArrayWithTypeGuard, typifyTuple2 } from './util.js';
class ApplicaterOperOriginProps {
    ctorArgs;
    ctorFunc;
    methArgs;
    methFunc;
    constructor({ ctorArgs, ctorFunc, methArgs, methFunc }) {
        this.ctorArgs = ctorArgs;
        this.ctorFunc = ctorFunc;
        this.methArgs = methArgs;
        this.methFunc = methFunc;
    }
    toJSON() {
        return this.toApplerOper();
    }
    toApplerOper() {
        const { ctorArgs, methArgs } = this;
        const ctorName = this.ctorFunc.name;
        const methName = this.methFunc.name;
        return { ctorArgs, ctorName, methArgs, methName };
    }
}
export const applicaterOperUtil = Object.freeze({
    operFromApp({ app, method, args }) {
        const applerOper = {
            ctorArgs: app.ctorArgs,
            ctorName: app.ctorFunc.name,
            methArgs: args,
            methName: method.name
        };
        return { applerOper };
    },
    typifyApplicaterOperAny(
    // something: unknown
    something) {
        if (typeof something !== 'object' || !something)
            throw new ErrorCustomType('');
        const ctorName = something['ctorName'];
        const ctorArgs = something['ctorArgs'];
        const methName = something['methName'];
        const methArgs = something['methArgs'];
        if (typeof ctorName !== 'string')
            throw new ErrorCustomType('');
        if (!Array.isArray(ctorArgs))
            throw new ErrorCustomType('');
        if (typeof methName !== 'string')
            throw new ErrorCustomType('');
        if (!Array.isArray(methArgs))
            throw new ErrorCustomType('');
        return { ctorName, ctorArgs, methName, methArgs };
    },
});
class ApplicaterOperList {
    applerList = new Map();
    pushOper_({ applerOper, applerOperId }) {
        if (!applerOperId)
            ({ applerOperId } = applicaterOperListUtil.genOperId());
        if (this.applerList.has(applerOperId))
            throw new ErrorCustomSyntax('');
        this.applerList.set(applerOperId, applerOper);
        return { applerOperId };
    }
    pushOperFromClass_({ ctorArgs, ctorFunc, methArgs, methFunc, applerOperId }) {
        const origOper = new ApplicaterOperOriginProps({ ctorArgs, ctorFunc, methArgs, methFunc });
        const applerOper = origOper.toApplerOper();
        const params = { applerOper };
        if (applerOperId)
            params.applerOperId = applerOperId;
        return this.pushOper_(params);
    }
    pushOperFromApp_({ app, method, args, applerOperId }) {
        const oper = applicaterOperUtil.operFromApp({ app, method, args });
        const params = oper;
        if (applerOperId)
            params.applerOperId = applerOperId;
        return this.pushOper_(params);
    }
}
export const applicaterOperListUtil = Object.freeze({
    genOperId() {
        return { applerOperId: new ObjectId().toHexString() };
    },
    async fetchFromClient({ applerList, appOptions }) {
        const { applerListTuples } = { applerListTuples: Array.from(applerList.entries()) };
        const fetchRequest = {
            reqTxt: '/api/' + DRIVER_API_CONSTS.applerListTuples,
            method: 'POST',
            headers: kbServer.createHeaders({ appOptions }),
            bodyObj: { applerListTuples }
        };
        const result = await kbServer.query(fetchRequest);
        if (typeof result !== 'object' || !result)
            throw new ErrorCustomType('typeof result !== object || ! result');
        const { applerResTuples } = {
            applerResTuples: typifyArrayWithTypeGuard(result['applerResTuples'], typifyTuple2)
        };
        return { applerResTuples };
    },
    async fetchFromClientSingle({ applerOper, appOptions }) {
        const { applerList } = { applerList: new Map() };
        const { applerOperId } = applicaterOperListUtil.genOperId();
        applerList.set(applerOperId, applerOper);
        const result = await applicaterOperListUtil.fetchFromClient({ applerList, appOptions });
        const { applerResTuples } = result;
        if (applerResTuples.length !== 1)
            throw new ErrorCustomType('');
        const applerResTuple0 = applerResTuples[0];
        if (!applerResTuple0)
            throw new ErrorCustomType('');
        const [id, arr1] = applerResTuple0;
        if (id !== applerOperId)
            throw new ErrorCustomType('');
        return arr1;
    }
});
////////////////////////////////////////////////////////////////////////////////
// Applicater oper. List with status.
////////////////////////////////////////////////////////////////////////////////
export const APPLICATER_STATUSES = Object.freeze({
    open: 'open',
    committing: 'committing',
    committed: 'committed',
    rolledback: 'rolledback',
    error: 'error',
});
export class ApplicaterOperListWithStatus extends ApplicaterOperList {
    status = APPLICATER_STATUSES.open;
    checkForPushOper() {
        if (this.status !== APPLICATER_STATUSES.open)
            throw new ErrorCustomSyntax('this.status !== open');
    }
    // Statuses: open -> open.
    pushOperCheckStatus_(...args) {
        this.checkForPushOper();
        return this.pushOper_(...args);
    }
    // Statuses: open -> open.
    pushOperFromClassCheckStatus_(...args) {
        this.checkForPushOper();
        return this.pushOperFromClass_(...args);
    }
    // Statuses: open -> open.
    pushOperFromAppCheckStatus_(...args) {
        this.checkForPushOper();
        return this.pushOperFromApp_(...args);
    }
    // Statuses: committing -> committed.
    setStatusCommitted() {
        if (this.status !== APPLICATER_STATUSES.committing)
            throw new ErrorCustomUnclassified('this.status !== committing');
        this.status = APPLICATER_STATUSES.committed;
    }
    // Statuses: committing -> rolledback.
    setStatusRolledback() {
        if (this.status !== APPLICATER_STATUSES.committing)
            throw new ErrorCustomUnclassified('this.status !== committing');
        this.status = APPLICATER_STATUSES.rolledback;
    }
    // Statuses: * -> error.
    setStatusError() {
        this.status = APPLICATER_STATUSES.error;
    }
}
