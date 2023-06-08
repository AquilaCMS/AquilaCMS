const ConfigControllers = angular.module("aq.config.controllers", ["ui.bootstrap"]);

ConfigControllers.controller("EnvironmentConfigCtrl", [
    "$scope", "ConfigV2", "$http", "$interval", "$sce", "toastService", "TerritoryCountries", "$modal", "Upload", "$translate",
    function ($scope, ConfigV2, $http, $interval, $sce, toastService, TerritoryCountries, $modal, Upload, $translate) {
        $scope.disabledButton = false;
        $scope.countries = [];
        $scope.config = {};
        // $scope.themesList = [];
        $scope.timezones = moment.tz.names().filter(n => n.includes("Europe"));
        ConfigV2.get({ PostBody: { structure: { environment: 1 } } }, function (config) {
            $scope.config = config;
            if (!$scope.config.environment.adminPrefix) {
                $scope.config.environment.adminPrefix = "admin";
            }
            delete $scope.config.$promise;
        });

        $scope.local = {
            themeDataOverride: false
        };
        TerritoryCountries.query({ PostBody: { filter: { type: 'country' }, structure: '*', limit: 0 } }, function ({ datas }) {
            $scope.countries = datas;
        });

        $scope.$watch("config.environment.mailUser", function (newValue, oldValue) {
            if (newValue !== undefined && newValue.indexOf("gmail") > -1) {
                $scope.messageMail = $translate.instant("config.environment.mailUserMsg");
                $scope.messageMail = $sce.trustAsHtml($scope.messageMail);
            } else {
                $scope.messageMail = "";
            }
        });

        $scope.testMail = function (lang) {
            $modal.open({
                templateUrl: 'app/config/modal/testMail.html',
                controller: function ($scope, $modalInstance, TestMailConfig) {
                    $scope.equalInputs = false
                    $scope.mail = {};
                    $scope.adminLang = lang;
                    $scope.loading = false;

                    $scope.testMail = function () {
                        if ($scope.mail.from == $scope.mail.to) {
                            $scope.equalInputs = true
                            return false
                        }
                        $scope.equalInputs = false
                        $scope.loading = true;

                        let mailInfo = {}
                        mailInfo.from = $scope.mail.from;
                        mailInfo.to = $scope.mail.to;
                        if ($scope.mail.to && $scope.mail.to !== "") {
                            TestMailConfig.sendMailConfig({ mail: mailInfo, values: "Email Test", lang: "en" }, function (res) {
                                toastService.toast("success", $translate.instant("config.environment.testMailSend"));
                                $modalInstance.close();
                            }, function (r) {
                                if (r.data && r.data.stack) {
                                    let position = r.data.stack.indexOf(" at ");
                                    toastService.toast("warning", r.data.stack.slice(0, position));
                                } else {
                                    toastService.toast("warning", $translate.instant("config.environment.errorCheckInfo"));
                                }
                                $scope.loading = false;
                            });
                        } else {
                            toastService.toast("warning", $translate.instant("config.environment.enterRecipient"));
                        }
                    }

                    $scope.cancel = function () {
                        $modalInstance.dismiss('cancel');
                    };
                },
                resolve: {
                }
            }).result.then(function () {
            });
        };

        // Ouverture de la modal d'édition du fichier 'robot.txt'
        $scope.editRobot = function () {
            $modal.open({
                backdrop: 'static',
                keyboard: false,
                templateUrl: 'app/config/modal/robot.config.html',
                controller: 'RobotTxtCtrl',
                resolve: {
                    // mail: function () {
                    //     return $scope.mail;
                    // },
                }
            }).result.then(function () {
            });
        };

        $scope.validate = function () {
            if ($scope.config.environment.appUrl && !$scope.config.environment.appUrl.endsWith('/')) {
                $scope.config.environment.appUrl += "/";
            }
            if (!$scope.config.environment.favicon) {
                $scope.config.environment.favicon = '';
            }
            let file = {};
            ConfigV2.get({ PostBody: { structure: { environment: 1 } } }, function (oldConfig) {
                $scope.config.environment.cacheTTL = $scope.config.environment.cacheTTL || "";
                $scope.showThemeLoading = true;
                ConfigV2.save({
                    ...file,
                    ...$scope.config
                }, (response) => {
                    $scope.urlRedirect = buildAdminUrl($scope.config.environment.appUrl, $scope.config.environment.adminPrefix);
                    toastService.toast("success", $translate.instant("config.storefront.saveSuccess"));
                    if (response.data.needRestart) {
                        $scope.showLoading = true;
                        $interval(() => {
                            $http.get("/serverIsUp").then(() => {
                                location.href = $scope.urlRedirect;
                                window.location = $scope.urlRedirect;
                            })
                        }, 10000);
                    }
                    if (oldConfig.environment.adminPrefix !== $scope.config.environment.adminPrefix) {
                        $scope.showThemeLoading = false;
                    } else if(!$scope.showLoading) {
                        window.location.reload();
                    }
                }, (err) => {
                    $scope.showThemeLoading = false;
                    toastService.toast("danger", $translate.instant("global.standardError"));
                    console.error(err);
                })
            });
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
    }
]);

ConfigControllers.controller("RobotTxtCtrl", [
    "$scope", "$q", "$routeParams", "$location", "toastService", "$modalInstance", "$http", "$translate",
    function ($scope, $q, $routeParams, $location, toastService, $modalInstance, $http, $translate) {
        $scope.robot = {};

        $http.get('/robot').then((response) => {
            $scope.robot.text = response.data.robot;
        });

        $scope.close = function () {
            $modalInstance.close();
        };

        $scope.save = function (text) {
            if (!text) {
                text = "";
            }
            $http.post('/robot', { PostBody: { text } }).then((response) => {
                toastService.toast("success", $translate.instant("config.import.modifyRobot"));
                $scope.close();
            });
        };
    }
]);


ConfigControllers.controller("StorefrontConfigCtrl", [
    "$scope","ConfigV2", "$http", "$interval", "$sce", "toastService", "TerritoryCountries", "$modal", "Upload", "$translate",
    function ($scope, ConfigV2, $http, $interval, $sce, toastService, TerritoryCountries, $modal, Upload, $translate) {
        $scope.disabledButton = false;
        $scope.config = {};
        // $scope.themesList = [];
        $scope.timezones = moment.tz.names().filter(n => n.includes("Europe"));
        ConfigV2.get({PostBody: {structure: {environment: 1}}}, function (config) {
            $scope.config = config;
            if (!$scope.config.environment.adminPrefix) {
                $scope.config.environment.adminPrefix = "admin";
            }
            delete $scope.config.$promise;
        });

        $scope.local = {
            themeDataOverride : false
        };

        $scope.validate = function () {
            ConfigV2.get({PostBody: {structure: {environment: 1}}}, function (oldConfig) {
                $scope.config.environment.cacheTTL = $scope.config.environment.cacheTTL || "";
                $scope.showThemeLoading = true;
                ConfigV2.save({environment : $scope.config.environment}, function(response) {
                    toastService.toast("success", $translate.instant("config.storefront.saveSuccess"));
                    if (response.data.needRestart) {
                        $scope.showLoading = true;
                        $interval(() => {
                            $http.get("/serverIsUp").then(() => {
                                location.href = $scope.urlRedirect;
                                window.location = $scope.urlRedirect;
                            })
                        }, 10000);
                    }
                }, function (error) {
                    $scope.showThemeLoading = false;
                    toastService.toast("danger", $translate.instant("global.standardError"));
                    console.error(err);
                });
            });
        };
    }
]);
