const SystemControllers = angular.module("aq.system.controllers", []);

SystemControllers.controller("systemGeneralController", [
    "$scope", "ConfigV2", "NSConstants", "System", "$http", "toastService",
    function ($scope, ConfigV2, NSConstants, System, $http, toastService) {

        $scope.config = ConfigV2.environment(function () {
            $scope.ssl = {
                cert : $scope.config.ssl.cert || '',
                key  : $scope.config.ssl.key || ''
            }
            delete $scope.config.$promise;
        });
        $scope.getLinks = function (){
            System.getLinks({}, function(response){
                if(response.sdf != ''){
                    $scope.logError = {
                        logFile : response.linkToLog,
                        errorFile : response.linkToError
                    };
                }else{
                    $scope.logError = {
                        logFile : '',
                        errorFile : ''
                    };
                }
            }, function(){
                $scope.logError = {
                    logFile : '',
                    errorFile : ''
                };
            })
        };
        $scope.getLinks();

        $scope.getFiles = function(){
            System.getFiles({name: 'log'}, function (response) {
                $scope.logError.log = response;
            }, function(erreur){
                $scope.logError.log = '';
            });
            System.getFiles({name: 'error'}, function (response) {
                $scope.logError.error = response;
            }, function(erreur){
                $scope.logError.error = '';
            });
        }
        $scope.getFiles();

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
    }
]);



