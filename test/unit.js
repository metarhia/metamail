'use strict';

const metatests = require('metatests');
const metamail = require('..');

const auth = { user: 'marcus', password: 'marcus' };
const options = { host: 'smtp.domain', port: 465, auth };

metatests.test('Mail tests stub', async (test) => {
  const smtp = metamail.smtp(options);

  const mail = await smtp.send({
    from: 'Marcus Aurelius <marcus@metarhia.com>',
    to: 'Renatus Cartesius <rene@metarhia.com>',
    subject: 'Hola!',
    text: 'Ciao mondo!',
    html: '<h1>Hello world!</h1>',
  });

  test.strictSame(mail, {});
  test.end();
});
