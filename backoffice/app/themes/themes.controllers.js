const ThemesController = angular.module("aq.themes.controllers", []);

ThemesController.controller("ThemesCtrl", [
    "$scope", "ConfigV2", "$http", "$interval", "toastService", "ThemeConfig","$rootScope", "$modal",
    function ($scope, ConfigV2, $http, $interval, toastService, ThemeConfig, $rootScope, $modal) {

        $scope.themeConfig = {};

        $scope.tab = "select";

        $scope.onTabSelect = function (tabId) {
          if(tabId == "select"){
              $scope.tab = "select";
          }else if (tabId == "config"){
              $scope.tab = "config";
          }else {
            $scope.tab = "data";
          }
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

        $scope.LoadAllThemes = function(){
            $scope.LoadThemeCongig();
        }

        $scope.langChange = function (lang)
        {
            if ($scope.customiseTheme === undefined){
                $scope.LoadThemeCongig();
            };
            if ($scope.customiseTheme !== undefined && $scope.themeConfig.variables[lang] !== undefined){
                $scope.customiseTheme.arrayGroup = [];
                for (let i = 0; i < $scope.themeConfig.variables[lang].length ; i++){
                    if($scope.customiseTheme.arrayGroup.indexOf($scope.themeConfig.variables[lang][i].group) == -1){
                        $scope.customiseTheme.arrayGroup.push($scope.themeConfig.variables[lang][i].group);

                    }
                }
            }

        };

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
                    let data = await $http.post("/v2/themes/copyDatas", { themeName: $scope.config.currentTheme, override: $scope.theme.themeDataOverride, configuration : null, fileNames : $scope.listThemeFiles});
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
                                $scope.themeConfig.variables[element.code] = response.datas.translation[element.code].values;
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

            $scope.LoadThemeCongig = function () {
                $http.get("/v2/themes/informations").then(function (response) {
                    $scope.config = response.data.configEnvironment;
                    if (!$scope.adminPrefix) {
                        $scope.config.adminPrefix = "admin";
                    }
                    $scope.listThemeFiles = [];
                    $scope.themesList = response.data.listTheme;
                    $scope.listThemeFiles = response.data.listFiles;
                    console.log($scope.listThemeFiles);
                    if ($scope.listThemeFiles[0] == null){
                        $scope.listThemeFiles.push("noDefaultData");
                    } else{
                        $scope.listThemeFiles.forEach(element => {
                            if(element.substr(element.length-5, 5) !== '.json'){
                                $scope.listThemeFiles.splice($scope.listThemeFiles.indexOf(element),1)
                            }
                        });
                        for (let i = 0; i<$scope.listThemeFiles.length; i++){
                            const tmp = {};
                            tmp.name = $scope.listThemeFiles[i];
                            tmp.value = true;
                            console.log(tmp);
                            $scope.listThemeFiles[i] = tmp;
                        }
                        console.log($scope.listThemeFiles);
                    }

                    $scope.customiseTheme ={};
                    $scope.customiseTheme.keys = {};
                    $scope.themeConfig.variables = {};

                    if(response.data.configEnvironment && response.data.themeConf.config.translation) {
                        $scope.languages.forEach(element  => {
                            $scope.themeConfig.variables[element.code] = response.data.themeConf.config.translation[element.code].values;
                            delete $scope.themeConfig.variables[element.code].$promise;
                            delete $scope.themeConfig.variables[element.code].$resolved;
                            $scope.customiseTheme.keys[element.code] = Object.keys($scope.themeConfig.variables[element.code]);
                            $scope.langChange($scope.language);
                            $scope.theme.currentThemeVar = true;
                        });
                    }
                }, function (err) {
                    $scope.isLoading = false;
                    toastService.toast("danger", err.data);
                });



            };

    }
]);

ThemesController.controller("ThemesNewCtrl", [
    "$scope", "$modalInstance", "toastService",
    function ($scope, $modalInstance, toastService) {

        $scope.onErrorUploadTheme = function () {
            $scope.$parent.isLoading = false;
            $scope.showThemeLoading = false;
            toastService.toast("danger", "Error !");
        };

        $scope.beforeTheme = function () {
            $scope.showThemeLoading = true;
        };

        $scope.uploadedTheme = function () {
            $scope.showThemeLoading = false;
            toastService.toast("success", "Thème ajouté ! Pour l'utiliser, il suffit de le selectionner");
            $modalInstance.close("save");
        };


        $scope.cancel = function (){
            $modalInstance.dismiss("cancel");
        };
    }
]);
