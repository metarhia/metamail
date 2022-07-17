'use strict';

const {
  authplain,
  authlogin,
  authloginuser,
  authloginpass,
} = require('./commands/index.js');

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
    await authplain(this.connection, this.options.user, this.options.password);
  }

  async authLogin() {
    await authlogin(this.connection);
    await authloginuser(this.connection, this.options.user);
    await authloginpass(this.connection, this.options.password);
  }
}

module.exports = { SMTPAuth };
