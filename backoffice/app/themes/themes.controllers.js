const ThemesController = angular.module("aq.themes.controllers", []);

ThemesController.controller("ThemesCtrl", [
    "$scope", "ConfigV2", "$http", "$interval", "toastService", "ThemeConfig","$rootScope",
    function ($scope, ConfigV2, $http, $interval, toastService, ThemeConfig, $rootScope) {

        $scope.themeConfig = {};

        $scope.tab = "select";

        $scope.onTabSelect = function (tabId) {
          if(tabId == "select"){
              $scope.tab = "select";
          }else{
              $scope.tab = "config";
          }
        };

        $scope.language = $rootScope.languages.find(function (lang) {
            return lang.defaultLanguage;
        }).code;

        ThemeConfig.query({ PostBody: { filter: {}, structure: {}, limit: 99 }}, function (response) {
            $scope.keys = {};
            $scope.themeConfig.variables = {};
            if(response.config && response.config.translation) {
                $scope.languages.forEach(element => {
                    $scope.themeConfig.variables[element.code] = response.config.translation[element.code];
                    delete $scope.themeConfig.variables[element.code].$promise;
                    delete $scope.themeConfig.variables[element.code].$resolved;
                    $scope.keys[element.code] = Object.keys($scope.themeConfig.variables[element.code]);
                    $scope.theme.currentThemeVar = true;
                });
            }
        });

        $scope.typeOf = function(value) {
            try {
                if(value == undefined) {
                    return "string";
                }

                // Couleur
                if(typeof(value) == "string" && value.indexOf("#") == 0 && value.length == 7) {
                    return "color";
                }
                // Number
                if(typeof(value) == "string" && typeof(value.replace('.', ',')) == "number") {
                    return "number";
                }
                return typeof(value);
            }catch(e){
                return "string";
            }
        }

        $scope.config = ConfigV2.environment(function () {
            if (!$scope.config.adminPrefix) {
                $scope.config.adminPrefix = "admin";
            }
        });
        $scope.LoadAllThemes = function () {
            $http.get("/v2/themes").then(function (response) {
                $scope.themesList = response.data;
            }, function (err) {
                $scope.isLoading = false;
                toastService.toast("danger", err.data);
            });
        };

        $scope.beforeTheme = function () {
            $scope.showThemeLoading = true;
        };

        $scope.packageInstall = function () {
            if (confirm("Attention, vous allez effectuer une action qui entraînera éventuellement une interruption du site. Êtes vous sur de vouloir continuer ?")) {
                $scope.isLoading = true;
                $scope.showThemeLoading = true;
                $http.post("/v2/themes/package/install", { themeName: $scope.config.currentTheme }).then(function (response) {
                    toastService.toast("success", "Succès");
                    $scope.isLoading = false;
                    $scope.showThemeLoading = false;
                }, function (err) {
                    $scope.isLoading = false;
                    $scope.showThemeLoading = false;
                    toastService.toast("danger", "Error !");
                }); 
            }
            
        };

        $scope.onErrorUploadTheme = function () {
            $scope.isLoading = false;
            $scope.showThemeLoading = false;
            toastService.toast("danger", "Error !");
        };

        $scope.uploadedTheme = function () {
            $scope.showThemeLoading = false;
            toastService.toast("success", "Thème ajouté ! Pour l'utiliser, il suffit de le selectionner");
            $scope.LoadAllThemes();
        };

        $scope.packageBuild = function () {
            if (confirm("Attention, vous allez effectuer une action qui entraînera éventuellement une interruption du site. Êtes vous sur de vouloir continuer ?")) {
                $scope.isLoading = true;
                $scope.showThemeLoading = true;
                $http.post("/v2/themes/package/build", { themeName: $scope.config.currentTheme }).then(function (response) {
                    toastService.toast("success", "Succès");
                    $scope.isLoading = false;
                    $scope.showThemeLoading = false;
                }, function (err) {
                    $scope.isLoading = false;
                    $scope.showThemeLoading = false;
                    toastService.toast("danger", "Error !");
                });
            }
        };

        $scope.packageRestart = async function () {
            // $scope.isLoading = true;
            // $scope.showThemeLoading = true;
            try {
                await $http.get("/restart");
                toastService.toast("success", "Succès");
                $scope.isLoading = false;
                $scope.showThemeLoading = false;
            } catch (err) {
                $scope.isLoading = false;
                $scope.showThemeLoading = false;
                toastService.toast("danger", "Error !");
            }
        };

        $scope.removeTheme = async function () {
            if (confirm("Etes vous sur de vouloir supprimer ce theme ?")) {
                try {
                    await $http.post("/v2/themes/delete", { themeName: $scope.config.currentTheme });
                    toastService.toast("success", "Thème supprimé avec succès.");
                    $scope.LoadAllThemes();
                } catch (err) {
                    $scope.isLoading = false;
                    toastService.toast("danger", err.data.message);
                }
            }
        };
        $scope.theme = {
            themeDataOverride: false,
            currentThemeVar : false,
        };

        $scope.copyThemeDatas = async function () {
            if (confirm("Êtes vous sur de vouloir installer les données du thème ? ")) {
                try {
                    let data = await $http.post("/v2/themes/copyDatas", { themeName: $scope.config.currentTheme, override: $scope.theme.themeDataOverride });
                    if (data.data.noDatas) {
                        toastService.toast("success", "Ce thème ne contient pas de données.");
                    } else {
                        toastService.toast("success", "Données du thème copiées avec succès.");
                    }
                } catch (err) {
                    $scope.isLoading = false;
                    toastService.toast("danger", err.data.message);
                }
            }
        };

        $scope.validate = function (tab) {
            if(tab == 'config'){
                ThemeConfig.update({config : $scope.themeConfig.variables}, function (response,err) {
                    if(err.errmsg){
                        toastService.toast("danger", "Thème ajouté ! Pour l'utiliser, il suffit de le selectionner");
                    }else{
                        toastService.toast("success", "Variables sauvegardées.");
                        $scope.keys = {};
                        $scope.themeConfig.variables = {};
                        if(response.datas.translation){
                            $scope.languages.forEach(element => {
                                $scope.themeConfig.variables[element.code] = response.datas.translation[element.code];
                                delete $scope.themeConfig.variables[element.code].$promise;
                                delete $scope.themeConfig.variables[element.code].$resolved;
                                $scope.keys[element.code] = Object.keys($scope.themeConfig.variables[element.code]);
                            });
                        }
                    }
                });
            } else {
                ConfigV2.environment(function (oldAdmin) {
                    $scope.showThemeLoading = true;
                    if (oldAdmin.currentTheme !== $scope.config.currentTheme) {
                        if (confirm("Êtes vous sur de vouloir changer de thème ?")) {
                            $http.post("/v2/themes/save", { environment: $scope.config }).then(function () {
                                if (oldAdmin.currentTheme !== $scope.config.currentTheme) {
                                    $scope.showThemeLoading = false;
                                    $scope.showLoading = true;
                                    $scope.progressValue = 0;
                                    $scope.urlRedirect = buildAdminUrl($scope.config.appUrl, $scope.config.adminPrefix);
                                    $http.get("/restart");
                                    var timerRestart = $interval(function () {
                                        $scope.progressValue++;

                                        if ($scope.progressValue == 100) {
                                            setTimeout(function () {
                                                location.href = window.location = buildAdminUrl($scope.config.appUrl, $scope.config.adminPrefix);
                                            }, 7000);
                                        }

                                        if ($scope.progressValue >= 110) {
                                            $interval.cancel(timerRestart);
                                        }
                                    }, 250);
                                }
                                else {
                                    window.location.reload(true);
                                }
                                $scope.showThemeLoading = false;

                            }, function (err) {
                                $scope.showThemeLoading = false;
                                toastService.toast("danger", "Une erreur est survenue !");
                                console.error(err);
                            });
                        } else {
                            $scope.showThemeLoading = false;
                        }
                    }
                });

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
            };


            }
            $scope.LoadAllThemes();


    }
]);