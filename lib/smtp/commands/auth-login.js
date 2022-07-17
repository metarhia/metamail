'use strict';

const { SMTP_CODES } = require('../smtp-codes.js');
const { SMTPError } = require('../smtp-error.js');

function authlogin(connection) {
  return new Promise((resolve, reject) => {
    connection.sendCommand({
      type: 'auth',
      text: `AUTH LOGIN`,
      finish(code, payload) {
        if (code === SMTP_CODES.AuthContinue) {
          resolve();
        } else {
          reject(new SMTPError(code, payload, 'AUTH'));
        }
      },
    });
  });
}

module.exports = { authlogin };
