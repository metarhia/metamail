'use strict';

const {
  authPlain,
  authLogin,
  authLoginUser,
  authLoginPassword,
} = require('./smtp-commands.js');

const authMethods = {
  PLAIN: (connection, auth) =>
    connection.send(authPlain(auth.user, auth.password)),
  LOGIN: (connection, auth) => {
    return connection.run(async () => {
      await connection.send(authLogin());
      await connection.send(authLoginUser(auth.user));
      await connection.send(authLoginPassword(auth.password));
    });
  },
};

function smptLogin(connection, auth, supportedMethods) {
  for (const methods of supportedMethods) {
    const runner = authMethods[methods];
    if (runner) return runner(connection, auth);
  }
  throw new Error('No supported auth methods');
}

module.exports = { smptLogin };
