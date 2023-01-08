import { errorType } from './error.js';
import { TABREP_CSS_CLASSES } from './tabrep_front.js';
//////////////////////////////////////////////////////////////////////////////
// Resizer.
//////////////////////////////////////////////////////////////////////////////
const resizerColWidthExtraPixel = 1;
export function tabrepColresizerFunctionality(tabMain, tabHead) {
    setWidthOfTableAndCols();
    const resizers = addResizerDivsToCols();
    addEventListenersToResizersMousedown();
    return resizers;
    //////////////////////////////////////////////////////////////////////////////
    // Util. Local.
    //////////////////////////////////////////////////////////////////////////////
    function setWidthOfTableAndCols() {
        let tabWidth = 0;
        const cols = tabHead.querySelectorAll('td');
        for (const col of cols) {
            const widthCol = col.offsetWidth + resizerColWidthExtraPixel;
            tabWidth += widthCol;
            col.style.width = widthCol + 'px';
            col.style.maxWidth = widthCol + 'px';
        }
        tabMain.style.width = tabWidth + 'px';
        tabMain.style.tableLayout = 'fixed';
    }
    function addResizerDivsToCols() {
        const resizers = [];
        const cols = tabHead.querySelectorAll('td');
        for (const td of cols) {
            const resizer = document.createElement('div');
            resizer.classList.add(TABREP_CSS_CLASSES.resizer);
            td.append(resizer);
            resizer.style.height = td.offsetHeight + 'px';
            resizers.push(resizer);
        }
        return resizers;
    }
    function addEventListenersToResizersMousedown() {
        for (const resizer of resizers) {
            const td = resizer.closest('td') || errorType('');
            resizer.addEventListener('mousedown', (event) => {
                // console.log('event== resizer: mousedown ==event')
                event.preventDefault();
                const clientX = event.clientX;
                const widthTd = td.offsetWidth;
                const widthTable = tabMain.offsetWidth;
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
                function onMouseMove(event) {
                    // console.log('event== document: mousemove ==event')
                    const dClientX = event.clientX - clientX;
                    if (!td)
                        return;
                    td.style.width = widthTd + dClientX + 'px';
                    td.style.maxWidth = widthTd + dClientX + 'px';
                    tabMain.style.width = widthTable + dClientX + 'px';
                }
                function onMouseUp() {
                    // console.log('event== document: mouseup ==event')
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                }
            });
        }
    }
}
////////////////////////////////////////////////////////////////////////////////
// Resizer. Doubleclick.
////////////////////////////////////////////////////////////////////////////////
export function tabrepColresizerDblclickFunctionality(tabMain, resizers) {
    for (const resizer of resizers) {
        const td = resizer.closest('td');
        resizer.addEventListener('dblclick', onDblclick);
        ////////////////////////////////////////////////////////////////////////////
        // Util. Local.
        ////////////////////////////////////////////////////////////////////////////
        function onDblclick(event) {
            // console.log('event== resizer: dblclick ==event')
            if (!td)
                return;
            event.preventDefault();
            const widthTabMain = tabMain.offsetWidth;
            const widthTd = td.offsetWidth;
            // Reset styles.
            td.style.width = '';
            td.style.maxWidth = '';
            tabMain.style.width = '';
            tabMain.style.tableLayout = '';
            // Calc difference.
            const newWidthTd = td.offsetWidth + resizerColWidthExtraPixel;
            const dWidthTd = newWidthTd - widthTd;
            // Set resetted styles back.
            td.style.width = newWidthTd + 'px';
            td.style.maxWidth = newWidthTd + 'px';
            tabMain.style.width = widthTabMain + dWidthTd + 'px';
            tabMain.style.tableLayout = 'fixed';
        }
    }
}
