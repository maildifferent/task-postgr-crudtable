import { ErrorCustomType } from './error.js';
import { typifyNotPartial } from './util.js';
import { domainUtil } from './domain.js';
import { ConfigList } from './config.js';
// Some tests.
() => {
    const doc1 = { name: '', age: 0 };
    doc1;
    // type Func1T = (value: string | number) => string | number // Error.
    const func1 = (value) => value;
    func1;
    // Test. Assign domains.
    const domain = ({});
    const domainP = domain;
    domainP;
    const documentP = ({});
    documentP;
    const schemaP = ({});
    schemaP;
    // Test. Assign domain schemas.
    let domSchema = {
        name: { type: 'string', isNullable: false, validate: () => { return true; } },
        age: { type: 'number', isNullable: false, validate: () => { return true; } }
    };
    let domSchemaP = {
        name: { type: 'string', isNullable: false, validate: () => { return true; } },
        age: { type: 'number', isNullable: false, validate: () => { return true; } }
    };
    domSchemaP = domSchema;
    // domSchema = domSchemaP // Error: Type ... is missing the following properties from type ...: name, age.
    // Test. List of domain schemas.
    const list = new Map();
    list.set('', domSchema);
    list.set('', domSchemaP);
    // Test. Use domain schema as function argument.
    const typeFull = test(domSchema); // Type: DocumentUserT.
    typeFull;
    const typeHighLevel = test(domSchemaP); // Type: DocumentPrimitiveT.
    typeHighLevel;
    function test(domSchema) { return ''; }
};
////////////////////////////////////////////////////////////////////////////////
// Util. Public.
////////////////////////////////////////////////////////////////////////////////
export const domainSchemaUtil = Object.freeze({
    applyDomainValidatorToDoc(domSchema, doc) {
        const incorrectFields = [];
        for (const key in doc) {
            const domain = domSchema[key];
            const docVal = doc[key];
            if (docVal === undefined) {
                if (domain.isOptional)
                    continue;
                incorrectFields.push(key);
                continue;
            }
            if (docVal === null) {
                if (domain.isNullable)
                    continue;
                incorrectFields.push(key);
                continue;
            }
            try {
                if (!domain.validate(docVal)) {
                    incorrectFields.push(key);
                }
            }
            catch (error) {
                if (error instanceof ErrorCustomType) {
                    incorrectFields.push(key);
                    continue;
                }
                throw error;
            }
        }
        if (incorrectFields.length > 0)
            throw new ErrorCustomType(JSON.stringify(['Incorrect fields:', ...incorrectFields]));
    },
    async applyDomainConverterToDoc(domSchema, doc) {
        const incorrectFields = [];
        for (const key in doc) {
            const domain = domSchema[key];
            if (!domain.convert)
                continue;
            try {
                doc[key] = await domain.convert(doc[key]);
            }
            catch (error) {
                if (error instanceof ErrorCustomType)
                    incorrectFields.push(key);
                throw error;
            }
        }
        if (incorrectFields.length > 0)
            throw new ErrorCustomType(JSON.stringify(['Incorrect fields:', ...incorrectFields]));
    },
    updDocumentPropertyValue(doc, domSchema, key, value) {
        if (!isKeyofDoc(key, doc))
            throw new ErrorCustomType('');
        const domain = domSchema[key];
        if (!domain)
            throw new ErrorCustomType('');
        if (!domainUtil.isDomainType(value, domain))
            throw new ErrorCustomType('');
        doc[key] = value;
        function isKeyofDoc(key, doc) {
            if (typeof key !== 'string')
                throw new ErrorCustomType('');
            return (key in doc);
        }
    },
    convStringToDomainValueType(str, key, domSchema) {
        if (typeof str !== 'string')
            throw new ErrorCustomType('');
        let value;
        const domain = domSchema[key];
        try {
            value = JSON.parse(str.toLowerCase());
            if (domain.isOptional && value === undefined) { } // return value -> error
            else if (domain.isNullable && value === null) { } // return value -> error
            else
                throw null;
            if (!domainUtil.isDomainType(value, domSchema[key]))
                throw new ErrorCustomType('');
            return value;
        }
        catch (error) { } // Do nothing.
        if (domain.type === 'string') {
            value = str;
        }
        else if (domain.type === 'number') {
            value = Number(str);
        }
        else if (domain.type === 'boolean') {
            value = JSON.parse(str.toLowerCase());
        }
        else if (domain.type === 'bigint') {
            value = BigInt(str);
        }
        else
            throw new ErrorCustomType('incorrect domain');
        if (!domainUtil.isDomainType(value, domSchema[key]))
            throw new ErrorCustomType('');
        return value;
    },
    convStringArrToDoc({ strArr, domSchema, project }) {
        if (strArr.length !== Object.keys(project).length)
            throw new ErrorCustomType('');
        const resultPartial = {};
        let i = 0;
        for (const key in project) {
            const str = strArr[i++];
            if (!str)
                throw new ErrorCustomType('');
            resultPartial[key] = domainSchemaUtil.convStringToDomainValueType(str, key, domSchema);
        }
        return typifyNotPartial(resultPartial, Object.keys(project).length);
    },
    genDummyDocument({ domSchema }) {
        const partialDoc = {};
        for (const key in domSchema)
            partialDoc[key] = dummyValue(domSchema[key]);
        return typifyNotPartial(partialDoc, Object.keys(domSchema).length);
        function dummyValue(domain) {
            if (domain.isOptional)
                return undefined;
            if (domain.isNullable)
                return null;
            if (domain.type === 'string')
                return '';
            if (domain.type === 'number')
                return 0;
            if (domain.type === 'boolean')
                return false;
            if (domain.type === 'bigint')
                return 0n;
            throw new ErrorCustomType('incorrect domain');
        }
    },
    isDocumentPick(something, domSchema, project) {
        if (typeof something !== 'object' || !something)
            throw new ErrorCustomType('typeof something !== object || !something');
        for (const key in project) {
            const domain = domSchema[key];
            if (!domainUtil.isDomainType(something[key], domain))
                throw new ErrorCustomType('');
        }
        if (Object.keys(project).length !== Object.keys(something).length)
            throw new ErrorCustomType('');
        return true;
    },
    isDocumentPickArr(something, domSchema, project) {
        if (!Array.isArray(something))
            throw new ErrorCustomType('!Array.isArray(something)');
        for (let i = 0; i < something.length; i++) {
            if (domainSchemaUtil.isDocumentPick(something[i], domSchema, project))
                continue;
            throw new ErrorCustomType('');
        }
        return true;
    },
    isDocument(something, domSchema) {
        const res = domainSchemaUtil.isDocumentPick(something, domSchema, domSchema);
        return res;
    },
    isDocumentArr(something, domSchema) {
        const res = domainSchemaUtil.isDocumentPickArr(something, domSchema, domSchema);
        return res;
    }
});
class DomSchemasList extends ConfigList {
}
export const domainSchemasList = new DomSchemasList();
////////////////////////////////////////////////////////////////////////////////
// Util. Public.
////////////////////////////////////////////////////////////////////////////////
export const domainSchemasUtil = Object.freeze({
    async genRelativeFileName(metaUrl) {
        const path = await import('path');
        const fileName = '/lib/pub/domain_schemas/' + path.basename(metaUrl);
        return fileName;
    }
});
