# Metarhia mail subsystem

[![ci status](https://github.com/metarhia/metamail/workflows/Testing%20CI/badge.svg)](https://github.com/metarhia/metamail/actions?query=workflow%3A%22Testing+CI%22+branch%3Amaster)
[![snyk](https://snyk.io/test/github/metarhia/metamail/badge.svg)](https://snyk.io/test/github/metarhia/metamail)
[![npm version](https://badge.fury.io/js/metamail.svg)](https://badge.fury.io/js/metamail)
[![npm downloads/month](https://img.shields.io/npm/dm/metamail.svg)](https://www.npmjs.com/package/metamail)
[![npm downloads](https://img.shields.io/npm/dt/metamail.svg)](https://www.npmjs.com/package/metamail)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/metarhia/metamail/blob/master/LICENSE)

## Send mail

```js
const metamail = require('metamail');

const auth = { user: 'marcus', password: 'marcus' };
const smtp = metamail.smtp({ host: 'smtp.domain', port: 465, auth });

const mail = await smtp.send({
  from: 'Marcus Aurelius <marcus@metarhia.com>',
  to: 'Renatus Cartesius <rene@metarhia.com>',
  subject: 'Hola!',
  text: 'Ciao mondo!',
  html: '<h1>Ciao mondo!</h1>',
});

console.log({ mail });
```

## License & Contributors

Copyright (c) 2022 [Metarhia contributors](https://github.com/metarhia/metamail/graphs/contributors).
Metamail is [MIT licensed](./LICENSE).\
Metamail is a part of [Metarhia](https://github.com/metarhia) technology stack.
