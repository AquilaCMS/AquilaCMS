# AquilaCMS ![License Badge](https://img.shields.io/badge/license-OSL3.0-success.svg) [![Codacy Badge](https://app.codacy.com/project/badge/Grade/e711424ea4744515a340c517a8329df9)](https://www.codacy.com/gh/AquilaCMS/AquilaCMS/dashboard?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=AquilaCMS/AquilaCMS&amp;utm_campaign=Badge_Grade) [![Build Status](https://travis-ci.com/AquilaCMS/AquilaCMS.svg?branch=preprod)](https://travis-ci.com/AquilaCMS/AquilaCMS)

The ***Open Source***, ***100% JavaScript*** and ***"all in one"*** ecommerce solution.

[![AquilaCMS](https://www.aquila-cms.com/images/medias/1024x200-90/5eb883a6e88bcc4391038570/AquilaCMS.png)](https://www.aquila-cms.com)

[AquilaCMS](https://www.aquila-cms.com) is :

- An open-source e-commerce web application
- A 100% JavaScript solution with `MERN Stack`
- A mutli-themes website : Front-end can be used with `ReactJS` and `NextJS` (for polymorphism) or any other JS technology (`VueJS`, `Angular`, etc)
- A complete back office to manage everything in your website
- A plateform to add modules and themes from [Aquila's Shop](https://shop.aquila-cms.com/)

![AquilaCMS](https://www.aquila-cms.com/medias/aquila-landing.gif)

## Server configuration

To install the latest AquilaCMS, you need :

- [`node.js 18.16.0+`](https://nodejs.org/) (tested in v14.20.1+ and v16.18.1+)
- [`mongoDB 6.0.2+`](https://www.mongodb.com/try/download) (tested in v4.2.5+)
- [`yarn 3.4.1+`](https://classic.yarnpkg.com/en/docs/install/) package manager  (tested in v1.22.19 and v4.0.0-rc.35)

### System packages

- You must verify that you have these packages installed on your OS :

```bash
g++ gcc libgcc libstdc++ linux-headers make python libtool automake autoconf nasm wkhtmltopdf vips vips-dev libjpeg-turbo libjpeg-turbo-dev
```

- You will probably have to download:

  - `wkhtmltopdf` : [https://wkhtmltopdf.org/downloads.html](https://wkhtmltopdf.org/downloads.html) (it needs to be in the `PATH`)
  - `libvips` : [https://github.com/libvips/libvips/releases](https://github.com/libvips/libvips/releases) (beware of 32 or 64 bits versions and it also needs to be in the `PATH`)

`wkhtmltopdf` and `libvips` are NOT necessary for the installation of AquilaCMS but are used in certain functions: `wkhtmltopdf` is used when generating pdf and `libvips` when processing cached images (resizing, changing the quality etc).

## Installation

You can download the source code from GitHub and run the following command-line (not 'Windows cmd') to launch the interactive installer.

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

- With docker :

```sh
# create a network to link mongo and Aquila CMS
docker network create aquila
# create the mongo instance
docker run --name mongo -p 27017:27017 --network=aquila mongo
# pull the latest and run AquilaCMS
docker run -p 127.0.0.1:3010:3010/tcp --network=aquila --name aquila aquilacms/aquilacms
```

> - You can just launch the AquilaCMS image without creating a network if you don't want to connect to a MongoDB launched via Docker
> - if you change the port of the docker container, remember to use the correct `PORT` env variable.

At the first launch, there is an installation page. It allows you to create an `env.json` file in the config folder.

You can edit this file manually, an example of the different possible properties is in the `config/env.example.json` file.
You can also found all the properties in the [documentation](https://doc.aquila-cms.com/#/Get_started/Configuration)

> ### ⚠️Warning : there is not MongoDB in AquilaCMS image
>
> To connect your AquilaCMS website to a Mongo database, you can :
>
> - run a MongoDB image next to the AquilaCMS image like in the example above (and use this mongodb container as hostname : `mongodb://mongo:27017/`)
> - use an external link to, for example, an Atlas database
> - use a localhost link to connect AquilaCMS to a database on your host machine (you have to edit your `mongod.conf` and change your `bindIp` by your network ip instead of `127.0.0.1`)

### Silent installation

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

### Have the installation page again

If you want to have the installation page again, you can remove the `env.json` file in the **`config/`** folder.

### env.json file
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

### Environment variables

You can define two environment variables inside AquilaCMS (you can copy .env.sample into a .env file).

- `NODE_ENV` : you should only limit values to `production`, `development` or `test` ([See 'Non standard node env'](https://github.com/vercel/next.js/blob/canary/errors/non-standard-node-env.md))
- `AQUILA_ENV` : define the environment values in `/config/env.json` to be loaded ([See our documentation](https://doc.aquila-cms.com/#/Get_started/Configuration))

### Manually build the theme

We strongly recommend that you build the themes from the AquilaCMS backoffice.
But if you want, for any reason, to manually build a theme, you can execute this command at the root of AquilaCMS :

```sh
npm run build <THEME_NAME>
```

> The parameter is the name of the theme folder you want to build.
> 
> On Windows, we do not recommend using the default cmd. Otherwise, you may get an error when using the `npm run build` command.

## Documentations

Find some documentation on :

- [https://doc.aquila-cms.com/](https://doc.aquila-cms.com/)
- [https://aquila-cms.com/api-docs](https://www.aquila-cms.com/api-docs), the swagger documentation
- On a local Aquila at **`/api-docs`**

You can also check some tutorials on :

- [Our dedicated page](https://www.aquila-cms.com/resources-documentation)
- [Our youtube channel](https://www.youtube.com/channel/UCaPllnLkB6V6Jj89i40CrgQ)

## Contribute

If you want to contribute, you will need to install husky or else you won't be able to commit new feature

```sh
yarn husky:install
```

## Demos

Demos website are available:

### Front

You can check the default front here :

- [https://dem01.aquila-cms.com/](https://dem01.aquila-cms.com/)
- [https://dem02.aquila-cms.com/](https://dem02.aquila-cms.com/)

### Backoffice

You can check the backoffice here :

- [https://dem01.aquila-cms.com/demadmin](https://dem01.aquila-cms.com/demadmin)
- [https://dem02.aquila-cms.com/demadmin](https://dem02.aquila-cms.com/demadmin)

Logins are :

|         Email          | Password  |
| :--------------------: | :-------: |
| `demo@nextsourcia.com` | `Demo123` |

## License

AquilaCMS is licensed under [OSL3](https://github.com/AquilaCMS/AquilaCMS/blob/master/LICENSE.md)

