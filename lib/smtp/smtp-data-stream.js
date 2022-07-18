'use strict';

const { Transform } = require('stream');

const DOT = 0x2e;
const LF = 0x0a;
const CR = 0x0d;

class SMTPDataStream extends Transform {
  constructor(options) {
    super(options);
    this.lastByte = 0;
  }

  _transform(chunk, encoding, done) {
    if (!chunk || !chunk.length) {
      done();
      return;
    }
    if (typeof chunk === 'string') chunk = Buffer.from(chunk);
    this.push(this._prepareChunk(chunk));
    this.lastByte = chunk[chunk.length - 1];
    done();
  }

  _prepareChunk(chunk) {
    const chunks = [];
    let lastPos = 0;
    for (let i = 0; i < chunk.length; i++) {
      const currentByte = chunk[i];
      const prevByte = i ? chunk[i - 1] : this.lastByte;
      if (currentByte === DOT && prevByte !== LF) {
        // escape dot on line start
        chunks.push(chunk.slice(lastPos, i + 1));
        chunks.push(Buffer.from('.'));
        lastPos = i + 1;
      } else if (currentByte === LF && prevByte !== CR) {
        // make sure that only <CR><LF> sequences are used for linebreaks
        chunks.push(chunk.slice(lastPos, i));
        chunks.push(Buffer.from('\r\n'));
        lastPos = i + 1;
      }
    }
    if (!chunks.length) return chunk;
    if (lastPos < chunk.length) chunks.push(chunk.slice(lastPos));
    return Buffer.concat(chunks);
  }

  _flush(done) {
    if (this.lastByte === LF) this.push(Buffer.from('.\r\n'));
    else if (this.lastByte === CR) this.push(Buffer.from('\n.\r\n'));
    else this.push(Buffer.from('\r\n.\r\n'));
    done();
  }
}

module.exports = { SMTPDataStream };
