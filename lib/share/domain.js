import { ErrorCustomType } from './error.js';
////////////////////////////////////////////////////////////////////////////////
// Domain.
////////////////////////////////////////////////////////////////////////////////
//
// Some tests.
() => {
    const truee1 = ({});
    const false1 = ({});
    const truee4 = ({});
    truee1;
    false1;
    truee4;
    //
    const false2 = ({});
    const false3 = ({});
    false2;
    false3;
    //
    const false4 = ({});
    const false5 = ({});
    false4;
    false5;
    //
    const truee2 = ({});
    const truee3 = ({});
    truee2;
    truee3;
};
// Some tests.
() => {
    const testStr = {
        type: 'string',
        isNullable: false,
        isOptional: false,
        validate: (val) => { return true; },
        // convert: (val: string | number) => { return val } // Error.
    };
    testStr;
    const testStrNull = {
        type: 'string',
        isNullable: true,
        isOptional: false,
        validate: (val) => { return true; }
        // validate: (val: string | number) => { return true } // Error.
        // validate: (val: string) => { return true } // Error.
    };
    testStrNull;
};
////////////////////////////////////////////////////////////////////////////////
// Util. Public.
////////////////////////////////////////////////////////////////////////////////
export const domainUtil = Object.freeze({
    isDomainType(something, domain) {
        if (something === undefined && domain.isOptional)
            return true;
        if (something === null && domain.isNullable)
            return true;
        if (typeof something === 'number' && isNaN(something))
            throw new ErrorCustomType('');
        return (typeof something === domain.type);
    },
});
// Some tests.
() => {
    const testStrDomain = {
        type: 'string',
        isNullable: false,
        validate: (val) => { return true; },
        // convert: (val: string | number) => { return val } // Error.
    };
    let test;
    if (domainUtil.isDomainType(test, testStrDomain)) {
        test;
    } // typeof test === string
};
