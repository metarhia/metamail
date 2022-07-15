'use strict';

const TERMINATING_CODES = ['421'];

class SMTPError extends Error {
  constructor(code, payload, command = '') {
    super(`${command ? command + ' failed: ' : ''}${code}: ${payload}`);
    this.code = code;
    this.payload = payload;
    this.isTerminating = TERMINATING_CODES.includes(code);
  }
}

module.exports = { SMTPError };
