import { ErrorCustomType } from './error.js';
export class Filtersource {
    appOptions;
    front;
    filterSchema;
    domSchema;
    constructor({ filterSchema, domSchema, appOptions, front }) {
        this.appOptions = appOptions;
        this.front = front;
        this.filterSchema = filterSchema;
        this.domSchema = domSchema;
        this.appOptions;
    }
    create({ key, filter }) {
        const { filterSchema, front } = this;
        if (key in filterSchema)
            throw new ErrorCustomType('');
        filterSchema[key] = filter;
        front.create({ key, filter });
    }
    read({ key }) {
        const { filterSchema } = this;
        return filterSchema[key];
    }
    update({ key, filter }) {
        const { filterSchema, front } = this;
        if (!(key in filterSchema))
            throw new ErrorCustomType('');
        filterSchema[key] = filter;
        front.update({ key, filter });
    }
    delete({ key }) {
        const { filterSchema, front } = this;
        if (!(key in filterSchema))
            throw new ErrorCustomType('');
        delete filterSchema[key];
        front.delete({ key });
    }
    getFilterSchema() { const { filterSchema } = this; return { filterSchema }; }
}
