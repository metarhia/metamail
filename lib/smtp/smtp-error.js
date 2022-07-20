'use strict';

const { SMTP_CODES } = require('./smtp-codes.js');

const TERMINATING_CODES = [SMTP_CODES.ServiceNotAvaliable];
class SMTPError extends Error {
  constructor(code, payload, command = '') {
    super(`${command ? command + ' failed: ' : ''}${code}: ${payload}`);
    this.code = code;
    this.payload = payload;
    this.isTerminating = TERMINATING_CODES.includes(code);
  }
}

module.exports = { SMTPError };
