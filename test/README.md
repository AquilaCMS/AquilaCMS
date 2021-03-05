# Write test
we use **mocha** and **chai** to write tests

Each `it()` need to be non-dependent of each other

# setup test

- go through aquila's installation process one time
- clean database except configuration
- you need to set `NODE_ENV=test` and `AQUILA_ENV=test`
- now lanch the test

# Lanch test
```sh
npm run test
# OR
yarn test
```

lancer un seul test
```sh
npm run test -g "Users"
# OR
yarn test -g "Users"
```