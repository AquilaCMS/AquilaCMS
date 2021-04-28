![AquilaCMS](https://www.aquila-cms.com/images/medias/1024x200-90/5eb883a6e88bcc4391038570/AquilaCMS.png)

![License Badge](https://img.shields.io/badge/license-OSL3.0-success.svg)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/3ac2a8b4b7ac4b6880b49d544fdabfcd)](https://app.codacy.com/manual/AquilaCMS/AquilaCMS?utm_source=github.com&utm_medium=referral&utm_content=AquilaCMS/AquilaCMS&utm_campaign=Badge_Grade_Dashboard)
[![Build Status](https://travis-ci.com/AquilaCMS/AquilaCMS.svg?branch=master)](https://travis-ci.com/AquilaCMS/AquilaCMS)

# AquilaCMS

[AquilaCMS](https://www.aquila-cms.com) is an Open Source ecommerce web application, 100% javascript with nodejs and MongoDB. Themes can be used with ReactJS and NextJS (for Server Side Rendering). A complete Back office is available for managing your website. You can download some modules or themes in [Aquila's Shop](https://shop.aquila-cms.com).

![AquilaCMS](https://www.aquila-cms.com/medias/aquilacms_pres.gif)

## Server configuration

To install the latest AquilaCMS, you need a web server running :

- `node.js 12.19.0+`
- `mongoDB 4.2.5+`

The package manager `yarn 1.22.4+` is required.

### System packages

- You must verify that you have these packages installed on your OS :

```bash
g++ gcc libgcc libstdc++ linux-headers make python libtool automake autoconf nasm wkhtmltopdf vips vips-dev libjpeg-turbo libjpeg-turbo-dev
```

- On Windows you must download :

  - `wkhtmltopdf` : [https://wkhtmltopdf.org/downloads.html](https://wkhtmltopdf.org/downloads.html)
  - `libvips` : [https://github.com/libvips/libvips/releases](https://github.com/libvips/libvips/releases) (beware of 32 or 64 bits versions)

## Installation

You can download the source code from GitHub and run the following command-line (not 'Windows cmd') to launch the installer.

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
docker pull aquilacms/aquilacms
docker run -p 127.0.0.1:3010:3010/tcp aquilacms/aquilacms
```

At the first launch, there is an installation page. It allows you to create an `env.json` file in the config folder.

You can edit this file manually, an example of the different possible properties is in the `config/env.example.json` file.
You can also found all the properties in the [documentation](https://doc.aquila-cms.com/#/Get_started/Configuration)

> ⚠️Warning : there is not MongoDB in AquilaCMS image
>
> To connect your AquilaCMS website to a Mongo database, you can :
>
> - run a MongoDB image next to the AquilaCMS image
> - use an external link to, for example, an Atlas database
> - use a localhost link to connect AquilaCMS to a database on your host machine (you have to edit your `mongod.conf` and change your `bindIp` by your network ip instead of 127.0.0.1)


### Have the installation page again

If you want to have the installation page again, you can remove the `env.json` file in the **`config/`** folder.

### Environment variables

You can define two environment variables inside AquilaCMS.
- NODE_ENV : you should only limit values to 'production', 'development' or 'test' ([See 'Non standard node env'](https://github.com/vercel/next.js/blob/canary/errors/non-standard-node-env.md))
- AQUILA_ENV : define the environment values in config/env.json to be loaded


### Manually build the theme

If you want, for any reason, to manually build a theme, you can execute this command at the root of AquilaCMS :

```sh
npm run build:win --theme=default_theme
```

> - Instead of `build:win` you can use `build:linux`
> - At the variable `--theme` you need to put the name of the theme folder you want to build.

## Documentations

Find some documentation on [https://doc.aquila-cms.com/](https://doc.aquila-cms.com/)

For the API, the swagger documentation is online at [aquila-cms.com/api-docs](https://www.aquila-cms.com/api-docs) or local (**`/api-docs`**)

Also check-out some tutorials on :

- [Our dedicated page](https://www.aquila-cms.com/resources-documentation)
- [Our youtube channel](https://www.youtube.com/channel/UCaPllnLkB6V6Jj89i40CrgQ)

### Contribute

If you want to contribute, you will need to install husky or else you won't be able to commit new feature

```sh
yarn husky:install
```

## License

AquilaCMS is licensed under [OSL3](https://github.com/AquilaCMS/AquilaCMS/blob/master/LICENSE.md)
