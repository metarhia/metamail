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
  smtpExtensions = {};
  connected = false;
  #socket = null;
  #dataBuffer = '';
  #responseBuffer = [];
  #currentCommand = null;
  #auth = null;

  constructor(options) {
    this.options = options;
    this.name = options.name || getDefaultHostname();
    this.secure = options.port === SMTP_SECURE_PORT;
  }

  async connect() {
    if (this.connected) return;
    // TODO process call to connect while connection is in progress
    const connector = this.secure ? tls : net;
    this.#socket = connector.connect({
      host: this.options.host,
      port: this.options.port,
    });
    this.#configureSocket();

    await this.send(greet());
    try {
      this.smtpExtensions = await this.send(ehlo(this.name));
      if (this.smtpExtensions.STARTTLS && !this.#socket.encrypted) {
        await this.send(starttls());
        this.#upgradeConnection();
        this.smtpExtensions = await this.send(ehlo(this.name));
      }
    } catch (err) {
      if (err.isTerminating) throw err;
      await this.send(helo(this.name));
    }
    this.connected = true;
  }

  async login(authData) {
    this.#auth = new SMTPAuth(this, authData, this.smtpExtensions.AUTH || []);
    await this.#auth.login();
  }

  send({ type, text, successCodes, process }) {
    if (this.#currentCommand) {
      throw new Error(
        `Other command ${this.#currentCommand.type} is in flight`
      );
    }
    return new Promise((resolve, reject) => {
      this.#currentCommand = (code, payload) =>
        successCodes.includes(code)
          ? resolve(process ? process(payload) : payload)
          : reject(new SMTPError(code, payload, type));
      if (text) this.#socket.write(Buffer.from(text + '\r\n', 'utf-8'));
    });
  }

  async sendData(dataInput) {
    if (this.#currentCommand) {
      throw new Error(
        `Other command ${this.#currentCommand.type} is in flight`
      );
    }
    await this.send(data());
    const promise = this.send({
      type: 'STREAM',
      text: '',
      successCodes: [SMTP_CODES.Completed],
    });
    const stream = new SMTPDataStream();
    stream.pipe(this.#socket, {
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

  #configureSocket() {
    this.#socket.once('close', (...args) => console.log('close', args));
    this.#socket.once('connect', () => {
      this.#socket.setKeepAlive(true);
    });
    this.#socket.on('data', this.#onData);
    this.#socket.once('end', () => {
      this.connected = false;
    });
    this.#socket.on('error', (...args) => console.log('error', args));
  }

  #onData = (chunk) => {
    this.#dataBuffer += chunk;
    const lines = this.#dataBuffer.split('\r\n');
    this.#dataBuffer = lines.pop();

    for (const line of lines) {
      const response = parseResponseLine(line);
      if (response) this.#responseBuffer.push(response);
    }

    this.#processResponse();
  };

  #upgradeConnection() {
    const plainSocket = this.#socket;
    plainSocket.removeListener('data', this.#onData);
    this.#socket = tls.connect({
      host: this.options.host,
      port: this.options.port,
      socket: plainSocket,
    });
    this.#configureSocket();
    plainSocket.resume();
  }

  #processResponse() {
    if (!this.#responseBuffer.length) return;
    const lastLine = this.#responseBuffer[this.#responseBuffer.length - 1];
    if (lastLine.isMultiline) return;
    const payload = this.#responseBuffer.map(({ data }) => data);
    console.log('process responce', {
      command: this.#currentCommand,
      code: lastLine.code,
      payload,
    });
    this.#currentCommand?.(lastLine.code, payload);
    this.#currentCommand = null;
    this.#responseBuffer = [];
  }
}

module.exports = { SMTPConnection };
