'use strict';

const { SMTP_CODES } = require('../smtp-codes.js');
const { SMTPError } = require('../smtp-error.js');

function authloginuser(connection, user) {
  return new Promise((resolve, reject) => {
    connection.sendCommand({
      type: 'auth',
      text: Buffer.from(user, 'utf-8').toString('base64'),
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

module.exports = { authloginuser };
