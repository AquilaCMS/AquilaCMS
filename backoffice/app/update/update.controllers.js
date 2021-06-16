
const UpdateControllers = angular.module('aq.update.controllers', []);

UpdateControllers.controller('UpdateHomeCtrl', ['$scope', '$http', 'toastService', 'updateFactory','ConfigV2', '$translate',
    function ($scope, $http, toastService, updateFactory, ConfigV2, $translate) {

        $scope.tab = "maj";
        $scope.disableSave = true;
        $scope.git = {
            exist:false,
            updateChanges:{},
            showChanges : false
        };

        $http.get('/v2/checkGithub').then((response) => {
            if(response.data.exist){
                $scope.git.exist = true;
            }
        }, (err) => {
            toastService.toast("danger", "Une erreur est survenue !");
        });


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
                toastService.toast("success", $translate.instant("update.configurationSaved"));
            }, function (err) {
                toastService.toast("danger", $translate.instant("update.errorArise"));
                console.error(err);
            });
        };

        $scope.validateGitUpdate = function(changes){
            $scope.local.showLoading = true;
            $http.post('/v2/updateGithub', {changes}).then((response) => {
                    $scope.git.showChanges = true;
                    $scope.needUpdate = false;
                    toastService.toast('success', 'Update succeded :)');
            }, (err) => {
                $scope.local.showLoading = false;
                toastService.toast('danger', "Update failed :(");
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


        $scope.local.updateGithub = function () {
            $scope.local.showLoading = true;
            $http.get('/v2/checkChanges').then((response) => {
                if (response.data.type == "git") {
                    $scope.local.showLoading = false;
                    $scope.local.verifyingUpdate = false;
                    $scope.git.updateChanges = {
                        deletedFiles: response.data.deleted.deleteFiles,
                        deletedFolders: response.data.deleted.deleteFolders,
                        addFiles: response.data.add.addFiles,
                        addFolders: response.data.add.addFolders,
                    };
                    $scope.git.showChanges = true;
                }
            }, (err) => {
                $scope.local.showLoading = false;
                toastService.toast('danger', "Update failed :(");
                console.error(err);
            });

        };

        $scope.local.update = function() {
            $scope.local.showLoading = true;
            $http.get('/v2/update').then((response) => {
                $scope.local.showLoading     = false;
                $scope.local.verifyingUpdate = false;
                $scope.local.needUpdate      = false;
                toastService.toast('success', $translate.instant("update.majSucceded"));
            }, (err) => {
                $scope.local.showLoading     = false;
                toastService.toast('danger', $translate.instant("update.majFailed"));
                console.error(err);
            });

        };

        $http.get('/v2/update/verifying').then((response) => {
            $scope.local.verifyingUpdate = false;
            $scope.local.needUpdate      = response.data.needUpdate;
            $scope.local.currentVersion  = response.data.version;
            $scope.local.onlineVersion      = response.data.onlineVersion;
        }, (err) => {
            toastService.toast('danger', $translate.instant("update.checkMajFailed"));
        });
    }]
);

