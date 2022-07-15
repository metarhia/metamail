'use strict';

const { SMTP_CODES } = require('../smtp-codes.js');
const { SMTPError } = require('../smtp-error.js');

function ehlo(connection, name) {
  return new Promise((resolve, reject) => {
    connection.sendCommand({
      type: 'ehlo',
      text: `EHLO ${name}`,
      finish(code, payload) {
        if (code === SMTP_CODES.Completed) {
          resolve(payload);
        } else {
          reject(new SMTPError(code, payload, 'EHLO'));
        }
      },
    });
  });
}

module.exports = { ehlo };
