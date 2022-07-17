'use strict';

module.exports = {
  ...require('./greet.js'),
  ...require('./ehlo.js'),
  ...require('./helo.js'),
  ...require('./starttls.js'),
  ...require('./auth-plain.js'),
  ...require('./auth-login.js'),
  ...require('./auth-login-user.js'),
  ...require('./auth-login-pass.js'),
};
