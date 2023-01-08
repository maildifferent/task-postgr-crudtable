import { documentZ } from './util_front.js';
const MESSAGEBOX_CSS_CLASSES = Object.freeze({
    messagebox: 'messagebox',
    messagebox_container: 'messagebox_container',
    messagebox_removebtn: 'messagebox_removebtn',
});
export class Messagebox {
    container;
    constructor(parent) {
        this.container = documentZ.createElement('div').appendTo(parent)
            .classlist.add(MESSAGEBOX_CSS_CLASSES.messagebox_container).getElem();
    }
    clear() {
        this.container.innerHTML = '';
    }
    message(err) {
        let text = '...';
        if (err instanceof Error)
            text = err.message;
        const div = documentZ.createElement('div')
            .classlist.add(MESSAGEBOX_CSS_CLASSES.messagebox).appendTo(this.container).getElem();
        div.textContent = text;
        const button = documentZ.createElement('button')
            .classlist.add(MESSAGEBOX_CSS_CLASSES.messagebox_removebtn).appendTo(div).getElem();
        button.textContent = '[x]';
        button.addEventListener('click', () => { div.remove(); });
    }
}
