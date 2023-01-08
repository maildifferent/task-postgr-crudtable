// https://gist.github.com/solenoid/1372386
// https://github.com/mongodb/js-bson/blob/dc9c1bb284a6c08e07f14e700bdbfb0fd57e5a13/lib/objectid.js#L154
// https://github.com/mongodb/js-bson/blob/main/src/objectid.ts
import { ErrorCustomImpossible } from './error.js';
import { PROCESS_ID_UNIQUE } from './process_id.js';
import { buf2hexString, num2bufBE } from './util.js';
// Regular expression that checks for hex value
const checkForHexRegExp = new RegExp('^[0-9a-fA-F]{24}$');
// Binary buffer with big endian sequence of bytes.
const kIdBufBE = Symbol('kIdBufBE');
/**
 * A class representation of the ObjectId type.
 * @public
 * @category BSONType
 */
export class ObjectId {
    // 4-byte timestamp
    // + 5-byte random value generated once per process
    // + 3-byte incrementing counter
    /** ObjectId Bytes (big endian sequence of bytes). @internal */
    [kIdBufBE];
    /** @internal */
    static increment = Math.round(Math.random() * 0xffffff);
    /**
     * Create an ObjectId type
     *
     * @param inputId - Can be:
     * Number: not negative int no more than 12 bytes (will be converted to buffer).
     * String: 24 hex chars or 12 chars with length = 12 bytes.
     * Binary buffer: 12 bytes.
     */
    constructor(inputId) {
        if (inputId === undefined) {
            this[kIdBufBE] = ObjectId.generate();
        }
        else if (typeof inputId === 'number') {
            if (!Number.isInteger(inputId))
                throw new Error();
            if (inputId < 0)
                throw new Error();
            const numBuf = num2bufBE(inputId);
            if (numBuf.byteLength > 12)
                throw new Error();
            this[kIdBufBE] = new ArrayBuffer(12);
            const idUint8arr = new Uint8Array(this[kIdBufBE]);
            const numUint8Arr = new Uint8Array(numBuf);
            for (let i = 0; i < numUint8Arr.length; i++) {
                const numUint8 = numUint8Arr[numUint8Arr.length - i];
                if (numUint8 === undefined)
                    throw new ErrorCustomImpossible('numUint8 === undefined');
                idUint8arr[idUint8arr.length - i] = numUint8;
            }
        }
        else if (typeof inputId === 'string') {
            // 24 chars hex string (2 hex chars == 1 byte) -> 12 byte binary Buffer.
            if (inputId.length === 24 && checkForHexRegExp.test(inputId)) {
                this[kIdBufBE] = new ArrayBuffer(12);
                const idUint8arr = new Uint8Array(this[kIdBufBE]);
                for (let i = 0, j = 0; i < 12; i++, j += 2) {
                    idUint8arr[i] = Number('0x' + inputId[j] + inputId[j + 1]);
                }
            }
            else if (inputId.length === 12) {
                const encoder = new TextEncoder();
                const strUint8Arr = encoder.encode(inputId);
                if (strUint8Arr.length !== 12)
                    throw new Error();
                this[kIdBufBE] = strUint8Arr.buffer;
            }
            else {
                throw new Error();
            }
        }
        else if (inputId instanceof Uint8Array) {
            if (inputId.byteLength !== 12)
                throw new Error();
            this[kIdBufBE] = inputId.buffer;
        }
        else if (inputId instanceof ArrayBuffer) {
            if (inputId.byteLength === 12)
                throw new Error();
            this[kIdBufBE] = inputId;
        }
        else {
            throw new Error();
        }
    }
    /**
     * The ObjectId bytes
     * @readonly
     */
    get id() {
        return this[kIdBufBE];
    }
    /**
     * Update the ObjectId increment.
     * @privateRemarks
     * Used in generating new ObjectId's on the driver.
     * @internal
     */
    static getIncrement() {
        return ObjectId.increment = (ObjectId.increment + 1) % 0xffffff;
    }
    /** Returns the ObjectId id as a 24 character hex string representation. */
    toHexString() {
        return buf2hexString(this[kIdBufBE]);
    }
    /** Converts the id into a 24 character hex string for printing. */
    toString() {
        return this.toHexString();
    }
    /** Converts to its JSON the 24 character hex string representation. */
    toJSON() {
        return this.toHexString();
    }
    /** Generate a 12 byte id ArrayBuffer used in ObjectId's. */
    static generate() {
        const idBuffer = new ArrayBuffer(12);
        const idUint8Arr = new Uint8Array(idBuffer);
        const time = Math.floor(Date.now() / 1000);
        // Вместо этого можно использовать setInt32(byteOffset, value, littleEndian)
        idUint8Arr[3] = time;
        idUint8Arr[2] = time >> 8;
        idUint8Arr[1] = time >> 16;
        idUint8Arr[0] = time >> 24;
        const procId_IdUint8Arr0 = PROCESS_ID_UNIQUE.idUint8Arr[0];
        const procId_IdUint8Arr1 = PROCESS_ID_UNIQUE.idUint8Arr[1];
        const procId_IdUint8Arr2 = PROCESS_ID_UNIQUE.idUint8Arr[2];
        const procId_IdUint8Arr3 = PROCESS_ID_UNIQUE.idUint8Arr[3];
        const procId_IdUint8Arr4 = PROCESS_ID_UNIQUE.idUint8Arr[4];
        if (procId_IdUint8Arr0 === undefined)
            throw new ErrorCustomImpossible('');
        if (procId_IdUint8Arr1 === undefined)
            throw new ErrorCustomImpossible('');
        if (procId_IdUint8Arr2 === undefined)
            throw new ErrorCustomImpossible('');
        if (procId_IdUint8Arr3 === undefined)
            throw new ErrorCustomImpossible('');
        if (procId_IdUint8Arr4 === undefined)
            throw new ErrorCustomImpossible('');
        idUint8Arr[4] = procId_IdUint8Arr0;
        idUint8Arr[5] = procId_IdUint8Arr1;
        idUint8Arr[6] = procId_IdUint8Arr2;
        idUint8Arr[7] = procId_IdUint8Arr3;
        idUint8Arr[8] = procId_IdUint8Arr4;
        const incr = ObjectId.getIncrement();
        idUint8Arr[11] = incr;
        idUint8Arr[10] = incr >> 8;
        idUint8Arr[9] = incr >> 16;
        return idBuffer;
    }
    /**
     * Compares the equality of this ObjectId with `otherID`.
     *
     * @param otherId - ObjectId instance to compare against.
     */
    equals(otherId) {
        let otherIdUint8Arr = null;
        if (typeof otherId === 'number') {
            if (!Number.isInteger(otherId))
                throw new Error();
            if (otherId < 0)
                throw new Error();
            const otherIdBuf = num2bufBE(otherId);
            if (otherIdBuf.byteLength > 12)
                throw new Error();
            otherIdUint8Arr = new Uint8Array(otherIdBuf);
        }
        else if (typeof otherId === 'string') {
            if (otherId.length === 24 && checkForHexRegExp.test(otherId)) {
                return this.toHexString() === otherId;
            }
            else {
                const encoder = new TextEncoder();
                otherIdUint8Arr = encoder.encode(otherId);
                if (otherIdUint8Arr.byteLength !== 12)
                    throw new Error();
            }
        }
        else if (otherId instanceof Uint8Array) {
            if (otherId.byteLength !== 12)
                throw new Error();
            otherIdUint8Arr = otherId;
        }
        else if (otherId instanceof ArrayBuffer) {
            if (otherId.byteLength !== 12)
                throw new Error();
            otherIdUint8Arr = new Uint8Array(otherId);
        }
        else if (otherId instanceof ObjectId) {
            otherIdUint8Arr = new Uint8Array(otherId[kIdBufBE]);
        }
        if (otherIdUint8Arr) {
            const idUint8Arr = new Uint8Array(this[kIdBufBE]);
            for (let i = 0; i < idUint8Arr.length; i++) {
                if (idUint8Arr[i] !== otherIdUint8Arr[i])
                    return false;
            }
            return true;
        }
        throw new Error();
    }
    /** Returns the generation date (accurate up to the second) that this ID was generated. */
    getTimestamp() {
        const dataView = new DataView(this[kIdBufBE]);
        // Syntax: getUint32(byteOffset, littleEndian).
        const milliseconds = dataView.getUint32(0) * 1000;
        return new Date(milliseconds);
    }
    /**
     * Converts to a string representation of this Id.
     *
     * @returns return the 24 character hex string representation.
     * @internal
     */
    [Symbol.for('nodejs.util.inspect.custom')]() {
        return this.inspect();
    }
    inspect() {
        return `new ObjectId("${this.toHexString()}")`;
    }
}
