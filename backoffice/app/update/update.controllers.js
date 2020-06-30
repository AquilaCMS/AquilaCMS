
const UpdateControllers = angular.module('aq.update.controllers', []);

UpdateControllers.controller('UpdateHomeCtrl', ['$scope', '$http', 'toastService', 'updateFactory','Config',
    function ($scope, $http, toastService, updateFactory, Config) {

        $scope.tab = "maj";
        $scope.disableSave = true;

        $scope.onTabSelect = function (tabId) {
            if (tabId == "maj") {
                $scope.tab = "maj";
                $scope.disableSave = true;

            } else {
                $scope.tab = "maintenance";
                $scope.disableSave = false;
            }
        };

        $scope.config = Config.environment(function () {
            if (!$scope.config.adminPrefix) {
                $scope.config.adminPrefix = "admin";
            }
        });
        

        $scope.validate = function (tab) {
                Config.save({ environment: $scope.config }).$promise.then   (function () {
                    toastService.toast("success", "Configuration sauvegardée !");
                }, function (err) {
                    toastService.toast("danger", "Une erreur est survenue !");
                    console.error(err);
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
        
        $scope.local = {
            showLoading:false,
            verifyingUpdate:true,
            currentVersion:"loading....",
            needUpdate:true,
            onlineVersion:"loading..."
        }

        $scope.local.update = function() {
            $scope.local.showLoading = true;

            $http.get('/v2/update').then((response) => {
                $scope.local.showLoading     = false;
                $scope.local.verifyingUpdate = false;
                $scope.local.needUpdate      = false;
                toastService.toast('success', 'Update succeded :)');
            }, (err) => {
                $scope.local.showLoading     = false;
                toastService.toast('danger', "Update failed :(");
                console.error(err);
            });
            
        };


        $http.get('/v2/update/verifying').then((response) => {
            $scope.local.verifyingUpdate = false;
            $scope.local.needUpdate      = response.data.needUpdate;
            $scope.local.currentVersion  = response.data.version;
            $scope.local.onlineVersion      = response.data.onlineVersion;
        }, (err) => {
            toastService.toast('danger', 'Impossible de verifier la mise à jour');
        });



    }]);

