'use strict';

const { SMTP_CODES } = require('./smtp-codes.js');
const { processSMTPExtensions } = require('./smtp-utils.js');

const base64Decode = (text) => Buffer.from(text, 'utf-8').toString('base64');

const greet = () => ({
  type: 'GREET',
  text: '',
  successCodes: [SMTP_CODES.seviceReady],
});

const ehlo = (name) => ({
  type: 'EHLO',
  text: `EHLO ${name}`,
  successCodes: [SMTP_CODES.completed],
  process: (payload) => processSMTPExtensions(payload.slice(1)),
});

const helo = (name) => ({
  type: 'HELO',
  text: `HELO ${name}`,
  successCodes: [SMTP_CODES.completed],
});

const starttls = () => ({
  type: 'STARTTLS',
  text: 'STARTTLS',
  successCodes: [SMTP_CODES.seviceReady],
});

const authPlain = (user, pass) => {
  const credentials = `\u0000${user}\u0000${pass}`;
  const auth = base64Decode(credentials);
  return {
    type: 'AUTH',
    text: `AUTH PLAIN ${auth}`,
    successCodes: [SMTP_CODES.authSuccessful],
  };
};

const authLogin = () => ({
  type: 'AUTH',
  text: `AUTH LOGIN`,
  successCodes: [SMTP_CODES.authContinue],
});

const authLoginUser = (user) => ({
  type: 'AUTH',
  text: base64Decode(user),
  successCodes: [SMTP_CODES.authContinue],
});

const authLoginPassword = (password) => ({
  type: 'AUTH',
  text: base64Decode(password, 'utf-8'),
  successCodes: [SMTP_CODES.authSuccessful],
});

const data = () => ({
  type: 'DATA',
  text: 'DATA',
  successCodes: [SMTP_CODES.waitingForInput],
});

const stream = () => ({
  type: 'STREAM',
  text: '',
  successCodes: [SMTP_CODES.completed],
});

module.exports = {
  greet,
  ehlo,
  helo,
  starttls,
  data,
  stream,
  authPlain,
  authLogin,
  authLoginUser,
  authLoginPassword,
};
