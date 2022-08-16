'use strict';

const os = require('os');
const { isIPv4 } = require('net');
const { PassThrough } = require('stream');
const { SMTP_CODES } = require('./smtp-codes.js');

const SEPARATOR_POSITION = 3;
const MULTILINE_RESPONSE_SEPARATOR = '-';
const TERMINATING_CODES = [SMTP_CODES.serviceNotAvaliable];
const SMTP_LINE_END = '\r\n';
class SMTPError extends Error {
  constructor(code, message, command = '') {
    super(`${command ? command + ' failed: ' : ''}${code}: ${message}`);
    this.code = code;
    this.isTerminating = TERMINATING_CODES.includes(code);
  }
}

const bufferEndWith = (buffer, searchString) => {
  const bufferEnd = buffer
    .subarray(buffer.length - searchString.length)
    .toString();
  return bufferEnd === searchString;
};

const readLastSeparator = (buffer) => {
  const lineEndPosition = buffer.lastIndexOf(SMTP_LINE_END, buffer.length - 1);
  const lastLineStart =
    lineEndPosition < 0 ? 0 : lineEndPosition + SMTP_LINE_END.length;
  return String.fromCharCode(buffer[lastLineStart + SEPARATOR_POSITION]);
};

const parseResponseData = (input) => {
  const code = input.substring(0, SEPARATOR_POSITION);
  const isValidCode = !Number.isNaN(Number(code));
  if (!isValidCode) throw new Error('Response code is not valid');
  const data = input
    .split(SMTP_LINE_END)
    .map((line) => line.substring(SEPARATOR_POSITION + 1))
    .filter(Boolean);
  return { code, data };
};

const parseSmtpResponse = async (socket, type, successCodes) => {
  let buffer = Buffer.from('');
  const pass = new PassThrough();
  socket.pipe(pass);
  for await (const chunk of pass) {
    buffer = Buffer.concat([buffer, chunk]);
    if (!bufferEndWith(buffer, SMTP_LINE_END)) continue;
    const separator = readLastSeparator(buffer);
    if (separator === MULTILINE_RESPONSE_SEPARATOR) continue;
    const { code, data } = parseResponseData(buffer.toString());
    if (successCodes.includes(code)) return data;
    throw new SMTPError(code, data, type);
  }
  throw new Error('SMTP connection closed');
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
  const isFDQN = defaultHostname?.includes('.');
  if (!isFDQN) return '[127.0.0.1]';
  if (isIPv4(defaultHostname)) return `[${defaultHostname}]`;
  return defaultHostname;
};

module.exports = {
  parseSmtpResponse,
  processSMTPExtensions,
  defaultHostname: getDefaultHostname(),
};
