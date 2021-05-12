var ModulesControllers = angular.module('aq.modules.controllers', ['ui.toggle', 'ui.bootstrap']);

ModulesControllers.controller('ModulesCtrl', ['$scope', '$http', 'ConfigV2', '$interval', '$location', 'toastService', '$modal', '$translate', 'ModuleServiceV2',
function ($scope, $http, ConfigV2, $interval, $location, toastService, $modal, $translate, ModuleServiceV2) {
    $scope.showModuleLoading = false;
    $scope.nsUploadFiles     = {
        isSelected : false
    };
    $scope.getDatas = function ()  {
        ModuleServiceV2.getModules({
            PostBody : {
                filter    : {},
                limit     : 100,
                populate  : [],
                skip      : 0,
                sort      : { active: -1, name: 1 },
                structure : {},
                page      : null
            }
        }, function (response) {
            $scope.modules           = response.datas;
            $scope.showModuleLoading = false;
        }, function(error){
            console.error(error);
            toastService.toast("danger", $translate.instant("modules.toast.errGetPlugins"));
        });
    };
    $scope.getDatas();

    $scope.addPlugin = function (nodeParent) {
        var modalInstance = $modal.open({
            templateUrl: "app/modules/views/modal/modules-new.html",
            controller: "PluginsNewCtrl",
            resolve: {
                toggleActive: function() {
                    return $scope.toggleActive;
                }
            }
        });

        modalInstance.result.then(function () {
            $scope.getDatas();
        });
    };

    $scope.displayReadMe = function(nameModule) {
        var responseFromAPI;
        ModuleServiceV2.getMd({
            moduleName: nameModule
        }, function (response) {
            responseFromAPI = response.html;
            if(!responseFromAPI || responseFromAPI == "") {
                responseFromAPI = 'No ReadMe found';
            }
            $modal.open({
                templateUrl: 'app/modules/views/modal/popUpReadMe.html',
                controller: function ($scope, $modalInstance, reponse, nameModule) {
                    $scope.moduleName = nameModule; //display name in popUp
                    $scope.modalReadMe = {}
                    $scope.modalReadMe.dispReadMe = reponse;
                    $scope.modalReadMe.close = function () {
                        $modalInstance.close();
                    };
                },
                windowClass: "modal-large",
                resolve: {
                    reponse: function() {
                        return responseFromAPI;
                    },
                    nameModule: function(){
                        return nameModule;
                    }
                }
            });
        }, function(error){
            console.error(error);
            toastService.toast("danger", $translate.instant("global.standardError"));
        });
    }

    $scope.toggleActive = function (id, name, state) {
        $scope.showModuleLoading = true;
        ModuleServiceV2.check({
            idModule    : id,
            active      : state
        }, function () {
            $scope.showModuleLoading = false;
            $scope.restart(name, state, false);
        }, function (err) {
            $scope.showModuleLoading = false;
            if (err.data.datas && err.data.datas.missingDependencies && err.data.datas.needActivation) {
                toastService.toast('danger',
                    `${err.data.message}<br>
                    ${err.data.datas.missingDependencies.length > 0 ? `missing dependencies :<br>
                    <b>${err.data.datas.missingDependencies.map((elem) => elem = ` - ${elem}`).join('<br>')}</b><br>` : ''}
                    ${err.data.datas.needActivation.length > 0 ? `need activation :<br>
                    <b>${err.data.datas.needActivation.map((elem) => elem = ` - ${elem}`).join('<br>')}</b><br>` : ''}`);
            } else if (err.data.datas && err.data.datas.needDeactivation) {
                toastService.toast('danger',
                    `${err.data.message}<br>
                    ${err.data.datas.needDeactivation.length > 0 ? `need deactivation :<br>
                    <b>${err.data.datas.needDeactivation.map((elem) => elem = ` - ${elem}`).join('<br>')}</b><br>` : ''}`);
            } else {
                toastService.toast('danger', err.data.message);
            }

            $scope.getDatas()
        });
    };

    $scope.remove = function (idModule, nameModule, state) {
        var check = window.confirm('Êtes-vous sur de vouloir supprimer ce module ?');
        if (check) {
            $scope.showModuleLoading = true;
            $http.delete(`/v2/modules/${idModule}`).then(function (resp) {
                $scope.showModuleLoading = false;
                if (!resp.status) {
                    console.error('Error!');
                }
                $scope.restart(nameModule, state, true);
                ModuleServiceV2.getModules({
                    PostBody : {
                        filter    : {},
                        limit     : 100,
                        populate  : [],
                        skip      : 0,
                        sort: { active: -1, name: 1 },
                        structure : {},
                        page      : null
                    }
                }, function (response) {
                    $scope.modules = response.datas;
                }, function(error) {
                    console.error(error);
                    toastService.toast("danger", $translate.instant("modules.toast.errGetPlugins"));
                });
            });
        }
    };

    $scope.restart = function (nomModule, active, deleteBool) {
        ConfigV2.get({PostBody: {structure: {environment: 1}}}, function (config) {
            $scope.config = config;
            $scope.showLoading = true;
            $http.get('/restart').catch(function(error) {
                console.error(error);
                toastService.toast("danger", $translate.instant("global.restartFail"));
            });
            if (active && !deleteBool) {
                $scope.message = `Activation du module ${nomModule} en cours, merci de patienter ...`;
            } else if (!active && !deleteBool) {
                $scope.message = `Désactivation du module ${nomModule} en cours, merci de patienter ...`;
            } else {
                $scope.message = `Suppression du module ${nomModule} en cours, merci de patienter ...`;
            }

            $interval(() => {
                $http.get('/serverIsUp').then(() => {
                    if ($scope.config.environment.appUrl.slice(-1) !== '/') {
                        $scope.config.environment.appUrl += '/';
                    }
                    const url = $scope.config.environment.appUrl + $scope.config.environment.adminPrefix;
                    window.location = url;
                    location.href   = url;
                });
            }, 10000);
        });
    };
}]);

ModulesControllers.controller("PluginsNewCtrl", [
    "$scope", "$modalInstance", "toastService", "$http", "toggleActive", "ModuleServiceV2", "$translate",
    function ($scope, $modalInstance, toastService, $http, toggleActive, ModuleServiceV2, $translate) {
        $scope.before = function () {
            $scope.showModuleLoading = true;
        };

        $scope.uploaded = function (module) {
            ModuleServiceV2.getModules({
                PostBody : {
                    filter    : {},
                    limit     : 100,
                    populate  : [],
                    skip      : 0,
                    sort: { active: -1, name: 1 },
                    structure : {},
                    page      : null
                }
            }, function (response) {
                if (module.active) {
                    toastService.toast('success', $translate.instant("global.addModule"));
                    toggleActive(module._id, module.name, true);
                } else {
                    $scope.showModuleLoading = false;
                    toastService.toast('success', $translate.instant("global.activateModule"));
                }
                $scope.modules = response.datas;
                $scope.close("save");
            }, function(error){
                console.error(error);
                toastService.toast("danger", $translate.instant("modules.toast.errGetPlugins"));
            });
        };

        $scope.uploadError = function () {
            $scope.getDatas();
            $scope.showModuleLoading = false;
            toastService.toast('danger', $translate.instant("global.errorActiveModule"));
            $scope.close();
        };

        $scope.close = function(data){
            $modalInstance.close(data);
        }

        $scope.cancel = function (){
            $modalInstance.dismiss("cancel");
        };
    }
]);
