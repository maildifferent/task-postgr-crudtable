import { buf2hexString } from './util.js';
// В ObjectId.ts для генерации id используется уникальный идентификатор
// процесса. ObjectId генерируется в виде:
// - 4-byte timestamp
// + 5-byte random value generated once per process
// + 3-byte incrementing counter
// Поэтому идентификатор процесса будем хранить в виде 5-byte.
class ProcessId {
    /**
     * Unique process id binary buffer.
     * Length = 5 bytes. Big endian byte sequence.
     * 4 bytes timestamp and 1 byte random value.
     * @internal
     * */
    static _idBuffer;
    /** Unique process id Uint8Array. @internal */
    static _idUint8Arr;
    /** Unique process id hex string. @internal */
    static _idHexString;
    static _readyStatePromise = this.asyncInitProcessId();
    static async asyncInitProcessId() {
        const seconds = Math.floor(Date.now() / 1000);
        const processBuf = new ArrayBuffer(5);
        const procDataView = new DataView(processBuf);
        // Syntax: setUint32(byteOffset, value, littleEndian).
        procDataView.setUint32(0, seconds);
        const processUint8Arr = new Uint8Array(processBuf);
        const randomVal = Math.floor(Math.random() * 0xff);
        processUint8Arr[4] = randomVal;
        this._idUint8Arr = processUint8Arr;
        this._idBuffer = processBuf;
        this._idHexString = buf2hexString(processBuf);
        console.log('Unique process id obtained: ' + this._idHexString);
    }
    get idUint8Arr() {
        return ProcessId._idUint8Arr;
    }
    get idBuffer() {
        return ProcessId._idBuffer;
    }
    get idHexString() {
        return ProcessId._idHexString;
    }
    get readyStatePromise() {
        return ProcessId._readyStatePromise;
    }
}
export const PROCESS_ID_UNIQUE = Object.freeze(new ProcessId());
