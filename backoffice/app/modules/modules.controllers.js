var ModulesControllers = angular.module('aq.modules.controllers', ['ui.toggle', 'ui.bootstrap']);

ModulesControllers.controller('ModulesCtrl', ['$scope', '$http', 'ConfigV2', '$interval', '$location', 'toastService', '$modal', function ($scope, $http, ConfigV2, $interval, $location, toastService, $modal) {
    $scope.showModuleLoading = false;
    $scope.nsUploadFiles     = {
        isSelected : false
    };
    $scope.getDatas          = function ()  {
        $http.post('/v2/modules', {
            PostBody : {
                filter    : {},
                limit     : 100,
                populate  : [],
                skip      : 0,
                sort      : {active:-1,name:1},
                structure : {},
                page      : null
            }
        }).then(function (response) {
            $scope.modules           = response.data.datas;
            $scope.showModuleLoading = false;
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
        $http.post('/v2/modules/md', {
            moduleName: nameModule
        }).then(function (response) {
            responseFromAPI = response.data.html;
            if(!responseFromAPI || responseFromAPI == "") {
                responseFromAPI = 'No ReadMe found';
            }
            $modal.open({
                templateUrl: 'app/modules/views/modal/popUpReadMe.html',
                controller: function ($scope, $modalInstance, reponse) {
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
                    }
                }
            });
        });
    }

    $scope.toggleActive = function (id, name, state) {
        $scope.showModuleLoading = true;
        $http.post('/v2/modules/toggle', {
            idModule    : id,
            active      : state
        }).then(function (response) {
            $scope.showModuleLoading = false;
            $scope.restart(name, state, false);
        }).catch((err) => {
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
            if (err.data.datas && err.data.datas.modules) {
                $scope.modules = err.data.datas.modules;
            }
        });
    };

    $scope.remove = function (idModule, nameModule, state) {
        var check = window.confirm('Êtes-vous sur de vouloir supprimer ce module ?');
        if (check) {
            $scope.showModuleLoading = true;
            $http.delete(`/v2/modules/${idModule}`).then(function (response) {
                $scope.showModuleLoading = false;
                if (!response.status) {
                    console.error('Error!');
                }
                $scope.restart(nameModule, state, true);
                $http.post('/v2/modules', {
                    PostBody : {
                        filter    : {},
                        limit     : 100,
                        populate  : [],
                        skip      : 0,
                        sort: { active: -1, name: 1 },
                        structure : {},
                        page      : null
                    }
                }).then(function (response) {
                    $scope.modules = response.data.datas;
                });
            });
        }
    };

    $scope.restart = function (nomModule, active, deleteBool) {
        ConfigV2.get({PostBody: {structure: {environment: 1}}}, function (config) {
            $scope.config = config;
            $scope.showLoading = true;
            $http.get('/restart').catch((err) => {});
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
    "$scope", "$modalInstance", "toastService", "$http", "toggleActive",
    function ($scope, $modalInstance, toastService, $http, toggleActive) {

        $scope.before = function () {
            $scope.showModuleLoading = true;
        };

        $scope.uploaded = function (module) {
            $http.post('/v2/modules', {
                PostBody : {
                    filter    : {},
                    limit     : 100,
                    populate  : [],
                    skip      : 0,
                    sort: { active: -1, name: 1 },
                    structure : {},
                    page      : null
                }
            }).then(function (response) {
                if (module.active) {
                    toastService.toast('success', 'Module ajouté update en cours, veuillez patientez !');
                    toggleActive(module._id, module.name, true);
                } else {
                    $scope.showModuleLoading = false;
                    toastService.toast('success', 'Module ajouté ! Pour l\'utiliser, il suffit de l\'activer');
                }
                $scope.modules = response.data.datas;
                $modalInstance.close("save");
            });
        };

        $scope.uploadError = function () {
            $scope.getDatas();
            $scope.showModuleLoading = false;
            toastService.toast('danger', 'Problème à l\'ajout du module');
            $modalInstance.close();
        };

        $scope.cancel = function (){
            $modalInstance.dismiss("cancel");
        };
    }
]);
