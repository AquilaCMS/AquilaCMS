# Installation

## Interactive installation

### From the source code

You can download the source code from GitHub and run the following command-line to launch the interactive installer :

- With npm :

```sh
yarn install
npm start
```

- With pm2 :

```sh
yarn install
cp ecosystem.config.example.js ecosystem.config.js
npm run start:pm2
```

### From the Docker image
You can also launch the project via Docker :

```sh
# create a network to link mongo and Aquila CMS
docker network create aquila
# create the mongo instance
docker run --name mongo -p 27017:27017 --network=aquila mongo
# pull the latest and run AquilaCMS
docker run -p 127.0.0.1:3010:3010/tcp --network=aquila --name aquila aquilacms/aquilacms
```

> - You can just launch the AquilaCMS image without creating a network if you don't want to connect to a MongoDB launched via Docker
> - If you change the port of the docker container, remember to use the correct `PORT` env variable.

> ### ⚠️Warning : there is not MongoDB in AquilaCMS image
>
> To connect your AquilaCMS website to a Mongo database, you can :
>
> - run a MongoDB image next to the AquilaCMS image like in the example above (and use this mongodb container as hostname : `mongodb://mongo:27017/`)
> - use an external link to, for example, an Atlas database
> - use a localhost link to connect AquilaCMS to a database on your host machine (you have to edit your `mongod.conf` and change your `bindIp` by your network ip instead of `127.0.0.1`)

### Installation page
At the first launch, you'll see an installation page. It allows you to create an `env.json` file in the config folder.

You can edit this file manually, an example of the different possible properties is in the `config/env.example.json` file.
You can also found all the properties in the [documentation](https://doc.aquila-cms.com/#/Get_started/Configuration)

### env.json file
If you want to have the installation page again, you can remove the `env.json` file in the **`config/`** folder.

The config/env.json file is created during the AquilaCMS installation phase, the various parameters it can take are present in the config/env.example.json. These parameters are:
- `encryption` corresponds to parameters used when passwords are encrypted
- `jwt` has a few parameters to configure JWT creation
- `ssl` is used to enable https (and http2) API launch
- `logs` allows to configure log management:
  - `type` can take three parameters: `console`, `file` and `graylog`
  - `http` allows http request logs via Morgan
  - `override` allows to replace all console.log and console.error with log functions from Winston
  - `alertMails` enable the sending to admins of e-mails related to alerts raised by the system (for example, if it has been detected that an important cron has been deactivated)
  - `config` contains the fields for setting the parameters for sending logs to Graylog
- `devMode` has parameters used in development mode, such as non-compilation of the theme or global mail overload
- `db` is the connection string to MongoDB

They are all under one parameter which corresponds to the AQUILA_ENV.

## Silent installation

To start a silent installation, you need to set the following environment variables, then start aquila :
- `MONGODB_URI` : MongoDB URI
- `LANGUAGE` : Default language. "en" for English or "fr" for French
- `FIRSTNAME` : Administrator's firstname
- `LASTNAME` : Administrator's lastname
- `EMAIL` : Administrator's email
- `PASSWORD` : Administrator's password (if no password is entered, a random password will be created and shown only once in the server logs during installation)
- `APPURL` : URL of the website (ie http://localhost:3010)
- `ADMIN_PREFIX` : Admin subpath (ie : admin)
- `SITENAME` : Website's name


## Environment variables

You can define two environment variables inside AquilaCMS (you can copy .env.sample into a .env file).

- `NODE_ENV` : you should only limit values to `production`, `development` or `test` ([See 'Non standard node env'](https://github.com/vercel/next.js/blob/canary/errors/non-standard-node-env.md))
- `AQUILA_ENV` : define the environment values in `/config/env.json` to be loaded ([See our documentation](https://doc.aquila-cms.com/#/Get_started/Configuration))

## Manually build the theme

We recommend that you build the themes from the AquilaCMS backoffice.
But if you want, to manually build a theme, you can execute this command in the theme folder :

```sh
npm run build
```