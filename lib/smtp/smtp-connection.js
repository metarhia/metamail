'use strict';

const net = require('net');
const tls = require('tls');
const { EventEmitter } = require('events');
const { SMTPDataStream } = require('./smtp-data-stream.js');
const { parseSmtpResponse, defaultHostname } = require('./smtp-utils.js');
const commands = require('./smtp-commands.js');
const { Lock } = require('../async-lock.js');

const SMTP_DEFAULT_POST = 25;
const SMTP_SECURE_PORT = 465;

const { greet, ehlo, helo, starttls, data, stream } = commands;

class SMTPConnection extends EventEmitter {
  #host;
  #port = SMTP_DEFAULT_POST;
  #name = defaultHostname;

  #socket = null;
  #active = false;
  #smtpExtensions = {};

  #connectionLock = new Lock();
  #sequenceLock = new Lock();
  #commandLock = new Lock();

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
      if (this.#active) return;
      await this.sendSequence(async () => {
        this.#configureSocket();
        await this.send(greet());
        await this.#handshake();
        this.#active = true;
        this.emit('active');
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

  async send({ type, text, successCodes, process }) {
    await this.#commandLock.enter();
    if (text) this.#socket.write(Buffer.from(text + '\r\n', 'utf-8'));
    try {
      const res = await parseSmtpResponse(this.#socket, type, successCodes);
      return process ? process(res) : res;
    } finally {
      this.#commandLock.leave();
    }
  }

  async sendSequence(runner) {
    await this.#sequenceLock.enter();
    try {
      return await runner();
    } finally {
      this.#sequenceLock.leave();
    }
  }

  async sendData(sourceStream) {
    return this.sendSequence(async () => {
      await this.send(data());
      const promise = this.send(stream());
      const dataStream = new SMTPDataStream();
      sourceStream.pipe(dataStream).pipe(this.#socket, { end: false });
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
    this.#socket.once('close', () => this.#reset());
  }

  #upgradeConnection() {
    const plainSocket = this.#socket;
    plainSocket.removeAllListeners();
    this.#socket = tls.connect({
      host: this.#host,
      port: this.#port,
      socket: plainSocket,
    });
    this.#socket.once('connect', () => this.#socket.setKeepAlive(true));
    this.#socket.once('close', () => this.#reset());
    plainSocket.resume();
  }

  #reset() {
    if (!this.#active) return;
    this.#active = false;
    if (!this.#socket?.destroyed) {
      this.#socket.destroy();
      this.#socket = null;
    }
    this.emit('reset');
  }
}

module.exports = { SMTPConnection };
