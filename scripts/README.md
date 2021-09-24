# Scripts

## addModulesPackages.sh

You can run this script in the "scripts" folder or at the root of AquilaCMS.
It lists all module dependencies and install them in the right place : "Api dependencies" at the root of AquilaCMS and "Theme dependencies" at the root of the theme folder.
This script can be useful when you have to re-install all dependencies manually : you run "yarn install" at the root of AquilaCMS, then at the root of the theme folder and finally you run this script.

## updatePackageAquila.js

This script take the dependencies in package.json and copy them into the package-aquila.json or package-theme.json file.
It is used in a Github Actions.

## build.js

The NodeJS script `build.js` is used when we use the `build` command of the `package.json`

Examples of use :

```sh
npm run build default_theme
# and also
yarn build default_theme
```
