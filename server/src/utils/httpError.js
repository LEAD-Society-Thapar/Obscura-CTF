// `data` is merged into the JSON error body, e.g. { code: "LOCKED", act: 2 } -> { error, code, act }.
// The client reads it as ApiError.data (see client/src/api/client.js).
export class HttpError extends Error {
  constructor(status, message, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export const notImplemented = (name) => (_req, _res, next) =>
  next(new HttpError(501, `${name} is not implemented yet`));
