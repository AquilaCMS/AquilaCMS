const SystemControllers = angular.module("aq.system.controllers", []);

SystemControllers.controller("systemGeneralController", [
    "$scope", "ConfigV2", "NSConstants", "System", "$http", "toastService", "Upload", "$interval", "EnvBlocks", "$translate",
    function ($scope, ConfigV2, NSConstants, System, $http, toastService, Upload, $interval, EnvBlocks, $translate) {
        $scope.blocks = EnvBlocks;
        $scope.showModuleLoading = false;
        $scope.log = {
            log: "",
            error: "",
            displayedLinesLogs: 300,
            displayedLinesErrors: 300
        };
        let numberLogPage = {
            pageNbr: 1,
            pageNbrLog: 1,
            pageNbrError: 1
        };
        $scope.isSelected = false

        $scope.contentPolicy = {
            // active: true,
            content: [],
            newPolicy: ""
        };

        $scope.switchCsp = function (value) {
            if (value == true) {
                if (confirm($translate.instant("confirm.activateCSP"))) {
                    $scope.system.environment.contentSecurityPolicy.active = true;
                } else {
                    $scope.system.environment.contentSecurityPolicy.active = false;
                }
            } else {
                $scope.contentPolicy.content = [];
            }
        }

        $scope.removePolicy = function (value) {
            const index = $scope.contentPolicy.content.indexOf(value);
            if (index > -1) {
                $scope.contentPolicy.content.splice(index, 1);
            }
        };

        $scope.addPolicy = function (value) {
            if (!$scope.contentPolicy.content.includes(value) && value != "" && typeof value !== "undefined") {
                $scope.contentPolicy.content.push(value);
                $scope.contentPolicy.newPolicy = "";
            }
        };


        ConfigV2.get({ PostBody: { structure: { environment: 1 } } }, function (config) {
            $scope.system = config;
            $scope.system.environment.logPath = $scope.system.environment.logPath || '';
            $scope.system.environment.errorPath = $scope.system.environment.errorPath || '';
            $scope.getFilesLogAndError('log');
            $scope.getFilesLogAndError('error');
            if ($scope.system.environment.contentSecurityPolicy.values) {
                $scope.contentPolicy.content = $scope.system.environment.contentSecurityPolicy.values;
            }
            $scope.ssl = {
                cert: $scope.system.environment.ssl.cert || '',
                key: $scope.system.environment.ssl.key || '',
                active: $scope.system.environment.ssl.active || false
            }
            if(!$scope.system.environment.searchSettings) {
                $scope.system.environment.searchSettings = {
                    shouldSort         : true,
                    ignoreLocation     : true,
                    findAllMatches     : true,
                    ignoreFieldNorm    : true,
                    includeScore       : true,
                    useExtendedSearch  : true,
                    minMatchCharLength : 2,
                    threshold          : 0.3
                }
            }
            if(!$scope.system.environment.searchSettings.keys) {
                $scope.system.environment.searchSettings.keys = [
                    {key: 'code', label: 'Code', weight: 5},
                    {key: 'name', label: 'Nom', weight: 100},
                    {key: 'description1.title', label: 'Titre description 1', weight: 3},
                    {key: 'description1.text', label: 'Texte description 1', weight: 2.5},
                    {key: 'description2.title', label: 'Titre description 2', weight: 2},
                    {key: 'description2.text', label: 'Texte description 2', weight: 1.5}
                ]
            }
            delete $scope.system.$promise;
        });

        $scope.refreshLog = function () {
            numberLogPage.pageNbr = numberLogPage.pageNbrLog;
            $scope.getFilesLogAndError('log');
            numberLogPage.pageNbr = numberLogPage.pageNbrError;
            $scope.getFilesLogAndError('error');
        };

        $scope.pageIncrease = function (logOrError) {
            if(logOrError === 'log') {
                numberLogPage.pageNbrLog ++;
                $scope.log.displayedLinesLogs = 300 * numberLogPage.pageNbrLog;
                numberLogPage.pageNbr = numberLogPage.pageNbrLog;
                $scope.getFilesLogAndError('log');
            }
            else if(logOrError === 'error') {
                numberLogPage.pageNbrError ++;
                $scope.log.displayedLinesErrors = 300 * numberLogPage.pageNbrError;
                numberLogPage.pageNbr = numberLogPage.pageNbrError;
                $scope.getFilesLogAndError('error');
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
        };

        $scope.getFilesLogAndError = function (variable) {
            let attribut;
            if (variable === 'log') {
                attribut = 'logPath';
            } else if (variable === 'error') {
                attribut = 'errorPath';
            }
            if (!$scope.system.environment[attribut] || $scope.system.environment[attribut] == '') {
                $scope.system.environment[attribut] == ''; //if it's undefined
                $scope.log[variable] = 'No file "' + variable + '"';
            } else {
                System.getFilesLogAndErrorRoute({ name: $scope.system.environment[attribut], pageNbr : numberLogPage.pageNbr }, function (response) {
                    //here change color of text
                    $scope.log[variable] = response.fileData;
                }, function (err) {
                    $scope.log[variable] = '';
                });
            }
        }

        // Allows you to download all documents from the server in zip format

        $scope.downloadDocuments = function () {
            toastService.toast("info", $translate.instant("system.environment.other.takeTime"));
            $scope.disabledButton = true;

            $http({
                method: "GET",
                url: "v2/medias/download/documents",
                responseType: "blob"
            }).success(function (data, status, headers) {
                downloadBlob(data, status, headers, '.zip', 'medias');
            }).error(function (data) {
                console.error(data);
            });
        };

        $scope.beforeDocument = function () {
            toastService.toast("info", $translate.instant("system.environment.other.takeTime"));
        };

        $scope.uploadedDocument = function () {
            toastService.toast("success", $translate.instant("system.environment.other.addDoc"));
        };

        $scope.dumpDatabase = function () {
            toastService.toast("info", $translate.instant("system.environment.other.takeTime"));
            $scope.disabledButton = true;
            $http({
                method: "POST",
                url: "v2/rgpd/dumpAnonymizedDatabase",
                params: {},
                responseType: "blob"
            }).success(function (data, status, headers) {
                downloadBlob(data, status, headers, '.gz', 'database');
            }).error(function (data) {
                $scope.disabledButton = false;
                try {
                    data.text().then(text => {
                        const parsed = JSON.parse(text);
                        if (parsed && parsed.message) {
                            toastService.toast("danger", parsed.message);
                        }
                    });
                } catch (e) {
                    toastService.toast("danger", $translate.instant("global.standardError"));
                    console.error(data);
                }
            });
        };

        const downloadBlob = function (data, status, headers, type, nFile) {
            headers = headers();

            const filename = `${nFile}_${Math.round(new Date().getTime() / 1000)}${type}`;
            const contentType = headers["content-type"];

            const linkElement = document.createElement("a");
            try {
                const blob = new Blob([data], { type: contentType });
                const url = window.URL.createObjectURL(blob);

                linkElement.setAttribute("href", url);
                linkElement.setAttribute("download", filename);

                const clickEvent = new MouseEvent("click", {
                    view: window,
                    bubbles: true,
                    cancelable: false
                });
                $scope.disabledButton = false;
                linkElement.dispatchEvent(clickEvent);
            } catch (ex) {
                console.error(ex);
            }
        };

        $scope.validate = function () {
            $scope.showModuleLoading = true;
            if (!$scope.system.environment.adminPrefix) {
                $scope.system.environment.adminPrefix = "admin";
            }
            if ($scope.system.environment.appUrl && !$scope.system.environment.appUrl.endsWith('/')) {
                $scope.system.environment.appUrl += "/";
            }
            let file = {};
            if ($scope.system.environment.ssl.active) {
                if ($scope.system.environment.ssl.cert instanceof File || $scope.system.environment.ssl.cert instanceof File) {
                    if ($scope.system.environment.ssl.cert instanceof File) {
                        file.cert = $scope.system.environment.ssl.cert;
                        $scope.system.environment.ssl.cert = $scope.system.environment.ssl.cert.name;
                    }
                    if ($scope.system.environment.ssl.key instanceof File) {
                        file.key = $scope.system.environment.ssl.key;
                        $scope.system.environment.ssl.key = $scope.system.environment.ssl.key.name;
                    }
                }
            }
            if ($scope.contentPolicy.newPolicy != "" && typeof $scope.contentPolicy.newPolicy !== "undefined" && !$scope.contentPolicy.content.includes($scope.contentPolicy.newPolicy)) {
                $scope.contentPolicy.content.push($scope.contentPolicy.newPolicy);
                $scope.contentPolicy.newPolicy = "";
            }
            ConfigV2.get({ PostBody: { structure: { environment: 1 } } }, function (oldAdmin) {
                $scope.system.environment.cacheTTL = $scope.system.environment.cacheTTL || "";
                $scope.showThemeLoading = true;
                $scope.system.environment.contentSecurityPolicy.values = $scope.contentPolicy.content;

                ConfigV2.save({
                    ...file,
                    ...$scope.system
                }, (response) => {
                    toastService.toast("success", $translate.instant("global.saveDone"));
                    if (response.data.needRestart) {
                        $scope.showLoading = true;
                        $scope.showThemeLoading = false;
                        $interval(() => {
                            $http.get("/serverIsUp").then(() => {
                                if (oldAdmin.environment.adminPrefix !== $scope.system.environment.adminPrefix) {
                                    $scope.urlRedirect = buildAdminUrl($scope.system.environment.appUrl, $scope.system.environment.adminPrefix);
                                    location.href = $scope.urlRedirect;
                                    window.location = $scope.urlRedirect;
                                } else {
                                    window.location.reload();
                                }
                            })
                        }, 10000);
                    } else {
                        $scope.showThemeLoading = false;
                        if (oldAdmin.environment.adminPrefix !== $scope.system.environment.adminPrefix) {
                            $scope.urlRedirect = buildAdminUrl($scope.system.environment.appUrl, $scope.system.environment.adminPrefix);
                            location.href = $scope.urlRedirect;
                            window.location = $scope.urlRedirect;
                        }
                    }
                }, function (err) {
                    $scope.showThemeLoading = false;
                    toastService.toast("danger", $translate.instant("global.standardError"));
                    console.error(err);
                });
            });
        };
    }
]);
