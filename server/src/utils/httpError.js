export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const notImplemented = (name) => (_req, _res, next) =>
  next(new HttpError(501, `${name} is not implemented yet`));
