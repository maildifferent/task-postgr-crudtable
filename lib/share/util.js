import { ErrorCustomImpossible, ErrorCustomType } from './error.js';
export function haveSameKeys(...objects) {
    const initArr = [];
    const allKeys = objects.reduce((keys, object) => keys.concat(Object.keys(object)), initArr);
    const union = new Set(allKeys);
    return objects.every(object => union.size === Object.keys(object).length);
}
export function hasProperties(something, props) {
    if (typeof something !== 'object' || !something)
        throw new ErrorCustomType('typeof something !== object || !something');
    for (const prop of props) {
        if (something[prop] === undefined)
            throw new ErrorCustomType('');
    }
    return true;
}
export function hasProperties2(something, props) {
    if (typeof something !== 'object' || !something)
        throw new ErrorCustomType('typeof something !== object || !something');
    for (const prop of props) {
        if (something[prop] === undefined)
            throw new ErrorCustomType('');
    }
    return true;
}
export function setDocumentPropertyValue(key, doc, value) {
    doc[key] = value;
}
export function genProjectionFromDoc(doc, suffix) {
    const resultPartial = {};
    let key;
    for (key in doc) {
        resultPartial[key] = suffix;
    }
    return resultPartial;
}
export function checkIntervalBoundaries(frNum, toNum, minNum, maxNum) {
    if (frNum < minNum) {
        console.error('Left border of interval < min value. Changed to min value.');
        frNum = minNum;
    }
    if (toNum > maxNum) {
        console.error('Right border of interval > max value. Changed to max value.');
        toNum = maxNum;
    }
    if (frNum > toNum) {
        throw new Error('Left border of interval > right border.');
    }
    return [frNum, toNum];
}
export function convertClipboardTextToArray(clipboardText) {
    const clipRows = clipboardText.split(/\r\n/); // (/[\n\f\r]/)
    // Trim trailing CR (carriage return) if present.
    if (clipRows[clipRows.length - 1] === '') {
        clipRows.pop();
    }
    //
    const clipArrs = [];
    for (let i = 0; i < clipRows.length; i++) {
        const clipRow = clipRows[i];
        if (!clipRow)
            throw new ErrorCustomImpossible('!clipRow');
        if (clipRow !== '')
            clipArrs.push(clipRow.split('\t'));
        else
            clipArrs.push(['']);
    }
    return clipArrs;
}
// Пример.
{
    function testF(arg) {
        // @ts-ignore
        return ({}); // Error.
    }
    testF;
}
export function convWildcardStringToRegex(str) {
    return new RegExp('^' + str.replaceAll('.', '\.')
        .replaceAll('?', '.')
        .replaceAll('*', '.*') + '$');
}
////////////////////////////////////////////////////////////////////////////////
// Работа с байтами.
////////////////////////////////////////////////////////////////////////////////
export const byteToHex = (() => {
    const strArr = [];
    for (let n = 0; n <= 0xff; ++n) {
        const hexOctet = n.toString(16).padStart(2, '0');
        strArr.push(hexOctet);
    }
    return strArr;
})();
export function buf2hexString(arrayBuffer) {
    const buffArr = new Uint8Array(arrayBuffer);
    const hexOctets = new Array(buffArr.length);
    for (let i = 0; i < buffArr.length; ++i) {
        // hexOctets.push(byteToHex[buffArr[i]]);
        const buff = buffArr[i];
        if (buff === undefined)
            throw new ErrorCustomImpossible('!buff');
        hexOctets[i] = byteToHex[buff];
    }
    return hexOctets.join('');
}
export function num2bufBE(num) {
    if (typeof num !== 'number')
        throw new Error();
    if (!Number.isInteger(num))
        throw new Error();
    if (num < 0)
        throw new Error();
    const bytes = [];
    let workingNum = num;
    while (workingNum > 256) {
        bytes.push(workingNum % 256);
        workingNum = Math.floor(workingNum / 256);
    }
    bytes.push(workingNum);
    const buffer = new ArrayBuffer(bytes.length);
    const uint8arr = new Uint8Array(buffer);
    for (let i = 0, j = bytes.length - 1; i < bytes.length; i++, j--) {
        const byte = bytes[i];
        if (byte === undefined)
            throw new ErrorCustomImpossible('byte === undefined');
        uint8arr[j] = byte;
    }
    return buffer;
}
export function num2bufBE2(num) {
    if (typeof num !== 'number')
        throw new Error();
    if (!Number.isInteger(num))
        throw new Error();
    if (num < 0)
        throw new Error();
    let str = num.toString(16); // Big endian запись.
    if (str.length % 2 !== 0)
        str = '0' + str;
    const bufLength = str.length / 2;
    const buffer = new ArrayBuffer(bufLength);
    const uint8arr = new Uint8Array(buffer);
    for (let i = 0, j = 0; j < bufLength; i += 2, j++) {
        uint8arr[j] = Number('0x' + str[i] + str[i + 1]);
    }
    return buffer;
}
////////////////////////////////////////////////////////////////////////////////
// Typificators.
////////////////////////////////////////////////////////////////////////////////
// Example.
() => {
    const union = typifyUnion('', ['string', 'number']);
    union;
    // @ts-expect-error
    typifyUnion(2, ['string', 'number']); // Error: "Type '"string"' is not assignable to type '2'".
};
export function typifyUnion(
// something: unknown,
something, unionArr) {
    const unionType = unionArr.find((validType) => validType === something);
    if (unionType === undefined)
        throw new ErrorCustomType('unionType === undefined');
    return unionType;
}
// Example.
() => {
    const stringArr = typifyArray(['qqq', 'www']);
    const unknownArr = typifyArray(({}));
    const anyArr = typifyArray(({}));
    stringArr;
    unknownArr;
    anyArr;
    // @ts-expect-error
    typifyArray(({}));
    // @ts-expect-error
    typifyArray(['1', '2']);
    // @ts-expect-error
    typifyArray(2);
};
export function typifyArray(
// something: unknown[],
something) {
    if (!isUnknownArray(something))
        throw new ErrorCustomType('!isUnknownArray(something)');
    return something;
    function isUnknownArray(something) {
        return Array.isArray(something);
    }
}
// Example.
() => {
    const numberArr = typifyArrayWithTypeGuard([1, 2], (something) => 33);
    const numberArr2 = typifyArrayWithTypeGuard(({}), (something) => 33);
    numberArr;
    numberArr2;
    // @ts-expect-error
    typifyArrayWithTypeGuard(({}), (something) => 33);
    // @ts-expect-error
    typifyArrayWithTypeGuard(['qq', 'ww'], (something) => 33);
};
export function typifyArrayWithTypeGuard(
// something: unknown[],
something, typeGuard) {
    const someArray = typifyArray(something);
    const typedArray = [];
    for (let item of someArray) {
        typedArray.push(typeGuard(item));
    }
    return typedArray;
}
export function typifyDocumentWithTypeGuard(
// something: Record<string, unknown>,
something, typeGuard) {
    if (typeof something !== 'object' || !something)
        throw new ErrorCustomType('typeof something !== object || !something');
    const doc = {};
    for (const [key, value] of Object.entries(something)) {
        doc[key] = typeGuard(value);
    }
    return doc;
}
// Example.
() => {
    function test(something) {
        const somethingUntyped = something;
        if (!isArrayWithTypeGuard(somethingUntyped, typeGuard))
            throw new ErrorCustomType();
        somethingUntyped; // ArrayType.
        // @ts-expect-error
        something = somethingUntyped;
    }
    function typeGuard(something) {
        return true;
    }
    test;
};
export function isArrayWithTypeGuard(something, // unknown[],
// something: T[],
isTypeGuard) {
    if (!isUnknownArray(something))
        throw new ErrorCustomType('!isUnknownArray(something)');
    for (const item of something) {
        if (!isTypeGuard(item))
            throw new ErrorCustomType('!isTypeGuard(item)');
    }
    return true;
    function isUnknownArray(something) {
        return Array.isArray(something);
    }
}
// Example.
() => {
    const stringTuple = typifyTuple2(['ww', 'ee']);
    const unknownTuple = typifyTuple2(['ww', 'ee']);
    const anyTuple = typifyTuple2(['ww', 'ee']);
    stringTuple;
    unknownTuple;
    anyTuple;
    // @ts-expect-error
    typifyTuple2(['ww', 'ee']);
};
export function typifyTuple2(
// something: [unknown, unknown]
something) {
    if (!isUnknownArray(something))
        throw new ErrorCustomType('!isUnknownArray(something)');
    const [val1, val2] = something;
    return [val1, val2];
    function isUnknownArray(something) {
        return Array.isArray(something);
    }
}
// Example.
() => {
    const numberTuple = typifyTupleWithStringIdAndTypeGuard(['1', 2], (something) => 33);
    const numberTuple2 = typifyTupleWithStringIdAndTypeGuard(['1', 2], (something) => 33);
    const anyTuple = typifyTupleWithStringIdAndTypeGuard(['1', 2], (something) => 33);
    numberTuple;
    numberTuple2;
    anyTuple;
    // @ts-expect-error
    typifyTupleWithStringIdAndTypeGuard(['1', 2], (something) => 33);
};
export function typifyTupleWithStringIdAndTypeGuard(
// something: [unknown, unknown],
something, typeGuard) {
    const someArray = typifyTuple2(something);
    const [id, arr1] = someArray;
    if (typeof id !== 'string')
        throw new ErrorCustomType('typeof id !== string');
    const value = typeGuard(arr1);
    return [id, value];
}
export function typifyNotPartial(doc, length) {
    if (length < 1)
        throw new ErrorCustomType('');
    if (Object.keys(doc).length !== length)
        throw new ErrorCustomType('Object.keys(doc).length !== length');
    return doc;
}
////////////////////////////////////////////////////////////////////////////////
// Some tests.
////////////////////////////////////////////////////////////////////////////////
() => {
    let key = 0; // Type == string OR number.
    let extract = ''; // Type == string.
    key;
    extract;
};
() => {
    const intersection = { prop1: '', prop2: '', prop3: '' };
    intersection;
    let union = { prop1: '', prop2: '', prop3: '' };
    union = { prop2: '', prop3: '' };
    union = { prop1: '', prop2: '' };
    union;
};
() => {
    const omit = { prop3: '' };
    omit;
    const test1Replica = { prop1: '', prop2: '' };
    test1Replica;
};
() => {
    function func1(some, all) {
        let someReplica;
        // someReplica = some // Error!
        someReplica = {}; // Technical line.
        someReplica;
    }
    func1;
};
