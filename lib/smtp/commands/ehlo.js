'use strict';

function ehlo(connection, name) {
  return new Promise((resolve, reject) => {
    connection.sendCommand({
      type: 'ehlo',
      text: `EHLO ${name}`,
      finish(code, payload) {
        if (code === '250') {
          resolve(payload);
          return;
        }
        if (code === '421') {
          reject(
            new Error(`Server terminates connection. response=${payload}`)
          );
        } else {
          reject(new Error(`EHLO failed: code=${code}, payload=${payload}`));
        }
      },
    });
  });
}

module.exports = { ehlo };
