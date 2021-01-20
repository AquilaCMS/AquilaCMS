const SystemControllers = angular.module("aq.system.controllers", []);

SystemControllers.controller("systemGeneralController", [
    "$scope", "ConfigV2", "NSConstants", "System", "$http", "toastService", "Upload", "$interval", "EnvBlocks",
    function ($scope, ConfigV2, NSConstants, System, $http, toastService, Upload, $interval, EnvBlocks) {
        $scope.blocks = EnvBlocks;

        $scope.log = {
            log: "",
            error: ""
        };

        ConfigV2.get({PostBody: {structure: {environment: 1}}}, function (config) {
            $scope.system = config;
            $scope.system.environment.logPath = $scope.system.environment.logPath || '';
            $scope.system.environment.errorPath = $scope.system.environment.errorPath || '';
            $scope.getFilesLogAndError('log');
            $scope.getFilesLogAndError('error');
            $scope.ssl = {
                cert    : $scope.system.environment.ssl.cert    || '',
                key     : $scope.system.environment.ssl.key     || '',
                active  : $scope.system.environment.ssl.active  || false
            }
            delete $scope.system.$promise;
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
        };

        $scope.getFilesLogAndError = function(variable) {
            let attribut;
            if(variable === 'log'){
                attribut = 'logPath';
            }else if(variable === 'error'){
                attribut = 'errorPath';
            }
            if(!$scope.system.environment[attribut] || $scope.system.environment[attribut] == ''){
                $scope.system.environment[attribut] == ''; //if it's undefined
                $scope.log.log = 'No file "'+ variable +'"';
            }else{
                System.getFilesLogAndErrorRoute({name: $scope.system.environment[attribut]}, function (response) {
                    //here change color of text
                    $scope.log[variable] = response.fileData;
                }, function(erreur){
                    $scope.log[variable] = '';
                });
            }
        }


        $scope.newNextVersion = (nextVersion) => {
            if (nextVersion !== $scope.next) {
                $scope.showThemeLoading = true;
                System.changeNextVersionRoute({nextVersion}, function(response){
                    toastService.toast("success", "restart in progress...");
                    $scope.showThemeLoading = false;
                    $scope.showLoading = true;
                    $scope.urlRedirect = buildAdminUrl($scope.system.environment.appUrl, $scope.system.environment.adminPrefix);
                    $http.get("/restart");
                    $interval(() => {
                        $http.get("/serverIsUp").then(() => {
                            location.href = window.location = $scope.urlRedirect;
                        })
                    }, 10000);
                }, function(error){
                    $scope.showThemeLoading = false;
                    console.error(error);
                    toastService.toast("danger", error.message);
                });
            } else {
                toastService.toast("danger", "change version of nextjs");
            }
        };

        // Permet de télécharger l'ensemble des documents du serveur au format zip

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
            ConfigV2.get({PostBody: {structure: {environment: 1}}}, function (oldAdmin) {
                $scope.system.environment.cacheTTL = $scope.system.environment.cacheTTL || "";
                $scope.showThemeLoading = true;
                Upload.upload({
                    url: 'v2/config',
                    method: 'PUT',
                    data: {
                        ...file,
                        ...$scope.system
                    }
                }).then((response) => {
                    if (
                        oldAdmin.adminPrefix !== $scope.system.environment.adminPrefix
                        || oldAdmin.appUrl !== $scope.system.environment.appUrl
                        || oldAdmin.photoPath !== $scope.system.environment.photoPath
                        //|| oldAdmin.cacheTTL !== $scope.system.environment.cacheTTL
                        || oldAdmin.databaseConnection !== $scope.system.environment.databaseConnection
                    ) {
                        $scope.showThemeLoading = false;
                        $scope.showLoading = true;
                        $scope.urlRedirect = buildAdminUrl($scope.system.environment.appUrl, $scope.system.environment.adminPrefix);
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
    }
]);
