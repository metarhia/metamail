'use strict';

const SMTP_CODES = Object.freeze({
  seviceReady: '220',
  completed: '250',
  authSuccessful: '235',
  authContinue: '334',
  waitingForInput: '354',
  serviceNotAvaliable: '421',
});

module.exports = { SMTP_CODES };
