# Aquila Test w/mocha

## Write test

we use **mocha** and **chai** to write tests

Each `it()` need to be non-dependent of each other

## Setup test

- go through aquila's installation process one time
- clean database except configuration
- you need to set `NODE_ENV=test` and `AQUILA_ENV=test` (you can create a `.env` file)

- Example`.env`

```txt
NODE_ENV="test"
AQUILA_ENV="test"
```

- add this configuration to `env.json`

```json
"test": {
    "db": "mongodb://localhost:27017/NAME_OF_DATABASE",
    "devMode": {
      "mailTo": "fill an email",
      "compile": false,
      "active": true
    }
  },
```

> Legend :
>
> - You may need to change `NAME_OF_DATABASE`
> - You may need to change `"mailTo": "fill an email"`

## Lanch tests

### Run all tests

```sh
npm run test
# OR
yarn test
```

### Run one test

```sh
npm run test -- -g "Users"
# OR
yarn test -g "Users"
```

### Run with an AquilaCMS

If you want to use AquilaCMS next and test at the same time, you may need to change the PORT, to do that, you can :

- change the `.env` file (not very practical)
- use the command to change the port like this :

```sh
PORT=3011 npm run test
# other example
PORT=3011 npm run test -- -g "Users"
```
