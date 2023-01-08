// @ts-ignore
function convStringArrsToCSV(strArrs) {
    const lines = [];
    for (const strArr of strArrs) {
        const line = strArr.map((str) => str.match(',') ? `"${str}"` : str).join(',');
        lines.push(line);
    }
    return lines.join('\n');
}
export async function copyToClipboard(txt) {
    const type = 'text/plain';
    const blob = new Blob([txt], { type });
    const data = [new ClipboardItem({ [type]: blob })];
    return navigator.clipboard.write(data);
}
////////////////////////////////////////////////////////////////////////////////
// Just a little bit better interface for document.createElement().
////////////////////////////////////////////////////////////////////////////////
// Example:
() => {
    const div = documentZ.createElement('div')
        .id('some_id')
        .classlist.add('some_class')
        .appendTo(document.body)
        .getElem();
    div;
};
export const documentZ = Object.freeze({
    createElement(tag) {
        class ElemsCreator {
            element;
            classlist = {
                add: (className) => {
                    this.element.classList.add(className);
                    return this;
                }
            };
            constructor(tag) {
                this.element = document.createElement(tag);
            }
            appendTo(elem) {
                elem.append(this.element);
                return this;
            }
            id(id) {
                this.element.id = id;
                return this;
            }
            getElem() {
                return this.element;
            }
        }
        return new ElemsCreator(tag);
    }
});
