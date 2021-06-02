const ConfigControllers = angular.module("aq.config.controllers", ["ui.bootstrap"]);

ConfigControllers.controller("ImportConfigCtrl", [
    "$scope", "ProductObj", "NSConstants", "Config", "$http", "SetAttributesV2", "toastService", "$translate",
    function ($scope, ProductObj, NSConstants, Config, $http, SetAttributesV2, toastService, $translate) {
        console.info(">>> ImportConfigCtrl loaded ! <<<");

        $scope.productObj = ProductObj;
        $scope.productTypes = NSConstants.productTypes;
        $scope.local = {};
        $scope.showLoading = false;

        $scope.onTabSelect = function (tabId) {
            if (tabId != "arbo") {
                const query = {category: tabId};
                $http({url: "/config/imports/getColumns", method: "GET", params: query}).then(function (response) {
                    $scope.csvColumns = response.data;
                });
            }
        };

        $scope.onTabSelect("products");

        $scope.tabs = [
            {
                name     : "Produits",
                id       : "products",
                isActive : true,
                fields   : [
                    {name: "Code", code: "id", isRequired: true}, {name: "Nom", code: "name", isRequired: true}, {
                        name     : "Code fournisseur", code     : "supplier_ref", refTable : "suppliers", refField : "code"
                    }, {name: "Image de base", code: "imageUrl", media: {type: "Image", host: null}}
                ]
            }, {
                name   : "Fournisseurs",
                id     : "suppliers",
                fields : [{name: "Code", code: "code", isRequired: true}, {name: "Nom", code: "name", isRequired: true}]
            }, {
                name   : "Arborescence", id     : "arbo", fields : []
            }
        ];

        $scope.setAttributes = [];
        SetAttributesV2.list({PostBody: {filter: {}, structure: '*', limit: 99}}, function (response) {
            $scope.setAttributes = response.datas
        });

        $scope.getAttributes = function (tabId, setAttrCode) {
            SetAttributesV2.query({PostBody: {filter: {code: setAttrCode}, structure: '*'}}).$promise.then(function (response) {
                $scope.attributes = repsonse.attributes;
            });
        };

        $scope.validate = function (fields, category, setAttrCode, attributes) {
            $scope.isLoading = true;
            const setAttr = $scope.setAttributes.find(function (item) {
                return item.code === setAttrCode;
            });

            if (category == "arbo") {
                $http.post("/config/imports/importArbo").then(function () {
                    $scope.isLoading = false;
                    toastService.toast("success", $translate.instant("global.success"));
                }, function (err) {
                    $scope.isLoading = false;
                    toastService.toast("danger", err.data);
                });
            } else {
                Config.import({
                    fields,
                    category,
                    setAttributes : setAttr,
                    attributes
                }).$promise.then(function () {
                    $scope.isLoading = false;
                    toastService.toast("success", $translate.instant("global.success"));
                }, function (err) {
                    $scope.isLoading = false;
                    toastService.toast("danger", err.data);
                });
            }
        };
    }
]);

ConfigControllers.controller("EnvironmentConfigCtrl", [
    "$scope","ConfigV2", "$http", "$interval", "$sce", "toastService", "TerritoryCountries", "$modal", "Upload", "$translate",
    function ($scope, ConfigV2, $http, $interval, $sce, toastService, TerritoryCountries, $modal, Upload, $translate) {
        $scope.disabledButton = false;
        $scope.countries = [];
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
        TerritoryCountries.query({ PostBody: { filter: { type: 'country' }, structure: '*', limit: 99 } }, function ({datas}) {
            $scope.countries = datas;
        });

        $scope.$watch("config.environment.mailUser", function (newValue, oldValue) {
            if (newValue !== undefined && newValue.indexOf("gmail") > -1) {
                $scope.messageMail = " ! Vous devez autoriser le paramètre \"Autoriser les applications moins sécurisées\" <a style='color: #2a6496;' target='_blank' href='https://www.google.com/settings/security/lesssecureapps'>ici</a> pour utiliser Gmail !";
                $scope.messageMail = $sce.trustAsHtml($scope.messageMail);
            } else {
                $scope.messageMail = "";
            }
        });

        $scope.testMail = function (lang) {
            $modal.open({
                templateUrl: 'app/config/modal/testMail.html',
                controller: function ($scope, $modalInstance, TestMailConfig) {
                    $scope.mail = {};
                    $scope.adminLang = lang;
                    $scope.loading = false;

                    $scope.testMail = function () {
                        $scope.loading = true;

                        let mailInfo = {}
                        mailInfo.from = $scope.mail.to;
                        mailInfo.to = $scope.mail.to;
                        if ($scope.mail.to && $scope.mail.to !== "") {
                            TestMailConfig.sendMailConfig({ mail: mailInfo, values: "Email Test", lang: "en" }, function (res) {
                                toastService.toast("success", $translate.instant("config.environment.testMailSend"));
                                $modalInstance.close();
                            }, function(r){
                                if(r.data && r.data.stack){
                                    let position = r.data.stack.indexOf(" at ");
                                    toastService.toast("warning", r.data.stack.slice(0,position));
                                }else{
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
                backdrop    : 'static',
                keyboard    : false,
                templateUrl : 'app/config/modal/robot.config.html',
                controller  : 'RobotTxtCtrl',
                resolve     : {
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
            if(!$scope.config.environment.favicon){
                $scope.config.environment.favicon = '';
            }
            let file = {};
            ConfigV2.get({PostBody: {structure: {environment: 1}}}, function (oldConfig) {
                $scope.config.environment.cacheTTL = $scope.config.environment.cacheTTL || "";
                $scope.showThemeLoading = true;
                Upload.upload({
                    url: 'v2/config',
                    method: 'PUT',
                    data: {
                        ...file,
                        ...$scope.config
                    }
                }).then((response) => {
                    $scope.urlRedirect = buildAdminUrl($scope.config.environment.appUrl, $scope.config.environment.adminPrefix);
                    if (response.data.data.needRestart) {
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
                    } else {
                        window.location.reload();
                    }
                }, (err) => {
                    $scope.showThemeLoading = false;
                    toastService.toast("danger", $translate.instant("global.standardError"));
                    console.error(err);
                });
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

ConfigControllers.controller("ImportTmpConfigCtrl", [
    "$scope", "NSConstants", "Config", "$http", "toastService", "$translate", function ($scope, NSConstants, Config, $http, toastService, $translate) {
        $scope.startImport = function () {
            toastService.toast("info", "Import en cours...");

            $http.get("/config/imports/importProcess").then(function (response) {
                if (response !== null) {
                    toastService.toast("success", $translate.instant("config.import.importFinish"));
                }
            }, function (err) {
                $scope.isLoading = false;
                toastService.toast("danger", err.data);
            });
        };
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
            $http.post('/robot', {PostBody: {text}}).then((response) => {
                toastService.toast("success", $translate.instant("config.import.modifyRobot"));
                $scope.close();
            });
        };
    }
]);
