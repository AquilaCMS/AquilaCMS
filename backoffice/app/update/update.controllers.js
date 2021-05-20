
const UpdateControllers = angular.module('aq.update.controllers', []);

UpdateControllers.controller('UpdateHomeCtrl', ['$scope', '$http', 'toastService', 'updateFactory','ConfigV2', '$translate',
    function ($scope, $http, toastService, updateFactory, ConfigV2, $translate) {

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

        ConfigV2.get({PostBody: {structure: {environment: 1}}}, function (config) {
            $scope.config = config;
            if (!$scope.config.environment.adminPrefix) {
                $scope.config.environment.adminPrefix = "admin";
            }
        });

        $scope.validate = function (tab) {
            ConfigV2.save({ environment: $scope.config.environment }).$promise.then(function () {
                toastService.toast("success", $translate.instant("global.configurationSaved"));
            }, function (err) {
                toastService.toast("danger", $translate.instant("global.errorArise"));
                console.error(err);
            });
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
                toastService.toast('success', $translate.instant("global.majSucceded"));
            }, (err) => {
                $scope.local.showLoading     = false;
                toastService.toast('danger', $translate.instant("global.majFailed"));
                console.error(err);
            });

        };

        $http.get('/v2/update/verifying').then((response) => {
            $scope.local.verifyingUpdate = false;
            $scope.local.needUpdate      = response.data.needUpdate;
            $scope.local.currentVersion  = response.data.version;
            $scope.local.onlineVersion      = response.data.onlineVersion;
        }, (err) => {
            toastService.toast('danger', $translate.instant("global.checkMajFailed"));
        });
    }]
);

