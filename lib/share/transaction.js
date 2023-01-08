import { ErrorCustomSyntax } from './error.js';
import { settings } from './settings.js';
import { APPLICATER_STATUSES, applicaterOperListUtil, ApplicaterOperListWithStatus } from './applicater.js';
////////////////////////////////////////////////////////////////////////////////
// Transaction.
////////////////////////////////////////////////////////////////////////////////
class Transaction extends ApplicaterOperListWithStatus {
    resultProcessors = [];
    async processResults({ applerRess }) {
        for (const resultProcessor of this.resultProcessors) {
            resultProcessor({ applerRess });
        }
    }
    // Statuses: open -> committing.
    async commit({ appOptions }) {
        if (this.status !== APPLICATER_STATUSES.open)
            throw new ErrorCustomSyntax('this.status !== open');
        this.status = APPLICATER_STATUSES.committing;
        let applerRess;
        try {
            const { applerList } = this;
            ({ applerRess } = await this.committer({ applerList, appOptions }));
            this.setStatusCommitted();
        }
        catch (error) {
            this.setStatusRolledback();
            throw error;
        }
        for (const resultProcessor of this.resultProcessors) {
            await resultProcessor({ applerRess });
        }
    }
}
////////////////////////////////////////////////////////////////////////////////
// Transaction. Client.
////////////////////////////////////////////////////////////////////////////////
export class TransactionClient extends Transaction {
    async committer({ applerList, appOptions }) {
        const result = await applicaterOperListUtil.fetchFromClient({ applerList, appOptions });
        const { applerResTuples } = result;
        const applerRess = new Map(applerResTuples);
        return { applerRess };
    }
    //////////////////////////////////////////////////////////////////////////////
    // Transaction. Client. Special features.
    //////////////////////////////////////////////////////////////////////////////
    isFull = false;
    flush() {
        this.isFull = false;
        return this;
    }
    // Statuses: open -> open.
    pushOperFromApp(...args) {
        if (this.isFull)
            return { applerOperId: '' };
        return this.pushOperFromAppCheckStatus_(...args);
    }
}
export class TransactionTabquery extends Transaction {
    pushOperFromApp = this.pushOperFromAppCheckStatus_;
    async committer({ applerList, appOptions }) {
        if (!settings.transactionTabqueryCommitterDriver)
            throw new ErrorCustomSyntax('!settings.driverDbTablerCommit');
        const { applerRess } = await settings.transactionTabqueryCommitterDriver.commit({ applerList, appOptions });
        return { applerRess };
    }
}
