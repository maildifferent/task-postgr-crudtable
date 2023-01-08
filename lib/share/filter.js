import { documentUtil } from './document.js';
import { domainUtil } from './domain.js';
import { ErrorCustomImpossible, ErrorCustomSyntax, ErrorCustomType, errorImpossible } from './error.js';
import { convWildcardStringToRegex } from './util.js';
{
    function tabquery(docFilter, docKey) {
        function deleteRow({ filterSchema }) { }
        deleteRow({ filterSchema: docFilter });
        deleteRow({ filterSchema: docKey });
    }
    tabquery;
}
// Пример.
{
    const filterSchema = {
        qty: [
            { $gt: 10, $lt: 20, $in: [13, 15] },
            { $gt: 20, $lt: 30 }, // implicit AND
        ],
        saleFlag: true,
        price: { $lt: 5 },
    };
    filterSchema;
}
////////////////////////////////////////////////////////////////////////////////
// Main.
////////////////////////////////////////////////////////////////////////////////
export const filterUtil = Object.freeze({
    //////////////////////////////////////////////////////////////////////////////
    // Методы проверки, что переменная удовлетворяет фильтру.
    //////////////////////////////////////////////////////////////////////////////
    isInFilterComparisonOperand(value, filterComparisonOperand) {
        let operator;
        for (operator in filterComparisonOperand) {
            // Array value type branch.
            if (operator === '$in' || operator === '$nin') {
                const operand = filterComparisonOperand[operator] || errorImpossible('operand === undefined');
                if (operator === '$in') {
                    if (!operand.includes(value))
                        return false;
                    continue;
                }
                if (operator === '$nin') {
                    if (operand.includes(value))
                        return false;
                    continue;
                }
                throw new ErrorCustomImpossible('operator');
            }
            // Array value type "like" branch.
            if (operator === '$il' || operator === '$nil') {
                if (typeof value !== 'string')
                    throw new ErrorCustomType('typeof value !== string');
                const operand = filterComparisonOperand[operator] || errorImpossible('operand === undefined');
                if (operator === '$il') {
                    if (!isInLikeArray(value, operand))
                        return false;
                    continue;
                }
                if (operator === '$nil') {
                    if (isInLikeArray(value, operand))
                        return false;
                    continue;
                }
                throw new ErrorCustomImpossible('operator');
            }
            // Primitive value type branch.
            const operand = filterComparisonOperand[operator];
            if (operand === undefined)
                throw new ErrorCustomImpossible('operand === undefined');
            if (operator === '$eq') {
                if (value !== operand)
                    return false;
                continue;
            }
            if (operator === '$ne') {
                if (value === operand)
                    return false;
                continue;
            }
            if (value === null)
                return false;
            if (operand === null)
                return false;
            switch (operator) {
                case '$gt':
                    if (value <= operand)
                        return false;
                    continue;
                case '$gte':
                    if (value < operand)
                        return false;
                    continue;
                case '$lt':
                    if (value >= operand)
                        return false;
                    continue;
                case '$lte':
                    if (value > operand)
                        return false;
                    continue;
                default:
                    throw new ErrorCustomImpossible('operator');
            }
        }
        return true;
        ////////////////////////////////////////////////////////////////////////////
        // Util. Local.
        ////////////////////////////////////////////////////////////////////////////
        function isInLikeArray(value, strArr) {
            for (const str of strArr) {
                const regexp = convWildcardStringToRegex(str);
                const res = regexp.test(value);
                if (res)
                    return true;
            }
            return false;
        }
    },
    isInFilter(value, filter) {
        // Filter is primitive value branch. E.g. filter = true,
        if (documentUtil.isDocumentValuePrimitivesT(filter)) {
            if (value === filter)
                return true;
            return false;
        }
        if (typeof filter === 'object') {
            if (!filter)
                throw new ErrorCustomSyntax('!filter');
            // Filter is array of comparison operands branch.
            // E.g. filter = [  // implicit OR
            //   { $gt: 10, $lt: 20, $in: [13, 15] },
            //   { $gt: 20, $lt: 30 }, // implicit AND
            // ],
            if (Array.isArray(filter)) {
                for (const filterComparisonOperand of filter) {
                    if (this.isInFilterComparisonOperand(value, filterComparisonOperand))
                        return true;
                }
                return false;
            }
            // Filter is comparison operand branch. E.g. filter = { $gt: 20, $lt: 30 }
            return this.isInFilterComparisonOperand(value, filter);
        }
        throw new ErrorCustomSyntax('filter');
    },
    //////////////////////////////////////////////////////////////////////////////
    // Методы проверки, что неизвестное значение является фильтром или фильтр-схемой.
    //////////////////////////////////////////////////////////////////////////////
    isFilterSchema(
    // something: unknown,
    something, domSchemaFilter) {
        if (typeof something !== 'object' || !something)
            throw new ErrorCustomType('typeof something !== object || !something');
        const incorrectFields = [];
        let field;
        let fieldVal; // Иначе ниже в цикле типизация fieldVal: any
        for ([field, fieldVal] of Object.entries(something)) {
            if (!(field in domSchemaFilter)) {
                incorrectFields.push(field);
                continue;
            }
            const domain = domSchemaFilter[field];
            try {
                if (!this.isFilter(fieldVal, domain))
                    incorrectFields.push(field);
            }
            catch (error) {
                incorrectFields.push(field);
            }
        }
        if (incorrectFields.length > 0)
            throw new ErrorCustomType(JSON.stringify(['Incorrect fields:', ...incorrectFields]));
        return true;
    },
    isFilter(something, domain) {
        if (domainUtil.isDomainType(something, domain))
            return true;
        if (Array.isArray(something))
            throw new ErrorCustomSyntax('Not implemented: Array.isArray(fieldVal)');
        // На этом этапе должны остаться только варианты типа: {qty: { $lt: 5 }}
        // или {qty: { $gt: 10, $lt: 20, $nin: [13, 15] }}...
        if (isComparisonOperand(something, domain))
            return true;
        return false;
    },
    typifyFilter(
    // something: unknown,
    something, domain) {
        if (domainUtil.isDomainType(something, domain))
            return something;
        if (Array.isArray(something))
            throw new ErrorCustomSyntax('Not implemented: Array.isArray(fieldVal)');
        // На этом этапе должны остаться только варианты типа: {qty: { $lt: 5 }}
        // или {qty: { $gt: 10, $lt: 20, $nin: [13, 15] }}...
        const filter = typifyComparisonOperand(something, domain);
        return filter;
    },
});
////////////////////////////////////////////////////////////////////////////////
// Private util.
////////////////////////////////////////////////////////////////////////////////
function isComparisonOperand(something, domain) {
    if (typeof something !== 'object' || !something)
        throw new ErrorCustomType('typeof something !== object || !something');
    let operator;
    let operand;
    for ([operator, operand] of Object.entries(something)) {
        if (operator === '$eq'
            || operator === '$ne'
            || operator === '$gt'
            || operator === '$lt'
            || operator === '$gte'
            || operator === '$lte') {
            if (!domainUtil.isDomainType(operand, domain))
                throw new ErrorCustomType('!domainUtil2.isDomainType(operand, domain)');
            continue;
        }
        if (operator === '$in' || operator === '$nin') {
            if (!Array.isArray(operand))
                throw new ErrorCustomType('!Array.isArray(operand)');
            if (operand.length < 1)
                throw new ErrorCustomType('operand.length < 1');
            let arrayVal;
            for (arrayVal of operand) {
                if (!domainUtil.isDomainType(arrayVal, domain))
                    throw new ErrorCustomType('!domainUtil2.isDomainType(arrayVal, domain)');
            }
            continue;
        }
        if (operator === '$il' || operator === '$nil') {
            if (!Array.isArray(operand))
                throw new ErrorCustomType('!Array.isArray(operand)');
            if (operand.length < 1)
                throw new ErrorCustomType('operand.length < 1');
            let arrayVal;
            for (arrayVal of operand) {
                if (typeof arrayVal !== 'string')
                    throw new ErrorCustomType('typeof arrayVal !== string');
                if (!arrayVal.includes('*') && !arrayVal.includes('?'))
                    throw new ErrorCustomType('');
            }
            continue;
        }
        // Incorrect operator.
        return false;
    }
    return true;
}
function typifyComparisonOperand(
// something: unknown,
something, domain) {
    if (typeof something !== 'object' || !something)
        throw new ErrorCustomType('typeof something !== object || !something');
    const filterComparisonOperand = {};
    let operator;
    let operand; // Иначе ниже в цикле типизация operand: any
    for ([operator, operand] of Object.entries(something)) {
        if (operator === '$eq'
            || operator === '$ne'
            || operator === '$gt'
            || operator === '$lt'
            || operator === '$gte'
            || operator === '$lte') {
            if (!domainUtil.isDomainType(operand, domain))
                throw new ErrorCustomType('!domainUtil.isType(operand, domain)');
            filterComparisonOperand[operator] = operand;
            continue;
        }
        if (operator === '$in' || operator === '$nin') {
            if (!Array.isArray(operand))
                throw new ErrorCustomType('!Array.isArray(operand)');
            if (operand.length < 1)
                throw new ErrorCustomType('operand.length < 1');
            const typedOperand = [];
            let arrayVal;
            for (arrayVal of operand) {
                if (!domainUtil.isDomainType(arrayVal, domain))
                    throw new ErrorCustomType('!domainUtil.isType(arrayVal, domain)');
                typedOperand.push(arrayVal);
            }
            filterComparisonOperand[operator] = typedOperand;
            continue;
        }
        if (operator === '$il' || operator === '$nil') {
            if (!Array.isArray(operand))
                throw new ErrorCustomType('!Array.isArray(operand)');
            if (operand.length < 1)
                throw new ErrorCustomType('operand.length < 1');
            const typedOperand = [];
            let arrayVal;
            for (arrayVal of operand) {
                if (typeof arrayVal !== 'string')
                    throw new ErrorCustomType('typeof arrayVal !== string');
                if (!arrayVal.includes('*') && !arrayVal.includes('?'))
                    throw new ErrorCustomType('');
                typedOperand.push(arrayVal);
            }
            filterComparisonOperand[operator] = typedOperand;
            continue;
        }
        throw new ErrorCustomType('Incorrect operator.');
    }
    return filterComparisonOperand;
}
