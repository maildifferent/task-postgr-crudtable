
class ErrorCustomBase extends Error { }

export class ErrorCustomType extends ErrorCustomBase { }
export class ErrorCustomSyntax extends ErrorCustomBase { }
export class ErrorCustomImpossible extends ErrorCustomBase { }
export class ErrorCustomAuthorization extends ErrorCustomBase { }
export class ErrorCustomUnclassified extends ErrorCustomBase { }

export function errorType(arg: any): never { throw new ErrorCustomType(arg) }
export function errorImpossible(arg: any): never { throw new ErrorCustomImpossible(arg) }
