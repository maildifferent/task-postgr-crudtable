export const TRACE_TYP = Object.freeze({
    listener: 'listener'
});
const isOn = {
    listener: false
};
export function trace({ typ, msg }) {
    if (isOn[typ])
        console.log(msg + ' document.activeElement: ' + document.activeElement);
}
