![AquilaCMS](https://www.aquila-cms.com/medias/AquilaCMS.png)
![License Badge](https://img.shields.io/badge/license-OSL3.0-success.svg)
[![Codacy Badge](https://app.codacy.com/project/badge/Grade/667b93cac0264970bec4e656628e82b3)](https://www.codacy.com/manual/AquilaCMS/AquilaCMS?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=AquilaCMS/AquilaCMS&amp;utm_campaign=Badge_Grade)

# AquilaCMS

[AquilaCMS](https://www.aquila-cms.com) is an Open-source e-commerce web application, 100% javascript with Node.js and MongoDB. Themes can be used with ReactJS and NextJS (for polymorphism). A complete Back office is available for managing your website. You can download some modules or themes in [Aquila's Shop](https://www.aquila-cms.com).

![AquilaCMS](https://www.aquila-cms.com/medias/aquilacms_pres.gif)

## Server configuration

To install the latest AquilaCMS, you need a web server running node.js 12.18.1+ and mongoDB 4.2.5+.
The package manager yarn 1.22.4+ is required.


## Installation

You can download the source code from GitHub and run the following command-line to launch the installer.

With npm :
```bash
yarn install
npm start
```

With pm2 :
```bash
yarn install
cp ecosystem.config.example.js ecosystem.config.js
npm run start:pm2
```

With docker :
```bash
soon
```

At the first launch, there is an installation page. It allows you to create an env.json file in the config folder.
You can edit this file manually, an example of the different possible properties is in the config/env.example.json file.


## License
AquilaCMS is licensed under OSL3.