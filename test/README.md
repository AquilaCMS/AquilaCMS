# Aquila Test w/mocha

## Write test

we use **mocha** and **chai** to write tests

Each `it()` need to be non-dependent of each other

## Setup test

- go through aquila's installation process one time
- clean database except configuration
- you need to set `NODE_ENV=test` and `AQUILA_ENV=test`

`Example .env`

```txt
NODE_ENV="test"
AQUILA_ENV="test"
```

## Lanch tests

```sh
npm run test
# OR
yarn test
```

Run one test

```sh
npm run test -- -g "Users"
# OR
yarn test -g "Users"
```
