const ConfigControllers = angular.module("aq.config.controllers", ["ui.bootstrap"]);

ConfigControllers.controller("ImportConfigCtrl", [
    "$scope", "ProductObj", "NSConstants", "Config", "$http", "SetAttributesV2", "toastService", function ($scope, ProductObj, NSConstants, Config, $http, SetAttributesV2, toastService) {
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
                    toastService.toast("success", "Succès");
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
                    toastService.toast("success", "Succès");
                }, function (err) {
                    $scope.isLoading = false;
                    toastService.toast("danger", err.data);
                });
            }
        };
    }
]);



ConfigControllers.controller("EnvironmentConfigCtrl", [
    "$scope","ConfigV2", "$http", "$interval", "$sce", "toastService", "EnvBlocks", "TerritoryCountries", "$modal", "Upload",
    function ($scope, ConfigV2, $http, $interval, $sce, toastService, EnvBlocks, TerritoryCountries, $modal, Upload) {
        $scope.blocks = EnvBlocks;
        $scope.disabledButton = false;
        $scope.countries = [];
        // $scope.themesList = [];
        $scope.timezones = moment.tz.names().filter(n => n.includes("Europe"));
        $scope.config = ConfigV2.environment(function () {
            if (!$scope.config.adminPrefix) {
                $scope.config.adminPrefix = "admin";
            }

            $scope.ssl = {
                cert : $scope.config.ssl.cert || '',
                key  : $scope.config.ssl.key || ''
            }
            delete $scope.config.$promise;
        });

        $scope.local = {
            themeDataOverride : false
        };
        $scope.next = {
            actual:"Loading..."
        };
        $scope.nextVersion = "";
        $scope.nextVLoader = true;

        const getNextVersions = () => {
            $http({
                method       : "GET",
                url          : "config/next"
            }).success(function (data, status, headers) {
                $scope.next = data.datas;
                $scope.nextVersion = data.datas.actual;
                $scope.nextVLoader = false;
            }).error(function (data) {
                toastService.toast("danger", data.message);
                $scope.nextVLoader = false;
            });
        }
        getNextVersions();

        $scope.newNextVersion = (nextVersion) => {
            if (nextVersion !== $scope.next) {
                $scope.showThemeLoading = true;
                $http({
                    method : "POST",
                    url    : "config/next",
                    data : {
                        nextVersion
                    }
                }).then(function (response) {
                    toastService.toast("success", "restart in progress...");
                    $scope.showThemeLoading = false;
                    $scope.showLoading = true;
                    $scope.urlRedirect = buildAdminUrl($scope.config.appUrl, $scope.config.adminPrefix);
                    $http.get("/restart");
                    $interval(() => {
                        $http.get("/serverIsUp").then(() => {
                            location.href = window.location = $scope.urlRedirect;
                        })
                    }, 10000);
                }).catch(function (error) {
                    $scope.showThemeLoading = false;
                    console.error(error);
                    toastService.toast("danger", error.message);
                });
            } else {
                toastService.toast("danger", "change version of nextjs");
            }
        }

        TerritoryCountries.query({ PostBody: { filter: { type: 'country' }, structure: '*', limit: 99 } }, function ({datas}) {
            $scope.countries = datas;
        });

        $scope.$watch("config.mailUser", function (newValue, oldValue) {
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
                                toastService.toast("success", "Mail Test envoyé.");
                                $modalInstance.close();
                            }, function(r){
                                if(r.data && r.data.stack){
                                    let position = r.data.stack.indexOf(" at ");
                                    toastService.toast("warning", r.data.stack.slice(0,position));
                                }else{
                                    toastService.toast("warning", "Une erreur est survenue. Veuillez vérifier les informations de connexion au serveur mail.");
                                }
                                $scope.loading = false;
                            });
                        } else {
                            toastService.toast("warning", "Veuillez saisir le destinataire.");
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


        const downloadBlob = function (data, status, headers, type, nFile) {
            headers = headers();

            const filename = `${nFile}_${Math.round(new Date().getTime() / 1000)}${type}`;
            const contentType = headers["content-type"];

            const linkElement = document.createElement("a");
            try {
                const blob = new Blob([data], {type: contentType});
                const url = window.URL.createObjectURL(blob);

                linkElement.setAttribute("href", url);
                linkElement.setAttribute("download", filename);

                const clickEvent = new MouseEvent("click", {
                    view       : window,
                    bubbles    : true,
                    cancelable : false
                });
                $scope.disabledButton = false;
                linkElement.dispatchEvent(clickEvent);
            } catch (ex) {
                console.error(ex);
            }
        };


        /*
         * Permet de télécharger l'ensemble des documents du serveur au format zip
         */
        $scope.downloadDocuments = function () {
            toastService.toast("info", "Cela peut prendre du temps, merci de patienter ...");
            $scope.disabledButton = true;

            $http({
                method       : "GET",
                url          : "v2/medias/download/documents",
                responseType : "blob"
            }).success(function (data, status, headers) {
                downloadBlob(data, status, headers, '.zip', 'medias');
            }).error(function (data) {
                console.error(data);
            });
        };

        $scope.beforeDocument = function () {
            toastService.toast("info", "Cela peut prendre du temps, merci de patienter ...");
        };

        $scope.uploadedDocument = function () {
            toastService.toast("success", "Ajout des documents effectué.");
        };

        $scope.dumpDatabase = function () {
            toastService.toast("info", "Cela peut prendre du temps, merci de patienter ...");
            $scope.disabledButton = true;
            $http({
                method       : "POST",
                url          : "v2/rgpd/dumpAnonymizedDatabase",
                params       : {},
                responseType : "blob"
            }).success(function (data, status, headers) {
                downloadBlob(data, status, headers, '.gz', 'database');
            }).error(function (data) {
                console.error(data);
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
            if (!$scope.config.adminPrefix) {
                $scope.config.adminPrefix = "admin";
            }
            if ($scope.config.appUrl && !$scope.config.appUrl.endsWith('/')) {
                $scope.config.appUrl += "/";
            }
            let file = {};
            if ($scope.config.ssl.cert instanceof File || $scope.config.ssl.cert instanceof File) {
                if ($scope.config.ssl.cert instanceof File) {
                    file.cert = $scope.config.ssl.cert;
                    $scope.config.ssl.cert = $scope.config.ssl.cert.name;
                }
                if ($scope.config.ssl.key instanceof File) {
                    file.key = $scope.config.ssl.key;
                    $scope.config.ssl.key = $scope.config.ssl.key.name;
                }
            }

            ConfigV2.environment(function (oldAdmin) {
                $scope.config.cacheTTL = $scope.config.cacheTTL || "";
                $scope.showThemeLoading = true;
                Upload.upload({
                    url: 'v2/config',
                    method: 'PUT',
                    data: {
                        ...file,
                        environment: $scope.config
                    }
                }).then((response) => {
                    if (
                        oldAdmin.adminPrefix !== $scope.config.adminPrefix
                        || oldAdmin.appUrl !== $scope.config.appUrl
                        || oldAdmin.photoPath !== $scope.config.photoPath
                        || oldAdmin.cacheTTL !== $scope.config.cacheTTL
                        || oldAdmin.databaseConnection !== $scope.config.databaseConnection
                    ) {
                        $scope.showThemeLoading = false;
                        $scope.showLoading = true;
                        $scope.urlRedirect = buildAdminUrl($scope.config.appUrl, $scope.config.adminPrefix);
                        $http.get("/restart");
                        $interval(() => {
                            $http.get("/serverIsUp").then(() => {
                                location.href = window.location = $scope.urlRedirect;
                            })
                        }, 10000);
                    } else {
                        window.location.reload(true);
                    }
                }, function (err) {
                    $scope.showThemeLoading = false;
                    toastService.toast("danger", "Une erreur est survenue !");
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
    "$scope", "NSConstants", "Config", "$http", "toastService", function ($scope, NSConstants, Config, $http, toastService) {
        $scope.startImport = function () {
            toastService.toast("info", "Import en cours...");

            $http.get("/config/imports/importProcess").then(function (response) {
                if (response !== null) {
                    toastService.toast("success", "Import terminé");
                }
            }, function (err) {
                $scope.isLoading = false;
                toastService.toast("danger", err.data);
            });
        };
    }
]);

ConfigControllers.controller("RobotTxtCtrl", [
    "$scope", "$q", "$routeParams", "$location", "toastService", "$modalInstance", "$http",
    function ($scope, $q, $routeParams, $location, toastService, $modalInstance, $http) {
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
                toastService.toast("success", "Le fichier robot.txt a été modifié.");
                $scope.close();
            });
        };
    }
]);
