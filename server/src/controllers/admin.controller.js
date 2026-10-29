import { HttpError } from "../utils/httpError.js";

const todo = (name) => () => {
  throw new HttpError(501, `${name} is not implemented yet`);
};

export const overview = todo("overview");           // live progress table
export const pushTicker = todo("pushTicker");       // Mogambo ticker message
export const setEventStatus = todo("setEventStatus"); // pause / resume / start
export const adjustTeam = todo("adjustTeam");       // award / deduct / reset checkpoint
export const submissionLog = todo("submissionLog");
export const toggleFreeze = todo("toggleFreeze");
