import path from 'path';

// Ensure module-alias loads aliases from THIS workspace package.json,
// not the monorepo root package.json.
// This is required because our compiled code still imports via "@/*".
// eslint-disable-next-line @typescript-eslint/no-var-requires
const moduleAlias = require('module-alias');

moduleAlias({
  base: path.join(__dirname, '..', 'package.json')
});

