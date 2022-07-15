'use strict';

const { SMTP_CODES } = require('../smtp-codes.js');
const { SMTPError } = require('../smtp-error.js');

function greet(connection) {
  return new Promise((resolve, reject) => {
    connection.sendCommand({
      type: 'greet',
      text: '',
      finish(code, payload) {
        if (code === SMTP_CODES.SeviceReady) {
          resolve(payload.join(''));
        } else {
          reject(new SMTPError(code, payload, 'GREET'));
        }
      },
    });
  });
}

module.exports = { greet };
