'use strict';

class Lock {
  #active = false;
  #queue = [];

  enter() {
    return new Promise((resolve) => {
      const start = () => {
        this.#active = true;
        resolve();
      };
      if (!this.#active) {
        start();
        return;
      }
      this.#queue.push(start);
    });
  }

  leave() {
    if (!this.#active) return;
    this.#active = false;
    const next = this.#queue.pop();
    if (next) next();
  }
}

module.exports = { Lock };
