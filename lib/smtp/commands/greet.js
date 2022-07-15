'use strict';

function greet(connection) {
  return new Promise((resolve, reject) => {
    connection.sendCommand({
      type: 'greet',
      text: '',
      finish(code, payload) {
        if (code !== '220') {
          reject(
            new Error(
              `Invalid greeting response: code=${code}, payload=${payload}`
            )
          );
        } else {
          resolve(payload.join(''));
        }
      },
    });
  });
}

module.exports = { greet };
