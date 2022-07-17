'use strict';

const { SMTP_CODES } = require('../smtp-codes.js');
const { SMTPError } = require('../smtp-error.js');

function authplain(connection, user, pass) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`\u0000${user}\u0000${pass}`, 'utf-8').toString(
      'base64'
    );
    connection.sendCommand({
      type: 'auth',
      text: `AUTH PLAIN ${auth}`,
      finish(code, payload) {
        if (code === SMTP_CODES.AuthSuccessful) {
          resolve(payload);
        } else {
          reject(new SMTPError(code, payload, 'EHLO'));
        }
      },
    });
  });
}

module.exports = { authplain };
