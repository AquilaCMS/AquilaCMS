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

- Add this configuration to `config/env.json`

```json
{
    ...
    "test": {
        "db": "mongodb://localhost:27017/NAME_OF_DATABASE",
        "devMode": {
            "mailTo": "fill an email",
            "compile": false,
            "active": true
        }
    },
    ...
}
```

> Legend :
>
> - You may need to change `NAME_OF_DATABASE`
> - You may need to change `"mailTo": "fill an email"`
> - The compile is useless in these tests

## Lanch tests

### Run all tests

```sh
npm run test
# OR
yarn test
# OR
export NODE_ENV="test" && export AQUILA_ENV="test" && npm run test
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

### Debug tests

You can debug tests, with VSCode using a configuration like that (to add in `.vscode/launch.json`) :

```json
{
    "type": "node",
    "request": "launch",
    "name": "DO TEST",
    "env": {
            "AQUILA_ENV": "test",
            "NODE_ENV": "test",
            "port": "3000"
    },
    "cwd": "${workspaceFolder}",
    "runtimeExecutable": "npm",
    "runtimeArgs": [
            "run",
            "-s",
            "test"
    ],
    "outputCapture": "std",
}
```

As you can see we set env variable to a special Aquila config, so you need to have a `test` configuration (in `config/env.json`)

## Test File

The file `/test/data/test/archive` is an Mongo Archive for automated testing
