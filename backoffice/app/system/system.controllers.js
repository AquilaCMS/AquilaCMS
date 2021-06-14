const SystemControllers = angular.module("aq.system.controllers", []);

SystemControllers.controller("systemGeneralController", [
    "$scope", "ConfigV2", "NSConstants", "System", "$http", "toastService", "Upload", "$interval", "EnvBlocks", "$translate",
    function ($scope, ConfigV2, NSConstants, System, $http, toastService, Upload, $interval, EnvBlocks, $translate) {
        $scope.blocks = EnvBlocks;

        $scope.log = {
            log: "",
            error: ""
        };

        $scope.contentPolicy = {
            // active: true,
            content: [],
            newPolicy: ""
        };

        $scope.removePolicy = function(value){
            const index = $scope.contentPolicy.content.indexOf(value);
            if (index > -1) {
                $scope.contentPolicy.content.splice(index, 1);
            }
        };

        $scope.addPolicy = function(value){
            if(!$scope.contentPolicy.content.includes(value) && value != "" && typeof value !== "undefined"){
                $scope.contentPolicy.content.push(value);
                $scope.contentPolicy.newPolicy = "";
            }
        };


        ConfigV2.get({PostBody: {structure: {environment: 1}}}, function (config) {
            $scope.system = config;
            $scope.system.environment.logPath = $scope.system.environment.logPath || '';
            $scope.system.environment.errorPath = $scope.system.environment.errorPath || '';
            $scope.getFilesLogAndError('log');
            $scope.getFilesLogAndError('error');
            if($scope.system.environment.contentSecurityPolicy.values){
                $scope.contentPolicy.content = $scope.system.environment.contentSecurityPolicy.values;
            }
            $scope.ssl = {
                cert    : $scope.system.environment.ssl.cert    || '',
                key     : $scope.system.environment.ssl.key     || '',
                active  : $scope.system.environment.ssl.active  || false
            }
            delete $scope.system.$promise;
        });

        $scope.refreshLog = function(){
            $scope.getFilesLogAndError('log');
            $scope.getFilesLogAndError('error');
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

        $scope.getFilesLogAndError = function(variable) {
            let attribut;
            if (variable === 'log') {
                attribut = 'logPath';
            } else if(variable === 'error') {
                attribut = 'errorPath';
            }
            if (!$scope.system.environment[attribut] || $scope.system.environment[attribut] == '') {
                $scope.system.environment[attribut] == ''; //if it's undefined
                $scope.log[variable] = 'No file "'+ variable +'"';
            } else {
                System.getFilesLogAndErrorRoute({name: $scope.system.environment[attribut]}, function (response) {
                    //here change color of text
                    $scope.log[variable] = response.fileData;
                }, function(err) {
                    $scope.log[variable] = '';
                });
            }
        }


        $scope.newNextVersion = (nextVersion) => {
            if (nextVersion !== $scope.next) {
                $scope.showThemeLoading = true;
                System.changeNextVersionRoute({nextVersion}, function(response){
                    toastService.toast("success", $translate.instant("system.other.restartProgress"));
                    $scope.showThemeLoading = false;
                    $scope.showLoading = true;
                    $scope.urlRedirect = buildAdminUrl($scope.system.environment.appUrl, $scope.system.environment.adminPrefix);
                    $http.get("/restart");
                    $interval(() => {
                        $http.get("/serverIsUp").then(() => {
                            location.href = window.location = $scope.urlRedirect;
                        })
                    }, 10000);
                }, function(error) {
                    $scope.showThemeLoading = false;
                    console.error(error);
                    toastService.toast("danger", error.message);
                });
            } else {
                toastService.toast("danger", $translate.instant("system.other.changeVersion"));
            }
        };

        // Permet de télécharger l'ensemble des documents du serveur au format zip

        $scope.downloadDocuments = function () {
            toastService.toast("info", $translate.instant("system.other.takeTime"));
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
            toastService.toast("info", $translate.instant("system.other.takeTime"));
        };

        $scope.uploadedDocument = function () {
            toastService.toast("success", $translate.instant("system.other.addDoc"));
        };

        $scope.dumpDatabase = function () {
            toastService.toast("info", $translate.instant("system.other.takeTime"));
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

        $scope.next = {
            actual:"Loading..."
        };
        $scope.nextVersion = "";
        $scope.nextVLoader = true;

        const getNextVersions = () => {
            System.getNextVersionRoute({}, function(response){
                $scope.next = response.datas;
                $scope.nextVersion = response.datas.actual;
                $scope.nextVLoader = false;
            }, function(error){
                toastService.toast("danger", error.message);
                $scope.nextVLoader = false;
            });
        };
        getNextVersions();


        $scope.validate = function () {
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
            if($scope.contentPolicy.newPolicy != "" && typeof $scope.contentPolicy.newPolicy !== "undefined" && !$scope.contentPolicy.content.includes($scope.contentPolicy.newPolicy)){
                $scope.contentPolicy.content.push($scope.contentPolicy.newPolicy);
                $scope.contentPolicy.newPolicy = "";
            }
            ConfigV2.get({PostBody: {structure: {environment: 1}}}, function (oldAdmin) {
                $scope.system.environment.cacheTTL = $scope.system.environment.cacheTTL || "";
                $scope.showThemeLoading = true;
                $scope.system.environment.contentSecurityPolicy.values = $scope.contentPolicy.content;

                Upload.upload({
                    url: 'v2/config',
                    method: 'PUT',
                    data: {
                        ...file,
                        ...$scope.system
                    }
                }).then((response) => {
                    if (response.data.data.needRestart) {
                        $scope.showLoading = true;
                        $interval(() => {
                            $http.get("/serverIsUp").then(() => {
                                location.href = $scope.urlRedirect;
                                window.location = $scope.urlRedirect;
                            })
                        }, 10000);
                    }
                    if (oldAdmin.environment.adminPrefix !== $scope.system.environment.adminPrefix) {
                        $scope.showThemeLoading = false;
                        $scope.urlRedirect = buildAdminUrl($scope.system.environment.appUrl, $scope.system.environment.adminPrefix);
                    } else {
                        window.location.reload();
                    }
                }, function (err) {
                    $scope.showThemeLoading = false;
                    toastService.toast("danger", $translate.instant("system.other.errorOccurred"));
                    console.error(err);
                });
            });
        };
    }
]);
