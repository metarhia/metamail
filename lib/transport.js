'use strict';

const smtp = ({ host, port }) => {
  const transport = {
    async send({ from, to, subject, text, html }) {
      console.log({ host, port, from, to, subject, text, html });
      return {};
    },
  };
  return transport;
};

module.exports = {
  smtp,
};
