<p align="center">
  <a href="https://www.aquila-cms.com"><img width="200" height="183" src="https://www.aquila-cms.com/images/medias/200x183-90/5eb883a6e88bcc4391038570/AquilaCMS.png"></a>
</p>

<h1 align="center">AquilaCMS</h3>
<h3 align="center">A complete and multi-purpose open-source CMS</h3>

<p align="center" style="font-size:1.1em;">
  <a href="https://www.aquila-cms.com">Website</a> | <a href="https://shop.aquila-cms.com/">Modules & Themes</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-OSL3.0-success.svg" alt="License Badge">
</p>

## Overview
AquilaCMS is an open-source CMS with a wide range of features to satisfy every potential need.

In this project, you can find an API, a default front for the admin side (the backoffice) and a default front for the customer side (the theme).

The features of all these parts (API, backoffice, theme) can be extended by modules that you can develop or find in our [shop](https://shop.aquila-cms.com/).

In addition, for the backoffice and the theme you can develop fronts in all possible technologies (`React`, `Vue.js`, `Angular`, `Next.js`, `Qwik`, `Solid`...).

![AquilaCMS](https://www.aquila-cms.com/medias/aquila-landing.gif)

## Getting Started
### Prerequisites

To install the latest AquilaCMS, you need:

- [`node.js 18.16.0+`](https://nodejs.org/) (tested in v14.20.1+ and v16.18.1+)
- [`yarn 3.4.1+`](https://classic.yarnpkg.com/en/docs/install/) package 
- [`mongoDB 6.0.2+`](https://www.mongodb.com/try/download) (tested in v4.2.5+)manager  (tested in v1.22.19 and v4.0.0-rc.35)

You must verify that you have these packages installed on your OS (especially on Linux):

```bash
g++ gcc libgcc libstdc++ linux-headers make python libtool automake autoconf nasm wkhtmltopdf vips vips-dev libjpeg-turbo libjpeg-turbo-dev
```

You will probably have to download:

  - `wkhtmltopdf`: [https://wkhtmltopdf.org/downloads.html](https://wkhtmltopdf.org/downloads.html) (it needs to be in the `PATH`)
  - `libvips`: [https://github.com/libvips/libvips/releases](https://github.com/libvips/libvips/releases) (beware of 32 or 64 bits versions and it also needs to be in the `PATH`)

`wkhtmltopdf` and `libvips` are NOT necessary for the installation of AquilaCMS but are used in certain functions: `wkhtmltopdf` is used when generating pdf and `libvips` when processing cached images (resizing, changing the quality etc).

### Installation

#### Quick start

```sh
git clone https://github.com/AquilaCMS/AquilaCMS.git
cd AquilaCMS
yarn install
npm start
```

#### Advanced installation
If you want full information on how to install AquilaCMS (and the different ways to do it), check this [file](INSTALLATION.md).

## Documentations

Find some documentation on :

- [https://doc.aquila-cms.com/](https://doc.aquila-cms.com/)
- [https://aquila-cms.com/api-docs](https://www.aquila-cms.com/api-docs), the swagger documentation
- On a local Aquila at **`/api-docs`**

You can also check some tutorials on :

- [Our dedicated page](https://www.aquila-cms.com/resources-documentation)
- [Our youtube channel](https://www.youtube.com/channel/UCaPllnLkB6V6Jj89i40CrgQ)

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


## Developer guide

### Technologies

In AquilaCMS, you can find these technologies:
- JavaScript for the API part (we plan to migrate the code gradually to Typescript)
- React for the default theme
- AngularJS for the default backoffice (a whole new backoffice in React is currently under development)

### Monorepo structure

| Name                       | Path                                               | Description                                                          |
| -------------------------- | -------------------------------------------------- | -------------------------------------------------------------------- |
| `@aquilacms/api`           | [/apps/api](/apps/api)                             | Node.js API                                                          |
| `@aquilacms/bo-angularjs`  | [/apps/backoffice](/apps/backoffice)               | Default backoffice                                                   |
| `@aquilacms/modules`       | [/apps/modules](/apps/modules)                     | Folder in which the modules will be installed                        |
| `@aquilacms/themes`        | [/apps/themes](/apps/themes)                       | Default theme                                                        |
| `@aquilacms/uploads`       | [/packages/uploads](/packages/uploads)             | A folder to store all the media that will be added during use        |

### Contributing guidelines

If you are interested in contributing to AquilaCMS, you can check out [contributing guidelines](CONTRIBUTING.md).

### Support & help

You can reach out to us via:

- [Create an issue](https://github.com/AquilaCMS/AquilaCMS/issues/new)
- [Email](mailto:contact@nextsourcia.com)

We take all queries, recommandations and issues that you might have. Feel free to ask.

## License

AquilaCMS is licensed under [OSL3](https://github.com/AquilaCMS/AquilaCMS/blob/master/LICENSE.md)

