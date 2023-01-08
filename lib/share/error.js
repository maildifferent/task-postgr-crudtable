class ErrorCustomBase extends Error {
}
export class ErrorCustomType extends ErrorCustomBase {
}
export class ErrorCustomSyntax extends ErrorCustomBase {
}
export class ErrorCustomImpossible extends ErrorCustomBase {
}
export class ErrorCustomAuthorization extends ErrorCustomBase {
}
export class ErrorCustomUnclassified extends ErrorCustomBase {
}
export function errorType(arg) { throw new ErrorCustomType(arg); }
export function errorImpossible(arg) { throw new ErrorCustomImpossible(arg); }
