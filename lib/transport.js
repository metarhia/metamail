'use strict';

const { SMTPTransport } = require('./smtp/smtp-transport.js');

const smtp = (options) => new SMTPTransport(options);

module.exports = {
  smtp,
};
