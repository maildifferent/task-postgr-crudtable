import { ErrorCustomImpossible, ErrorCustomType } from './error.js'

export type ConstructorAnyT = new (...args: any[]) => unknown
export type MethodAnyT = (...args: any[]) => unknown

export function haveSameKeys(...objects: object[]): boolean {
  const initArr: string[] = []
  const allKeys = objects.reduce(
    (keys: string[], object: object) => keys.concat(Object.keys(object)),
    initArr
  )
  const union = new Set(allKeys)
  return objects.every(object => union.size === Object.keys(object).length)
}

export function hasProperties<Obj, Prop extends string>(
  something: Obj, props: Readonly<Prop[]>
): something is Obj & { [key in Prop]: unknown } {
  if (typeof something !== 'object' || !something) throw new ErrorCustomType('typeof something !== object || !something')
  for (const prop of props) {
    if (something[prop as unknown as keyof Obj] === undefined) throw new ErrorCustomType('')
  }
  return true
}
export function hasProperties2<Obj, Prop extends string>(
  something: Obj, props: Readonly<Prop[]>
): something is unknown extends Obj ? Obj & { [key in Prop]: unknown } : Obj {
  if (typeof something !== 'object' || !something) throw new ErrorCustomType('typeof something !== object || !something')
  for (const prop of props) {
    if (something[prop as unknown as keyof typeof something] === undefined) throw new ErrorCustomType('')
  }
  return true
}

export function setDocumentPropertyValue<Document, Key extends keyof Document>(
  key: Key, doc: Document, value: Document[Key]
): void {
  doc[key] = value
}

export function genProjectionFromDoc<
  Document,
  Keys extends keyof Document,
  Suffix
>(doc: Record<Keys, unknown>, suffix: Suffix): Record<Keys, Suffix> {
  const resultPartial: Partial<Record<Keys, Suffix>> = {}
  let key: Keys
  for (key in doc) {
    resultPartial[key] = suffix
  }
  return resultPartial as any
}

export type ConstFromInterfaceKeysT<T, U = { [Props in keyof T]: Props }> = U

export function checkIntervalBoundaries(
  frNum: number, toNum: number,
  minNum: number, maxNum: number
) {
  if (frNum < minNum) {
    console.error('Left border of interval < min value. Changed to min value.')
    frNum = minNum
  }

  if (toNum > maxNum) {
    console.error('Right border of interval > max value. Changed to max value.')
    toNum = maxNum
  }

  if (frNum > toNum) {
    throw new Error('Left border of interval > right border.')
  }

  return [frNum, toNum] as const
}

export function convertClipboardTextToArray(clipboardText: string): string[][] {
  const clipRows = clipboardText.split(/\r\n/) // (/[\n\f\r]/)
  // Trim trailing CR (carriage return) if present.
  if (clipRows[clipRows.length - 1] === '') { clipRows.pop() }
  //
  const clipArrs: string[][] = []
  for (let i = 0; i < clipRows.length; i++) {
    const clipRow = clipRows[i]
    if (!clipRow) throw new ErrorCustomImpossible('!clipRow')
    if (clipRow !== '')
      clipArrs.push(clipRow.split('\t'))
    else
      clipArrs.push([''])
  }
  return clipArrs
}

export type UndoPartial<T> = T extends Partial<infer R> ? R : never
// Пример.
{
  function testF<T>(arg: Partial<T>): T {
    type Full = UndoPartial<typeof arg>
    // @ts-ignore
    return ({}) as Full // Error.
  }
  testF
}

export function convWildcardStringToRegex(str: string): RegExp {
  console.log(str)
  return new RegExp(
    '^' + str.replaceAll('.', '\.')
      .replaceAll('?', '.')
      .replaceAll('*', '.*') + '$'
  )
}

////////////////////////////////////////////////////////////////////////////////
// Работа с байтами.
////////////////////////////////////////////////////////////////////////////////
export const byteToHex = (() => {
  const strArr: string[] = []
  for (let n = 0; n <= 0xff; ++n) {
    const hexOctet = n.toString(16).padStart(2, '0')
    strArr.push(hexOctet)
  }
  return strArr
})()

export function buf2hexString(arrayBuffer: ArrayBuffer): string {
  const buffArr = new Uint8Array(arrayBuffer)
  const hexOctets = new Array(buffArr.length)

  for (let i = 0; i < buffArr.length; ++i) {
    // hexOctets.push(byteToHex[buffArr[i]]);
    const buff = buffArr[i]
    if (buff === undefined) throw new ErrorCustomImpossible('!buff')
    hexOctets[i] = byteToHex[buff]
  }

  return hexOctets.join('')
}

export function num2bufBE(num: number): ArrayBuffer {
  if (typeof num !== 'number') throw new Error()
  if (!Number.isInteger(num)) throw new Error()
  if (num < 0) throw new Error()

  const bytes: number[] = []
  let workingNum = num
  while (workingNum > 256) {
    bytes.push(workingNum % 256)
    workingNum = Math.floor(workingNum / 256)
  }
  bytes.push(workingNum)

  const buffer = new ArrayBuffer(bytes.length)
  const uint8arr = new Uint8Array(buffer)

  for (let i = 0, j = bytes.length - 1; i < bytes.length; i++, j--) {
    const byte = bytes[i]
    if (byte === undefined) throw new ErrorCustomImpossible('byte === undefined')
    uint8arr[j] = byte
  }

  return buffer
}

export function num2bufBE2(num: number): ArrayBuffer {
  if (typeof num !== 'number') throw new Error()
  if (!Number.isInteger(num)) throw new Error()
  if (num < 0) throw new Error()

  let str = num.toString(16) // Big endian запись.
  if (str.length % 2 !== 0) str = '0' + str

  const bufLength = str.length / 2
  const buffer = new ArrayBuffer(bufLength)
  const uint8arr = new Uint8Array(buffer)

  for (let i = 0, j = 0; j < bufLength; i += 2, j++) {
    uint8arr[j] = Number('0x' + str[i] + str[i + 1])
  }

  return buffer
}

////////////////////////////////////////////////////////////////////////////////
// Typificators.
////////////////////////////////////////////////////////////////////////////////
// Example.
() => {
  const union = typifyUnion('', ['string', 'number'] as const)
  union

  // @ts-expect-error
  typifyUnion(2, ['string', 'number'] as const) // Error: "Type '"string"' is not assignable to type '2'".
}
export function typifyUnion<Union>(
  // something: unknown,
  something: Union,
  unionArr: readonly Union[]
): Union {
  const unionType = unionArr.find((validType) => validType === something)
  if (unionType === undefined) throw new ErrorCustomType('unionType === undefined')
  return unionType
}

// Example.
() => {
  const stringArr = typifyArray(['qqq', 'www'])
  const unknownArr = typifyArray(({}) as any)
  const anyArr = typifyArray(({}) as any[])
  stringArr; unknownArr; anyArr

  // @ts-expect-error
  typifyArray(({}) as unknown)

  // @ts-expect-error
  typifyArray(['1', '2'] as const)

  // @ts-expect-error
  typifyArray(2)
}
export function typifyArray<Item>(
  // something: unknown[],
  something: Item[]
): Item[] {
  if (!isUnknownArray(something)) throw new ErrorCustomType('!isUnknownArray(something)')
  return something

  function isUnknownArray(something: unknown): something is unknown[] {
    return Array.isArray(something)
  }
}

// Example.
() => {
  const numberArr = typifyArrayWithTypeGuard([1, 2], (something: unknown) => 33)
  const numberArr2 = typifyArrayWithTypeGuard(({}) as any, (something: unknown) => 33)
  numberArr; numberArr2

  // @ts-expect-error
  typifyArrayWithTypeGuard(({}) as unknown, (something: unknown) => 33)

  // @ts-expect-error
  typifyArrayWithTypeGuard(['qq', 'ww'], (something: unknown) => 33)
}
export function typifyArrayWithTypeGuard<T>(
  // something: unknown[],
  something: T[],
  typeGuard: (
    // something: unknown
    something: T
  ) => T
): T[] {
  const someArray = typifyArray(something)

  const typedArray: T[] = []
  for (let item of someArray) {
    typedArray.push(typeGuard(item))
  }

  return typedArray
}

export function typifyDocumentWithTypeGuard<T>(
  // something: Record<string, unknown>,
  something: Record<string, T>,
  typeGuard: (
    // something: unknown
    something: T
  ) => T
): Record<string, T> {
  if (typeof something !== 'object' || !something) throw new ErrorCustomType('typeof something !== object || !something')

  const doc: Record<string, T> = {}
  for (const [key, value] of Object.entries(something)) {
    doc[key] = typeGuard(value)
  }

  return doc
}

// Example.
() => {
  function test(something: string) {
    const somethingUntyped: unknown = something
    if (!isArrayWithTypeGuard(somethingUntyped, typeGuard)) throw new ErrorCustomType()
    somethingUntyped // ArrayType.
    // @ts-expect-error
    something = somethingUntyped
  }

  function typeGuard(something: { p1: number, p2: string }): something is { p1: number, p2: string } {
    return true
  }

  test
}
export function isArrayWithTypeGuard<T>(
  something: unknown, // unknown[],
  // something: T[],
  isTypeGuard: (
    something: any // unknown
    // something: T
  ) => something is T
): something is T[] {
  if (!isUnknownArray(something)) throw new ErrorCustomType('!isUnknownArray(something)')

  for (const item of something) {
    if (!isTypeGuard(item)) throw new ErrorCustomType('!isTypeGuard(item)')
  }
  return true

  function isUnknownArray(something: unknown): something is unknown[] {
    return Array.isArray(something)
  }
}

// Example.
() => {
  const stringTuple = typifyTuple2(['ww', 'ee'])
  const unknownTuple = typifyTuple2(['ww', 'ee'] as any)
  const anyTuple = typifyTuple2(['ww', 'ee'] as [any, any])
  stringTuple; unknownTuple; anyTuple

  // @ts-expect-error
  typifyTuple2(['ww', 'ee'] as unknown)
}
export function typifyTuple2<T1, T2>(
  // something: [unknown, unknown]
  something: [T1, T2]
): [T1, T2] {
  if (!isUnknownArray(something)) throw new ErrorCustomType('!isUnknownArray(something)')

  const [val1, val2] = something
  return [val1, val2]

  function isUnknownArray(something: unknown): something is unknown[] {
    return Array.isArray(something)
  }
}

// Example.
() => {
  const numberTuple = typifyTupleWithStringIdAndTypeGuard(['1', 2], (something: unknown) => 33)
  const numberTuple2 = typifyTupleWithStringIdAndTypeGuard(['1', 2] as any, (something: unknown) => 33)
  const anyTuple = typifyTupleWithStringIdAndTypeGuard(['1', 2] as [any, any], (something: unknown) => 33)
  numberTuple; numberTuple2; anyTuple

  // @ts-expect-error
  typifyTupleWithStringIdAndTypeGuard(['1', 2] as unknown, (something: unknown) => 33)
}
export function typifyTupleWithStringIdAndTypeGuard<T>(
  // something: [unknown, unknown],
  something: [string, T],
  typeGuard: (
    // something: unknown
    something: T
  ) => T
): [string, T] {

  const someArray = typifyTuple2(something)
  const [id, arr1] = someArray

  if (typeof id !== 'string') throw new ErrorCustomType('typeof id !== string')
  const value = typeGuard(arr1)

  return [id, value]
}

export function typifyNotPartial<T>(doc: Partial<T>, length: number): T {
  if (length < 1) throw new ErrorCustomType('')
  if (Object.keys(doc).length !== length) throw new ErrorCustomType('Object.keys(doc).length !== length')
  return doc as T
}

////////////////////////////////////////////////////////////////////////////////
// Some tests.
////////////////////////////////////////////////////////////////////////////////
() => {
  interface TestI { [key: string]: any }
  let key: keyof TestI = 0 // Type == string OR number.
  let extract: Extract<keyof TestI, string> = '' // Type == string.
  key; extract
}

() => {
  interface Test1 {
    prop1: string
    prop2: string
  }
  interface Test2 {
    prop2: string
    prop3: string
  }
  type IntersectionT = Test1 & Test2
  const intersection: IntersectionT = { prop1: '', prop2: '', prop3: '' }
  intersection
  // "a type matching any of the union’s members"
  type UnionT = Test1 | Test2
  let union: UnionT = { prop1: '', prop2: '', prop3: '' }
  union = { prop2: '', prop3: '' }
  union = { prop1: '', prop2: '' }
  union
}

() => {
  interface Test1 {
    prop1: string
    prop2: string
  }
  interface Test2 extends Test1 {
    prop3: string
  }
  //
  type OmitT = Omit<Test2, keyof Test1>
  const omit: OmitT = { prop3: '' }
  omit
  //
  type Test1Replica = Omit<Test2, keyof OmitT>
  const test1Replica: Test1Replica = { prop1: '', prop2: '' }
  test1Replica
}

() => {
  function func1<Some, All extends Some>(some: Some, all: All) {
    type OmitT = Omit<All, keyof Some>
    type SomeReplicaT = Omit<All, keyof OmitT>
    let someReplica: SomeReplicaT
    // someReplica = some // Error!
    someReplica = {} as any // Technical line.
    someReplica
  }
  func1
}
