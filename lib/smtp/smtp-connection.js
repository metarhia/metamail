'use strict';

const net = require('net');
const tls = require('tls');
const { greet, ehlo, helo, starttls, data } = require('./smtp-commands.js');
const { SMTPAuth } = require('./smtp-auth.js');
const { SMTPDataStream } = require('./smtp-data-stream.js');
const { parseResponseLine, getDefaultHostname } = require('./smtp-utils.js');
const { SMTP_CODES } = require('./smtp-codes');
const { SMTPError } = require('./smtp-error');

const SMTP_SECURE_PORT = 465;

class SMTPConnection {
  constructor(options) {
    this.options = options;
    this.name = options.name || getDefaultHostname();
    this.smtpExtensions = {};
    this.secure = options.port === SMTP_SECURE_PORT;
    this.connected = false;
    this._socket = null;
    this._dataBuffer = '';
    this._responseBuffer = [];
    this._currentCommand = null;
    this._auth = null;

    this._onSocketData = (chunk) => this._onData(chunk);
  }

  async connect() {
    if (this.connected) return;
    // TODO process call to connect while connection is in progress
    const connector = this.secure ? tls : net;
    this._socket = connector.connect({
      host: this.options.host,
      port: this.options.port,
    });
    this._configureSocket();

    await this.send(greet());
    try {
      this.smtpExtensions = await this.send(ehlo(this.name));
      if (this.smtpExtensions.STARTTLS && !this._socket.encrypted) {
        await this.send(starttls());
        this._upgradeConnection();
        this.smtpExtensions = await this.send(ehlo(this.name));
      }
    } catch (err) {
      if (err.isTerminating) throw err;
      await this.send(helo(this.name));
    }
    this.connected = true;
  }

  async login(authData) {
    this._auth = new SMTPAuth(this, authData, this.smtpExtensions.AUTH || []);
    await this._auth.login();
  }

  send({ type, text, successCodes, process }) {
    if (this._currentCommand) {
      throw new Error(
        `Other command ${this._currentCommand.type} is in flight`
      );
    }
    return new Promise((resolve, reject) => {
      this._currentCommand = (code, payload) =>
        successCodes.includes(code)
          ? resolve(process ? process(payload) : payload)
          : reject(new SMTPError(code, payload, type));
      if (text) this._socket.write(Buffer.from(text + '\r\n', 'utf-8'));
    });
  }

  async sendData(dataInput) {
    if (this._currentCommand) {
      throw new Error(
        `Other command ${this._currentCommand.type} is in flight`
      );
    }
    await this.send(data());
    const promise = this.send({
      type: 'STREAM',
      text: '',
      successCodes: [SMTP_CODES.Completed],
    });
    const stream = new SMTPDataStream();
    stream.pipe(this._socket, {
      end: false,
    });
    if (typeof dataInput.pipe === 'function') {
      dataInput.pipe(stream);
    } else {
      stream.write(dataInput);
      stream.end();
    }
    return promise;
  }

  _configureSocket() {
    this._socket.once('close', (...args) => console.log('close', args));
    this._socket.once('connect', () => {
      this._socket.setKeepAlive(true);
    });
    this._socket.on('data', this._onSocketData);
    this._socket.once('end', () => {
      this.connected = false;
    });
    this._socket.on('error', (...args) => console.log('error', args));
  }

  _onData(chunk) {
    this._dataBuffer += chunk;
    const lines = this._dataBuffer.split('\r\n');
    this._dataBuffer = lines.pop();

    for (const line of lines) {
      const response = parseResponseLine(line);
      if (response) this._responseBuffer.push(response);
    }

    this._processResponse();
  }

  _upgradeConnection() {
    const plainSocket = this._socket;
    plainSocket.removeListener('data', this._onSocketData);
    this._socket = tls.connect({
      host: this.options.host,
      port: this.options.port,
      socket: plainSocket,
    });
    this._configureSocket();
    plainSocket.resume();
  }

  _processResponse() {
    if (!this._responseBuffer.length) return;
    const lastLine = this._responseBuffer[this._responseBuffer.length - 1];
    if (lastLine.isMultiline) return;
    const payload = this._responseBuffer.map(({ data }) => data);
    console.log('process responce', {
      command: this._currentCommand,
      code: lastLine.code,
      payload,
    });
    this._currentCommand?.(lastLine.code, payload);
    this._currentCommand = null;
    this._responseBuffer = [];
  }
}

module.exports = { SMTPConnection };
