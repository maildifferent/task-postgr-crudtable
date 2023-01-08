class OptionsInternal {
    authrz;
    trnapp;
    trntab;
    constructor({ authrz, trnapp, trntab }) {
        if (authrz)
            this.authrz = authrz;
        if (trnapp)
            this.trnapp = trnapp;
        if (trntab)
            this.trntab = trntab;
    }
    toJSON() { return {}; }
}
export class ApplicationOptions {
    appOptions;
    constructor({ authrz, trnapp, trntab }) {
        const optionsProps = {};
        if (authrz)
            optionsProps.authrz = authrz;
        if (trnapp)
            optionsProps.trnapp = trnapp;
        if (trntab)
            optionsProps.trntab = trntab;
        this.appOptions = new OptionsInternal(optionsProps);
    }
}
export class Application {
    appOptions;
    ctorArgs;
    ctorFunc;
    constructor({ appOptions, ctorFunc, ctorArgs }) {
        this.appOptions = appOptions;
        this.ctorFunc = ctorFunc;
        this.ctorArgs = ctorArgs;
    }
}
////////////////////////////////////////////////////////////////////////////////
// Application. Some tests.
////////////////////////////////////////////////////////////////////////////////
() => {
    class TestCl extends Application {
        prop1;
        constructor({ appOptions, prop1 }) {
            super({ appOptions, ctorFunc: TestCl, ctorArgs: [{ appOptions, prop1 }] });
            this.prop1 = prop1;
        }
    }
    const { appOptions } = new ApplicationOptions({});
    const test = new TestCl({ appOptions, prop1: 1 });
    test;
};
