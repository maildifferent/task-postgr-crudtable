import { ErrorCustomType, ErrorCustomSyntax } from './error.js';
import { typifyNotPartial } from './util.js';
////////////////////////////////////////////////////////////////////////////////
// Util. Public.
////////////////////////////////////////////////////////////////////////////////
export const projectionUtil = Object.freeze({
    isProjection(something, domSchemaProject) {
        if (typeof something !== 'object' || !something)
            throw new ErrorCustomType('typeof something !== object || !something');
        for (const key in something) {
            if (!(key in domSchemaProject))
                throw new ErrorCustomType('!(key in domSchemaProject)');
        }
        return true;
    },
    pickProjectFromDoc(doc, project) {
        const docPartial = {};
        let key;
        for (key in project) {
            docPartial[key] = doc[key];
        }
        const result = typifyNotPartial(docPartial, Object.keys(project).length);
        return result;
    },
    isProjectionOptionsT(something, project, domSchemaProject) {
        if (typeof something !== 'object' || !something)
            throw new ErrorCustomType('typeof something !== object || !something');
        let key;
        let value; // Иначе ниже в цикле типизация value: any.
        for ([key, value] of Object.entries(something)) {
            if (key === 'group')
                throw new ErrorCustomSyntax('Not implemented.');
            if (key === 'groupFilter')
                throw new ErrorCustomSyntax('Not implemented.');
            if (key === 'sort') {
                const sort = value;
                if (!isPartial(sort, project))
                    throw new ErrorCustomType('!isPartial(sort, project)');
            }
            else if (key === 'sortNulls') {
                const sortNulls = value;
                if (!isPartial(sortNulls, project))
                    throw new ErrorCustomType('!isPartial(sortNulls, project)');
            }
            else if (key === 'limit') {
                const limit = value;
                if (typeof limit !== 'number')
                    throw new ErrorCustomType('typeof limit !== number');
            }
            else if (key === 'skip') {
                const skip = value;
                if (typeof skip !== 'number')
                    throw new ErrorCustomType('typeof skip !== number');
            }
            else {
                throw new ErrorCustomType('Incorrect key.');
            }
        }
        return true;
    }
});
////////////////////////////////////////////////////////////////////////////////
// Util. Private.
////////////////////////////////////////////////////////////////////////////////
function isPartial(something, doc) {
    if (typeof something !== 'object' || !something)
        throw new ErrorCustomType('typeof something !== object || !something');
    for (const key in something)
        if (!(key in doc))
            throw new ErrorCustomType('!(key in doc)');
    return true;
}
