'use strict';

const { SMTP_CODES } = require('./smtp-codes.js');
const { processSMTPExtensions } = require('./smtp-utils.js');

const greet = () => ({
  type: 'GREET',
  text: '',
  successCodes: [SMTP_CODES.SeviceReady],
});

const ehlo = (name) => ({
  type: 'EHLO',
  text: `EHLO ${name}`,
  successCodes: [SMTP_CODES.Completed],
  process: (payload) => processSMTPExtensions(payload.slice(1)),
});

const helo = (name) => ({
  type: 'HELO',
  text: `HELO ${name}`,
  successCodes: [SMTP_CODES.Completed],
});

const starttls = () => ({
  type: 'STARTTLS',
  text: 'STARTTLS',
  successCodes: [SMTP_CODES.SeviceReady],
});

const authPlain = (user, pass) => {
  const auth = Buffer.from(`\u0000${user}\u0000${pass}`, 'utf-8').toString(
    'base64'
  );
  return {
    type: 'AUTH',
    text: `AUTH PLAIN ${auth}`,
    successCodes: [SMTP_CODES.AuthSuccessful],
  };
};

const authLogin = () => ({
  type: 'AUTH',
  text: `AUTH LOGIN`,
  successCodes: [SMTP_CODES.AuthContinue],
});

const authLoginUser = (user) => ({
  type: 'AUTH',
  text: Buffer.from(user, 'utf-8').toString('base64'),
  successCodes: [SMTP_CODES.AuthContinue],
});

const authLoginPassword = (password) => ({
  type: 'AUTH',
  text: Buffer.from(password, 'utf-8').toString('base64'),
  successCodes: [SMTP_CODES.AuthSuccessful],
});

const data = () => ({
  type: 'DATA',
  text: 'DATA',
  successCodes: [SMTP_CODES.WaitingForInput],
});

module.exports = {
  greet,
  ehlo,
  helo,
  starttls,
  data,
  authPlain,
  authLogin,
  authLoginUser,
  authLoginPassword,
};
