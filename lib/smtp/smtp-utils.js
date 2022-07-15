'use strict';

const os = require('os');

const LINE_REGEXP = /(\d{3})(-| )(.*)/i;
const MULTILINE_RESPONSE_SEPARATOR = '-';

function parseResponseLine(line) {
  const matches = LINE_REGEXP.exec(line);
  if (!matches) return null;
  const [, code, separator, data] = matches;
  return {
    code,
    isMultiline: separator === MULTILINE_RESPONSE_SEPARATOR,
    data,
  };
}

function getDefaultHostname() {
  const defaultHostname = os.hostname();
  // ignore if not FQDN
  if (!defaultHostname || !defaultHostname.includes('.')) {
    return '[127.0.0.1]';
  }
  // IP should be enclosed in []
  if (defaultHostname.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) {
    return '[' + defaultHostname + ']';
  }
  return defaultHostname;
}

module.exports = { parseResponseLine, getDefaultHostname };
