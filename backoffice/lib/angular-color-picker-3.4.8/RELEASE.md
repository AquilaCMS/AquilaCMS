# Release

#### Versioning should follow [Semantic Versioning](http://semver.org/)

The build steps to releasing a new version. Before you can do this you need to to make sure the node packages are up to date - ``` npm update ```

  * Commit and push all changes with a meaningful message
  * Update version in bower.json and package.json
  * Build the dist files -  ``` grunt build ```
  * Run `npm test` to make sure all the tests pass
  * Update CHANGELOG.md
  * Update documentation if needed
  * Commit and push with the message "Bumping to v\*.\*.\*"
  * [Create a new release](https://github.com/ruhley/angular-color-picker/releases/new)
    * Tag version is v\*.\*.\*
    * Release title is "Angular Color Picker v\*.\*.\*"
    * The comment section should be a list of commits and the changes the commit made. See below for an example
    * If it is under v1.0.0 then mark "This is a pre-release" as true
  * Publish to npm ```npm publish```


## Example github release comment
Changelog:

  * 33efce58357b654bc3ec7c5d59e5b36503d5bb13 - [BUGFIX] Fixing spaces in automatic api endpoint
  * ba36c1d5e3a30c6de295771adb59a51ce151c25b - [BUGFIX] Fixing #1: Improve bower.json ignore
  * 93e89af673509d075dfc8c6137d97645ab392646 - Bumping to v0.1.2
