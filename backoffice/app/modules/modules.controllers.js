var ModulesControllers = angular.module('aq.modules.controllers', ['ui.toggle', "ui.bootstrap"]);

ModulesControllers.controller('ModulesCtrl', ['$scope', '$http', 'ConfigV2', '$interval', '$location', 'toastService', '$modal', function ($scope, $http, ConfigV2, $interval, $location, toastService, $modal)
{
    $scope.showModuleLoading = false;
    $scope.getDatas = function ()  {
        $http.post('/v2/modules', {
            PostBody: {
                filter: {},
                limit: 100,
                populate: [],
                skip: 0,
                sort: {},
                structure: {},
                page: null
            }
        }).then(function (response)
        {
            $scope.modules = response.data.datas;
            $scope.showModuleLoading = false;
        });
    };
    $scope.getDatas();

    $scope.before = function () {
        $scope.showModuleLoading = true;
    };

    $scope.uploaded = function (module)
    {
        $http.post('/v2/modules', {
            PostBody: {
                filter: {},
                limit: 100,
                populate: [],
                skip: 0,
                sort: {},
                structure: {},
                page: null
            }
        }).then(function (response)
        {
            if (module.active) {
                toastService.toast("success", 'Module ajouté update en cours, veuillez patientez !');
                $scope.toggleActive(module._id, module.name, true);
            } else {
                $scope.showModuleLoading = false;
                toastService.toast("success", 'Module ajouté ! Pour l\'utiliser, il suffit de l\'activer');
            }
            $scope.modules = response.data.datas;
        });
    };

    $scope.toggleActive = function (id, name, state)
    {
        $scope.showModuleLoading = true;
        $http.get(`/v2/modules/check?idModule=${id}&installation=${state}`).then((response) => {
            if (response.data.needUpgrade) {
                $scope.showModuleLoading = false;
                $modal.open({
                    backdrop: 'static',
                    templateUrl: 'app/modules/views/modal/choose-version.html',
                    controller: 'ModulesCheckVersionCtrl',
                    resolve: {
                        checkModule: () => {
                            return response.data;
                        },
                        changeModuleActive: () => {
                            return $scope.modules.find((elem) => elem._id === id);
                        },
                        restart: () => {
                            return $scope.restart;
                        }
                    }
                }).result.then((function(result) {
                    console.log(result);
                    $scope.showModuleLoading = true;
                    $http.post('/v2/modules/toggle', {
                        'idModule': id,
                        'active': state,
                        'toBeChanged': result.toBeChanged,
                        'toBeRemoved': response.data.toBeRemoved
                    }).then(function (response) {
                        $scope.showModuleLoading = false;
                        $scope.restart(name, state, false);
                    }).catch((err) => {
                        $scope.showModuleLoading = false;
                        if (err.data.datas && err.data.datas.missingDependencies && err.data.datas.needActivation) {
                            $scope.modules.find((elem) => elem._id === id).active = false;
                            toastService.toast("danger",
                                `${err.data.message}<br>
                                ${err.data.datas.missingDependencies.length > 0 ? `missing dependencies :<br>
                                <b>${err.data.datas.missingDependencies.map(elem => elem = ` - ${elem}`).join('<br>')}</b><br>` : ''}
                                ${err.data.datas.needActivation.length > 0 ? `need activation :<br>
                                <b>${err.data.datas.needActivation.map(elem => elem = ` - ${elem}`).join('<br>')}</b><br>` : ''}`
                            );
                        } else if (err.data.datas && err.data.datas.needDeactivation) {
                            $scope.modules.find((elem) => elem._id === id).active = true;
                            toastService.toast("danger",
                                `${err.data.message}<br>
                                ${err.data.datas.needDeactivation.length > 0 ? `need deactivation :<br>
                                <b>${err.data.datas.needDeactivation.map(elem => elem = ` - ${elem}`).join('<br>')}</b><br>` : ''}`
                            );
                        } else {
                            toastService.toast("danger", err.data.message);
                        }
                    });
                }), function() {

                });
            } else {
                for (const apiOrTheme of Object.keys(response.data.toBeChanged)) {
                    for (const [key, index] of Object.entries(response.data.toBeChanged[apiOrTheme])) {
                        response.data.toBeChanged[apiOrTheme][key] = response.data.toBeChanged[apiOrTheme][index[0]];
                    }
                    if (response.data.toBeRemoved && response.data.toBeRemoved[apiOrTheme]) {
                        for (const [key, index] of Object.entries(response.data.toBeRemoved[apiOrTheme])) {
                            response.data.toBeRemoved[apiOrTheme][key] = response.data.toBeRemoved[apiOrTheme][index[0]];
                        }
                    }
                }
                $http.post('/v2/modules/toggle', {
                    'idModule': id,
                    'active': state,
                    'toBeChanged': response.data.toBeChanged,
                    'toBeRemoved': response.data.toBeRemoved
                }).then(function (response) {
                    $scope.showModuleLoading = false;
                    $scope.restart(name, state, false);
                }).catch((err) => {
                    $scope.showModuleLoading = false;
                    if (err.data.datas && err.data.datas.missingDependencies && err.data.datas.needActivation) {
                        $scope.modules.find((elem) => elem._id === id).active = false;
                        toastService.toast("danger",
                            `${err.data.message}<br>
                            ${err.data.datas.missingDependencies.length > 0 ? `missing dependencies :<br>
                            <b>${err.data.datas.missingDependencies.map(elem => elem = ` - ${elem}`).join('<br>')}</b><br>` : ''}
                            ${err.data.datas.needActivation.length > 0 ? `need activation :<br>
                            <b>${err.data.datas.needActivation.map(elem => elem = ` - ${elem}`).join('<br>')}</b><br>` : ''}`
                        );
                    } else if (err.data.datas && err.data.datas.needDeactivation) {
                        $scope.modules.find((elem) => elem._id === id).active = true;
                        toastService.toast("danger",
                            `${err.data.message}<br>
                            ${err.data.datas.needDeactivation.length > 0 ? `need deactivation :<br>
                            <b>${err.data.datas.needDeactivation.map(elem => elem = ` - ${elem}`).join('<br>')}</b><br>` : ''}`
                        );
                    } else {
                        toastService.toast("danger", err.data.message);
                    }
                });
            }
        }).catch((err) => {
            $scope.showModuleLoading = false;
            console.error(err);
            toastService.toast("danger", err.message);
            $scope.modules.find((elem) => elem._id === id).active = false;
        });
    };

    $scope.remove = function (idModule, nameModule, state)
    {
        var check = window.confirm("Êtes-vous sur de vouloir supprimer ce module ?");
        if(check)
        {
            $scope.showModuleLoading = true;
            $http.delete('/v2/modules/' + idModule).then(function (response)
            {
                $scope.showModuleLoading = false;
                if(!response.status)
                {
                    console.error("Error!");
                }
                $scope.restart(nameModule, state, true);
                $http.post('/v2/modules', {
                    PostBody: {
                        filter: {},
                        limit: 100,
                        populate: [],
                        skip: 0,
                        sort: {},
                        structure: {},
                        page: null
                    }
                }).then(function (response) {
                    $scope.modules = response.data.datas;
                });
            });
        }
    };

    $scope.restart = function (nomModule, active, deleteBool)
    {
        $scope.config = ConfigV2.environment(function ()
        {
            $scope.showLoading = true;
            $scope.progressValue = 0;
            $http.get('/restart').catch((err) => {});
            if (active && !deleteBool) {
                $scope.message = "Activation du module " + nomModule + " en cours, merci de patienter ...";
            }
            else if (!active && !deleteBool) {
                $scope.message = "Désactivation du module " + nomModule + " en cours, merci de patienter ...";
            }
            else {
                $scope.message = "Suppression du module " + nomModule + " en cours, merci de patienter ...";
            }

            $interval(() => {
                $http.get('/serverIsUp').then(() => {
                    if ($scope.config.appUrl.slice(-1) != '/') {
                        $scope.config.appUrl += '/';
                    }
                    location.href=window.location = $scope.config.appUrl + $scope.config.adminPrefix;
                });
            }, 10000);
        });
    };

    $scope.uploadError = function () {
        $scope.getDatas();
        $scope.showModuleLoading = false;
        toastService.toast("danger", "Problème à l'ajout du module");
    }
}]);


ModulesControllers.controller("ModulesCheckVersionCtrl", [
    '$scope', '$http', 'toastService', '$modal', '$modalInstance', 'checkModule', 'changeModuleActive',
    function ($scope, $http, toastService, $modal, $modalInstance, checkModule, changeModuleActive)
{
    $scope.checkModule = checkModule;
    $scope.alreadyInstalled = Object.assign({}, checkModule.alreadyInstalled);

    $scope.save = function (form) {
        const choosedVersion = {
            api   : {},
            theme : {}
        };

        for (const apiOrTheme of Object.keys($scope.alreadyInstalled)) {
            Object.keys($scope.alreadyInstalled[apiOrTheme]).forEach((value) => {
                choosedVersion[apiOrTheme][value] = form[`${value}Version`].$modelValue;
            });
        }
        $modalInstance.close({
            'toBeChanged': choosedVersion,
            'toBeRemoved': checkModule.toBeRemoved
        });
    };

    $scope.close = function(isEditMode) {
        changeModuleActive.active = false;
        $modalInstance.close();
    };

    $scope.cancel = function (event) {
        event.preventDefault();
        changeModuleActive.active = false;
        $modalInstance.dismiss("cancel");
    };
}]);