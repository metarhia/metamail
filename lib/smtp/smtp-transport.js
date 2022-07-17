'use strict';

const { SMTPConnection } = require('./smtp-connection.js');

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
    await this.connection.login(this.options.auth);
  }

  async send({ from, to, subject, text, html }) {
    console.log({ ...this.options, from, to, subject, text, html });
    return {};
  }
}

module.exports = { SMTPTransport };
