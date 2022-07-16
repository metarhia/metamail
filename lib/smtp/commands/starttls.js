'use strict';

const { SMTP_CODES } = require('../smtp-codes.js');
const { SMTPError } = require('../smtp-error.js');

function starttls(connection) {
  return new Promise((resolve, reject) => {
    connection.sendCommand({
      type: 'starttls',
      text: 'STARTTLS',
      finish(code, payload) {
        if (code === SMTP_CODES.SeviceReady) {
          console.log(payload);
          resolve(payload.slice(1));
        } else {
          reject(new SMTPError(code, payload, 'EHLO'));
        }
      },
    });
  });
}

module.exports = { starttls };
