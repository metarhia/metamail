'use strict';

const net = require('net');
const tls = require('tls');
const { EventEmitter } = require('events');
const { SMTPDataStream } = require('./smtp-data-stream.js');
const { parseResponseLine, defaultHostname } = require('./smtp-utils.js');
const { SMTP_CODES } = require('./smtp-codes.js');
const commands = require('./smtp-commands.js');
const { Lock } = require('../async-lock.js');

const SMTP_DEFAULT_POST = 25;
const SMTP_SECURE_PORT = 465;
const TERMINATING_CODES = [SMTP_CODES.serviceNotAvaliable];

const { greet, ehlo, helo, starttls, data, stream } = commands;

class SMTPError extends Error {
  constructor(code, message, command = '') {
    super(`${command ? command + ' failed: ' : ''}${code}: ${message}`);
    this.code = code;
    this.isTerminating = TERMINATING_CODES.includes(code);
  }
}

class SMTPConnection extends EventEmitter {
  #host = null;
  #port = SMTP_DEFAULT_POST;
  #name = defaultHostname;

  #smtpExtensions = {};
  #connected = false;
  #destroyed = false;

  #socket = null;
  #dataBuffer = '';
  #responseBuffer = [];
  #currentCommand = null;
  #connectionLock = new Lock();
  #sequenceLock = new Lock();

  constructor({ host, port, name }) {
    super();
    this.#host = host;
    if (port) this.#port = port;
    if (name) this.#name = name;
  }

  get supportedAuthMethods() {
    return this.#smtpExtensions.AUTH || [];
  }

  async connect() {
    await this.#connectionLock.enter();
    try {
      if (this.#destroyed) throw new Error('SMTP connection is destroyed.');
      if (this.#connected) return;
      await this.sendSequence(async () => {
        this.#configureSocket();
        await this.send(greet());
        await this.#handshake();
        this.#connected = true;
        this.emit('connect');
      });
    } finally {
      this.#connectionLock.leave();
    }
  }

  async #handshake() {
    try {
      this.#smtpExtensions = await this.send(ehlo(this.#name));
      if (this.#smtpExtensions.STARTTLS && !this.#socket.encrypted) {
        await this.send(starttls());
        this.#upgradeConnection();
        this.#smtpExtensions = await this.send(ehlo(this.#name));
      }
    } catch (err) {
      if (err.isTerminating) throw err;
      await this.send(helo(this.#name));
    }
  }

  send({ type, text, successCodes, process }) {
    if (this.#destroyed) throw new Error('SMTP connection is destroyed.');
    if (this.#currentCommand) throw new Error(`Other command is in flight`);
    return new Promise((resolve, reject) => {
      this.#currentCommand = (err, code, payload) => {
        if (err) {
          reject(err);
          return;
        }
        if (successCodes.includes(code)) {
          resolve(process ? process(payload) : payload);
        } else {
          const error = new SMTPError(code, payload, type);
          reject(error);
          this.emit('error', error);
        }
      };
      if (text) this.#socket.write(Buffer.from(text + '\r\n', 'utf-8'));
    });
  }

  async sendSequence(runner) {
    await this.#sequenceLock.enter();
    try {
      return await runner();
    } finally {
      this.#sequenceLock.leave();
    }
  }

  async sendData(dataInput) {
    return this.sendSequence(async () => {
      await this.send(data());
      const promise = this.send(stream());
      const dataStream = new SMTPDataStream();
      dataStream.pipe(this.#socket, { end: false });
      if (typeof dataInput.pipe === 'function') {
        dataInput.pipe(dataStream);
      } else {
        dataStream.write(dataInput);
        dataStream.end();
      }
      return promise;
    });
  }

  #configureSocket() {
    const isSecurePort = this.#port === SMTP_SECURE_PORT;
    const connector = isSecurePort ? tls : net;
    this.#socket = connector.connect({
      host: this.#host,
      port: this.#port,
    });
    this.#socket.once('connect', () => this.#socket.setKeepAlive(true));
    this.#socket.on('data', (chunk) => this.#processChunk(chunk));
    this.#socket.once('close', () => this.#destroy());
    this.#socket.on('error', (err) => this.#destroy(err));
  }

  #upgradeConnection() {
    const plainSocket = this.#socket;
    plainSocket.removeAllListeners(['data']);
    this.#socket = tls.connect({
      host: this.#host,
      port: this.#port,
      socket: plainSocket,
    });
    this.#socket.on('data', (chunk) => this.#processChunk(chunk));
    plainSocket.resume();
  }

  #processChunk(chunk) {
    this.#dataBuffer += chunk;
    const lines = this.#dataBuffer.split('\r\n');
    this.#dataBuffer = lines.pop();
    this.#responseBuffer.push(...lines.map(parseResponseLine).filter(Boolean));
    this.#processResponse();
  }

  #processResponse() {
    if (!this.#responseBuffer.length) return;
    const lastLine = this.#responseBuffer[this.#responseBuffer.length - 1];
    if (lastLine.isMultiline) return;
    const payload = this.#responseBuffer.map(({ data }) => data);
    this.#currentCommand?.(null, lastLine.code, payload);
    this.#currentCommand = null;
    this.#responseBuffer = [];
  }

  #destroy(error) {
    if (this.#destroyed) return;
    this.#currentCommand?.(error || new Error('SMTP connection is destroyed.'));
    if (error) this.emit('error', error);
    this.#currentCommand = null;
    this.#connected = false;
    this.#destroyed = true;
    if (!this.#socket?.destroyed) {
      this.#socket.destroy();
      this.#socket = null;
    }
    this.emit('end');
  }
}

module.exports = { SMTPConnection, SMTPError };
