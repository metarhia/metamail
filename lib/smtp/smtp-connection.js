'use strict';

const net = require('net');
const { greet, ehlo, helo } = require('./commands/index.js');
const { parseResponseLine, getDefaultHostname } = require('./smtp-utils.js');

class SMTPConnection {
  constructor(options) {
    this.options = options;
    this.name = options.name || getDefaultHostname();
    this.connected = false;
    this._socket = null;
    this._dataBuffer = '';
    this._responseBuffer = [];
    this._currentCommand = null;

    this._onSocketData = (chunk) => this._onData(chunk);
  }

  async connect() {
    if (this.connected) return Promise.resolve();
    // TODO process call to connect while connection is in progress
    this._socket = net.connect({
      host: this.options.host,
      port: this.options.port,
    });
    this._configureSocket();

    await greet(this);
    try {
      await ehlo(this, this.name);
    } catch (err) {
      if (err.isTerminating) throw err;
      await helo(this, this.name);
    }
    this.connected = true;
  }

  sendCommand(command) {
    if (this._currentCommand) {
      throw new Error(
        `Other command ${this._currentCommand.type} is in flight`
      );
    }
    this._currentCommand = command;
    if (command.text) {
      this._socket.write(Buffer.from(command.text + '\r\n', 'utf-8'));
    }
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
      if (response) {
        this._responseBuffer.push(response);
      }
    }

    this._processResponse();
  }

  _processResponse() {
    if (!this._responseBuffer.length) return;
    const lastLine = this._responseBuffer[this._responseBuffer.length - 1];
    if (lastLine.isMultiline) return;
    const data = this._responseBuffer.map(({ data }) => data);
    this._currentCommand?.finish(lastLine.code, data);
    this._currentCommand = null;
    this._responseBuffer = [];
  }
}

module.exports = { SMTPConnection };
