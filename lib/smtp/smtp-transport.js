'use strict';

const { SMTPConnection } = require('./smtp-connection.js');
const { smptLogin } = require('./smtp-auth.js');

class SMTPTransport {
  constructor(options) {
    this.options = options || {};
    this.connection = new SMTPConnection({
      host: this.options.host,
      port: this.options.port,
    });
  }

  async connect() {
    await this.connection.connect();
    const { supportedAuthMethods } = this.connection;
    const { auth } = this.options;
    if (auth && supportedAuthMethods.length > 0) {
      await smptLogin(this.connection, auth);
    }
  }

  async send({ from, to, subject, text, html }) {
    console.log({ ...this.options, from, to, subject, text, html });
    return {};
  }
}

const smtp = (options) => new SMTPTransport(options);

module.exports = { SMTPTransport, smtp };
