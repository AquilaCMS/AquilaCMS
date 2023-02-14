const ThemesController = angular.module("aq.themes.controllers", []);

ThemesController.controller("ThemesCtrl", [
    "$scope", "ConfigV2", "$http", "$interval", "toastService", "ThemeConfig", "$rootScope", "$modal", "$translate", "Themes",
    function ($scope, ConfigV2, $http, $interval, toastService, ThemeConfig, $rootScope, $modal, $translate, Themes) {

        $scope.themeConfig = {};
        $scope.tab = "select";
        $scope.config = {}

        $scope.onTabSelect = function (tabId) {
            $scope.tab = tabId;
        };

        $scope.language = $rootScope.languages.find(function (lang) {
            return lang.defaultLanguage;
        }).code;

        $scope.addTheme = function (nodeParent) {
            var modalInstance = $modal.open({
                templateUrl: "app/themes/views/modals/themes-new.html",
                controller: "ThemesNewCtrl"
            });

            modalInstance.result.then(function () {
                $scope.LoadAllThemes();
            });
        };

        $scope.LoadAllThemes = function () {
            $scope.LoadThemeConfig();
        }

        $scope.langChange = function (lang) {
            if ($scope.customiseTheme === undefined) {
                $scope.LoadThemeConfig();
            };
            if ($scope.customiseTheme !== undefined && $scope.themeConfig.variables[lang] !== undefined) {
                $scope.customiseTheme.arrayGroup = [];
                for (let i = 0; i < $scope.themeConfig.variables[lang].length; i++) {
                    // Determine the type (number, text, etc)
                    $scope.themeConfig.variables[lang][i].type = typeof($scope.themeConfig.variables[lang][i].value);
                    // Determine if is color (special case)
                    if($scope.themeConfig.variables[lang][i].type === 'string' && $scope.themeConfig.variables[lang][i].value.startsWith("#") && $scope.themeConfig.variables[lang][i].value.length === 7){
                        $scope.themeConfig.variables[lang][i].type = "color";
                    }
                    if ($scope.customiseTheme.arrayGroup.indexOf($scope.themeConfig.variables[lang][i].group) == -1) {
                        $scope.customiseTheme.arrayGroup.push($scope.themeConfig.variables[lang][i].group);
                    }
                }
            }

        };

        function buildAdminUrl(appUrl, adminPrefix) {
            let correctAppUrl;
            if (!appUrl) {
                correctAppUrl = "/";
            } else if (!appUrl.endsWith("/")) {
                correctAppUrl = `${appUrl}/`;
            } else {
                correctAppUrl = appUrl;
            }
            return correctAppUrl + adminPrefix;
        }

        $scope.typeOf = function (value) {
            try {
                if (value == undefined) {
                    return "string";
                }

                // Couleur
                if (typeof (value) == "string" && value.indexOf("#") == 0 && value.length == 7) {
                    return "color";
                }
                // Number
                if (typeof (value) == "string" && typeof (value.replace('.', ',')) == "number") {
                    return "number";
                }
                return typeof (value);
            } catch (e) {
                return "string";
            }
        }

        $scope.packageInstall = function (devDependencies) {
            if (confirm($translate.instant("confirm.installPackageWarning"))) {
                $scope.isLoading = true;
                $scope.showLoading2 = true;
                $scope.showThemeLoading = true;
                Themes.packageInstall({
                    themeName: $scope.config.environment.currentTheme,
                    devDependencies: devDependencies
                }, function (response) {
                    reloadServer();
                }, function (err) {
                    if (err && err.error) {
                        console.log(error);
                    }
                    $scope.isLoading = false;
                    $scope.showLoading2 = false;
                    $scope.showThemeLoading = false;
                    toastService.toast("danger", $translate.instant("global.error"));
                });
            }
        };


        $scope.packageBuild = function () {
            if (confirm($translate.instant("confirm.buildPackageWarning"))) {
                $scope.isLoading = true;
                $scope.showLoading2 = true;
                $scope.showThemeLoading = true;
                Themes.packageBuild({ themeName: $scope.config.environment.currentTheme }, function (response) {
                    reloadServer();
                }, function (err) {
                    if (err && err.error) {
                        console.log(error);
                    }
                    $scope.isLoading = false;
                    $scope.showLoading2 = false;
                    $scope.showThemeLoading = false;
                    toastService.toast("danger", $translate.instant("global.error"));
                });
            }
        };

        $scope.removeTheme = async function () {
            if (confirm($translate.instant("confirm.deleteTheme"))) {
                Themes.delete({ themeName: $scope.config.environment.currentTheme }, function (response) {
                    toastService.toast("success", $translate.instant("themes.deleteTheme"));
                    $scope.LoadAllThemes();
                }, function (err) {
                    $scope.isLoading = false;
                    if (err.data) {
                        if (err.data.message) {
                            toastService.toast("danger", err.data.message);
                        }
                    } else if (err.message) {
                        toastService.toast("danger", err.message);
                    } else {
                        toastService.toast("danger", $translate.instant("global.standardError"));
                    }
                });
            }
        };
        $scope.theme = {
            themeDataOverride: false,
            currentThemeVar: false,
        };

        $scope.copyThemeDatas = async function () {
            if (confirm($translate.instant("confirm.installTheme"))) {
                Themes.copyData({
                    themeName: $scope.config.environment.currentTheme,
                    override: $scope.theme.themeDataOverride,
                    configuration: null,
                    fileNames: $scope.listThemeFiles,
                    otherParams: $scope.otherParams
                }, function (response) {
                    if (response.noDatas) {
                        toastService.toast("success", $translate.instant("themes.themeNoData"));
                    } else {
                        toastService.toast("success", $translate.instant("themes.copyThemeDataDone"));
                    }
                    $scope.LoadThemeConfig(); // we reload config after reload demoData
                }, function (err) {
                    $scope.isLoading = false;
                    toastService.toast("danger", err.data.message);
                });
            }
        };

        $scope.validate = function (tab) {
            if (tab == 'config') {
                $scope.showLoading2 = true;
                ThemeConfig.update({ config: $scope.themeConfig.variables }, function (response, err) {
                    if (err.errmsg) {
                        $scope.showLoading2 = false;
                        toastService.toast("danger", $translate.instant("themes.addedTheme"));
                    } else {
                        $scope.showLoading2 = false;
                        toastService.toast("success", $translate.instant("themes.varSaved"));
                        $scope.keys = {};
                        $scope.themeConfig.variables = {};
                        if (response.datas.translation) {
                            $scope.languages.forEach(element => {
                                $scope.themeConfig.variables[element.code] = response.datas.translation[element.code].values;
                                delete $scope.themeConfig.variables[element.code].$promise;
                                delete $scope.themeConfig.variables[element.code].$resolved;
                                $scope.keys[element.code] = Object.keys($scope.themeConfig.variables[element.code]);
                            });
                        }
                    }
                }, function (err) {
                    $scope.showLoading2 = false;
                    console.error(err);
                });
            } else {
                $scope.saveTheme();
            }
        }

        $scope.saveTheme = function () {
            ConfigV2.get({ PostBody: { structure: { environment: 1 } } }, function (oldAdmin) {
                if (oldAdmin.currentTheme !== $scope.config.environment.currentTheme) {
                    $scope.showLoading2 = true;
                    $scope.showThemeLoading = true;
                    if (confirm($translate.instant("confirm.changeTheme"))) {
                        $scope.showLoading2 = true;
                        Themes.save({ environment: $scope.config.environment }, function () {
                            // yarn install
                            Themes.packageInstall({
                                themeName: $scope.config.environment.currentTheme,
                                devDependencies: false
                            }, function () {
                                // we build the theme
                                Themes.packageBuild({ themeName: $scope.config.environment.currentTheme }, function (rep) {
                                    // build done;
                                    if (rep.msg === "KO") {
                                        toastService.toast("danger", $translate.instant("global.standardError"));
                                    }
                                    Themes.saveAfter({ environment: $scope.config.environment }, function (response) {
                                        if (oldAdmin.currentTheme !== $scope.config.environment.currentTheme) {
                                            reloadServer();
                                        } else {
                                            window.location.reload(true);
                                        }
                                    }, handleError);
                                }, function (error) {
                                    handleError(error);
                                    // obligate to remove maintenance mode
                                    Themes.saveAfter({ environment: $scope.config.environment }, function () {
                                    }, handleError);
                                });
                            }, handleError);
                        }, handleError);
                    } else {
                        handleError();
                    }
                }
            }, handleError);
        }

        function handleError(error) {
            $scope.isLoading = false;
            $scope.showLoading2 = false;
            $scope.showThemeLoading = false;
            if (error) {
                console.error(error);
                if (error && error.data && error.data.message) {
                    toastService.toast("danger", error.data.message);
                } else {
                    toastService.toast("danger", $translate.instant("global.standardError"));
                }
            }
        }

        function reloadServer() {
            $scope.showLoading = true;
            $scope.progressValue = 0;
            $scope.urlRedirect = buildAdminUrl($scope.config.environment.appUrl, $scope.config.environment.adminPrefix);
            $http.get('/restart').then(function(response) {
                if(response.data === "ManualRestart") {
                    toastService.toast("danger", $translate.instant("modules.restartFail"));
                }
            }).catch(function(error) {
                console.error(error);
                toastService.toast("danger", $translate.instant("modules.restartFail"));
            });

            var timerRestart = $interval(function () {
                $scope.progressValue++;

                if ($scope.progressValue == 100) {
                    setTimeout(function () {
                        location.href = window.location = buildAdminUrl($scope.config.environment.appUrl, $scope.config.environment.adminPrefix);
                    }, 7000);
                }

                if ($scope.progressValue >= 110) {
                    $interval.cancel(timerRestart);
                }
            }, 250);
        }

        $scope.LoadThemeConfig = function () {
            Themes.info({}, function (response) {
                $scope.config = response.configEnvironment;
                $scope.listThemeFiles = [];
                $scope.themesList = response.listTheme;
                $scope.listThemeFiles = response.listFiles || [];
                $scope.otherParams = response.otherParams;
                $scope.customiseTheme = {};
                $scope.customiseTheme.keys = {};
                $scope.themeConfig.variables = {};
                if (response.themeConf && response.themeConf.name && response.themeConf.name.length) {
                    $scope.themeConfig.selected = response.themeConf.name;
                }
                try {
                    $scope.configFile = JSON.stringify(response.configFile, null, 4);
                } catch (err) {
                    $scope.configFile = "";
                }
                if (response.configEnvironment && response.themeConf && response.themeConf.config && response.themeConf.config.translation) {
                    $scope.languages.forEach(element => {
                        $scope.themeConfig.variables[element.code] = response.themeConf.config.translation[element.code].values;
                        delete $scope.themeConfig.variables[element.code].$promise;
                        delete $scope.themeConfig.variables[element.code].$resolved;
                        $scope.customiseTheme.keys[element.code] = Object.keys($scope.themeConfig.variables[element.code]);
                        $scope.langChange($scope.language);
                        $scope.theme.currentThemeVar = true;
                    });
                }
            }, function (err) {
                $scope.isLoading = false;
                toastService.toast("danger", $translate.instant("global.standardError"));
                console.error(err);
                if (err && err.data && err.data.message) {
                    toastService.toast("danger", err.data.message);
                }
            });
        };
    }
]);

ThemesController.controller("ThemesNewCtrl", [
    "$scope", "$modalInstance", "toastService", "$translate",
    function ($scope, $modalInstance, toastService, $translate) {

        $scope.onErrorUploadTheme = function () {
            $scope.$parent.isLoading = false;
            $scope.showThemeLoading = false;
            toastService.toast("danger", $translate.instant("global.error"));
        };

        $scope.beforeTheme = function () {
            $scope.showThemeLoading = true;
        };

        $scope.uploadedTheme = function () {
            $scope.showThemeLoading = false;
            toastService.toast("success", $translate.instant("themes.addedTheme"));
            $modalInstance.close("save");
        };


        $scope.cancel = function () {
            $modalInstance.dismiss("cancel");
        };
    }
]);
