'use strict';

const net = require('net');
const tls = require('tls');
const { EventEmitter } = require('events');
const {
  greet,
  ehlo,
  helo,
  starttls,
  data,
  stream,
} = require('./smtp-commands.js');
const { SMTPAuth } = require('./smtp-auth.js');
const { SMTPDataStream } = require('./smtp-data-stream.js');
const { parseResponseLine, getDefaultHostname } = require('./smtp-utils.js');
const { SMTPError } = require('./smtp-error');

const SMTP_SECURE_PORT = 465;

class SMTPConnection extends EventEmitter {
  smtpExtensions = {};
  connected = false;
  #connecting = null;
  #destroyed = false;
  #socket = null;
  #dataBuffer = '';
  #responseBuffer = [];
  #currentCommand = null;
  #currentSequence = null;
  #auth = null;

  constructor(options) {
    super();
    this.options = options;
    this.name = options.name || getDefaultHostname();
    this.secure = options.port === SMTP_SECURE_PORT;
  }

  async run(runner) {
    while (this.#currentSequence) {
      await this.#currentSequence;
    }
    this.#currentSequence = new Promise((resolve, reject) => {
      runner()
        .then((result) => resolve(result))
        .catch((err) => reject(err))
        .finally(() => {
          this.#currentSequence = null;
        });
    });
    return this.#currentSequence;
  }

  async connect() {
    if (this.connected) return Promise.resolve();
    if (this.#connecting) return this.#connecting;
    this.#connecting = this.run(async () => {
      this.#configureSocket();
      await this.send(greet());
      await this.#handshake();
      this.connected = true;
      this.emit('connect');
    });
    return this.#connecting;
  }

  async #handshake() {
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
  }

  async login(authData) {
    this.#auth = new SMTPAuth(this, authData, this.smtpExtensions.AUTH || []);
    await this.#auth.login();
  }

  send({ type, text, successCodes, process }) {
    if (this.#destroyed) throw new Error('SMTP connection is destroyed.');
    if (this.#currentCommand) {
      throw new Error(
        `Other command ${this.#currentCommand.type} is in flight`
      );
    }
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

  async sendData(dataInput) {
    return this.run(async () => {
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
    const connector = this.secure ? tls : net;
    this.#socket = connector.connect({
      host: this.options.host,
      port: this.options.port,
    });

    this.#socket.once('connect', () => this.#socket.setKeepAlive(true));
    this.#socket.on('data', this.#onData);
    this.#socket.once('close', this.#onClose);
    this.#socket.on('error', this.#onError);
  }

  #onData = (chunk) => {
    this.#dataBuffer += chunk;
    const lines = this.#dataBuffer.split('\r\n');
    this.#dataBuffer = lines.pop();
    this.#responseBuffer.push(...lines.map(parseResponseLine).filter(Boolean));
    this.#processResponse();
  };

  #onError = (err) => {
    this.#destroy(err);
  };

  #onClose = () => {
    this.#destroy();
  };

  #upgradeConnection() {
    const plainSocket = this.#socket;
    plainSocket.removeListener('data', this.#onData);
    this.#socket = tls.connect({
      host: this.options.host,
      port: this.options.port,
      socket: plainSocket,
    });
    this.#socket.on('data', this.#onData);
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
    this.#currentCommand?.(null, lastLine.code, payload);
    this.#currentCommand = null;
    this.#responseBuffer = [];
  }

  #destroy(error) {
    if (this.#destroyed) return;
    this.#currentCommand?.(error || new Error('SMTP connection is destroyed.'));
    if (error) this.emit('error', error);
    this.#currentCommand = null;
    this.connected = false;
    this.#destroyed = true;
    if (!this.#socket?.destroyed) {
      this.#socket.destroy();
      this.#socket = null;
    }
    this.emit('end');
  }
}

module.exports = { SMTPConnection };
