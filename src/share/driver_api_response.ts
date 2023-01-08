
export type DriverApiResponseT<Result>
  = DriverApiResponseResultT<Result>
  | DriverApiResponseErrorI

export interface DriverApiResponseErrorI {
  ok: false
  error: any
}

export type DriverApiResponseResultT<Result> = {
  ok: true
  result: Result
}
