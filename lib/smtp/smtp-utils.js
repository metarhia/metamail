'use strict';

const os = require('os');
const { isIPv4 } = require('net');

const SEPARATOR_POSITION = 4;
const MULTILINE_RESPONSE_SEPARATOR = '-';

// SMTP response format - 3 digits, space or -, free text till line end
const parseResponseLine = (line) => {
  const code = line.substring(0, SEPARATOR_POSITION - 1);
  const isValidCode = !Number.isNaN(Number(code));
  if (!isValidCode) return null;
  const separator = line[SEPARATOR_POSITION];
  const data = line.substring(SEPARATOR_POSITION);
  return {
    code,
    isMultiline: separator === MULTILINE_RESPONSE_SEPARATOR,
    data,
  };
};

const processSMTPExtensions = (lines) => {
  const extension = {};
  for (const line of lines) {
    if (line.startsWith('SIZE')) {
      const [, size] = line.split(' ');
      extension.SIZE = parseInt(size, 10);
    } else if (line.startsWith('AUTH')) {
      const [, ...methods] = line.split(' ');
      extension.AUTH = methods;
    } else {
      extension[line] = true;
    }
  }
  return extension;
};

const getDefaultHostname = () => {
  const defaultHostname = os.hostname();
  // ignore if not FQDN
  if (!defaultHostname || !defaultHostname.includes('.')) return '[127.0.0.1]';
  // IP should be enclosed in []
  if (isIPv4(defaultHostname)) return `[${defaultHostname}]`;
  return defaultHostname;
};

module.exports = {
  parseResponseLine,
  processSMTPExtensions,
  getDefaultHostname,
};
