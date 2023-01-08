import { ErrorCustomType } from './error.js';
// export type DocumentPrimitiveTypedT<Fields extends string> = Record<Fields, null | string | number | boolean | bigint>
export const documentValueDomainTypeVals = ['string', 'number', 'boolean', 'bigint'];
////////////////////////////////////////////////////////////////////////////////
// Util. Public.
////////////////////////////////////////////////////////////////////////////////
export const documentUtil = Object.freeze({
    typifyDocumentValuePrimitivesT(
    // something: unknown
    something) {
        if (something === null)
            return something;
        if (typeof something === 'string')
            return something;
        if (typeof something === 'number')
            return something;
        if (typeof something === 'boolean')
            return something;
        if (typeof something === 'bigint')
            return something;
        throw new ErrorCustomType('incorrect something');
    },
    isDocumentValuePrimitivesT(something) {
        return something === null
            || typeof something === 'string'
            || typeof something === 'number'
            || typeof something === 'boolean'
            || typeof something === 'bigint';
    },
});
