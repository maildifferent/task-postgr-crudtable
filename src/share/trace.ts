
export const TRACE_TYP = Object.freeze({
  listener: 'listener'
} as const)

type TraceTypesT = typeof TRACE_TYP[keyof typeof TRACE_TYP]

const isOn: Record<keyof typeof TRACE_TYP, boolean> = {
  listener: false
}

export function trace({ typ, msg }: { typ: TraceTypesT, msg: any }): void {
  if (isOn[typ]) console.log(msg + ' document.activeElement: ' + document.activeElement)
}
