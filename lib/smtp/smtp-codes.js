'use strict';

const SMTP_CODES = Object.freeze({
  SeviceReady: '220',
  Completed: '250',
  AuthSuccessful: '235',
  AuthContinue: '334',
  WaitingForInput: '354',
});

module.exports = { SMTP_CODES };
