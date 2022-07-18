'use strict';

const {
  authPlain,
  authLogin,
  authLoginUser,
  authLoginPassword,
} = require('./smtp-commands.js');

class SMTPAuth {
  constructor(connection, options, supportedMethods) {
    this.connection = connection;
    this.options = options;
    this.supportedMethods = new Set(
      supportedMethods.map((method) => method.toUpperCase())
    );
  }

  async login() {
    if (this.supportedMethods.has('LOGIN')) {
      return this.authLogin();
    } else if (this.supportedMethods.has('PLAIN')) {
      return this.authPlain();
    }
    throw new Error('No supported auth methods');
  }

  async authPlain() {
    await this.connection.send(
      authPlain(this.options.user, this.options.password)
    );
  }

  async authLogin() {
    await this.connection.send(authLogin());
    await this.connection.send(authLoginUser(this.options.user));
    await this.connection.send(authLoginPassword(this.options.password));
  }
}

module.exports = { SMTPAuth };
