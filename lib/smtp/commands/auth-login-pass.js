'use strict';

const { SMTP_CODES } = require('../smtp-codes.js');
const { SMTPError } = require('../smtp-error.js');

function authloginpass(connection, password) {
  return new Promise((resolve, reject) => {
    connection.sendCommand({
      type: 'auth',
      text: Buffer.from(password, 'utf-8').toString('base64'),
      finish(code, payload) {
        if (code === SMTP_CODES.AuthSuccessful) {
          resolve();
        } else {
          reject(new SMTPError(code, payload, 'AUTH'));
        }
      },
    });
  });
}

module.exports = { authloginpass };
