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
                sort      : {active:-1,name:1},
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
            idModule: id,
            installation: state
        }, function(response) {
            if (response.needUpgrade) {
                $scope.showModuleLoading = false;
                $modal.open({
                    backdrop    : 'static',
                    templateUrl : 'app/modules/views/modal/choose-version.html',
                    controller  : 'ModulesCheckVersionCtrl',
                    resolve     : {
                        checkModule : () => {
                            return response;
                        },
                        changeModuleActive : () => {
                            return $scope.modules.find((elem) => elem._id === id);
                        },
                        restart : () => {
                            return $scope.restart;
                        }
                    }
                }).result.then((function (result) {
                    $scope.showModuleLoading = true;
                    ModuleServiceV2.toggle({
                        idModule    : id,
                        active      : state,
                        toBeChanged : result.toBeChanged,
                        toBeRemoved : response.toBeRemoved
                    }, function (response) {
                        $scope.showModuleLoading = false;
                        $scope.restart(name, state, false);
                    }, function (err) {
                        $scope.showModuleLoading = false;
                        if(err) {
                            if (err.datas && err.datas.missingDependencies && err.datas.needActivation) {
                                $scope.modules.find((elem) => elem._id === id).active = false;
                                let messageToast = "";
                                if(err.message){
                                    messageToast += `${err.message}<br/>`;
                                }
                                if(err.datas.missingDependencies.length > 0){
                                    const missingDependencies = err.datas.missingDependencies.map((elem) => elem = ` - ${elem}`).join('<br>');
                                    messageToast += `missing dependencies :<br/><b>${missingDependencies}</b><br/>`;
                                }
                                if(err.datas.needActivation.length > 0){
                                    const needActivation = err.datas.needActivation.map((elem) => elem = ` - ${elem}`).join('<br/>');
                                    messageToast += `need activation :<br/><b>${needActivation}</b><br/>`;
                                }
                                toastService.toast('danger', messageToast);
                            } else if (err.datas && err.needDeactivation) {
                                $scope.modules.find((elem) => elem._id === id).active = true;
                                let messageToast = "";
                                if(err.message){
                                    messageToast += `${err.message}<br/>`;
                                }
                                if(err.datas.needDeactivation.length > 0 ){
                                    const needDeactivation = err.datas.needDeactivation.map((elem) => elem = ` - ${elem}`).join('<br/>')
                                    messageToast += `need deactivation :<br/><b>${needDeactivation}</b><br/>`;
                                }
                                toastService.toast('danger', messageToast);
                            } else if (err.message) {
                                toastService.toast('danger', err.message);
                            } else {
                                console.error(err);
                                toastService.toast('danger', 'Unknown error');
                            }
                        }else{
                            console.error(err);
                            // no toast because maybe it's the timeout
                        }
                    });
                }));
            } else {
                for (const apiOrTheme of Object.keys(response.toBeChanged)) {
                    for (const [key, index] of Object.entries(response.toBeChanged[apiOrTheme])) {
                        response.toBeChanged[apiOrTheme][key] = Array.isArray(index) ? index[0] : index;
                    }
                }
                ModuleServiceV2.toggle({
                    idModule    : id,
                    active      : state,
                    toBeChanged : response.toBeChanged,
                    toBeRemoved : response.toBeRemoved
                }, function (response) {
                    $scope.showModuleLoading = false;
                    $scope.restart(name, state, false);
                }, function (err) {
                    $scope.showModuleLoading = false;
                    if(err) {
                        if (err.datas && err.datas.missingDependencies && err.datas.needActivation) {
                            let messageToast = "";
                            if(err.message){
                                messageToast += `${err.message}<br/>`;
                            }
                            if(err.datas.missingDependencies.length > 0){
                                const missingDependencies = err.datas.missingDependencies.map((elem) => elem = ` - ${elem}`).join('<br>');
                                messageToast += `missing dependencies :<br/><b>${missingDependencies}</b><br/>`;
                            }
                            if(err.datas.needActivation.length > 0){
                                const needActivation = err.datas.needActivation.map((elem) => elem = ` - ${elem}`).join('<br/>');
                                messageToast += `need activation : <br/><b>${needActivation}</b><br/>`;
                            }
                            toastService.toast('danger', messageToast);
                        } else if (err.datas && err.datas.needDeactivation) {
                            let messageToast = "";
                            if(err.message){
                                messageToast += `${err.message}<br/>`;
                            }
                            if(err.datas.needDeactivation.length > 0){
                                const needDeactivation = err.datas.needDeactivation.map((elem) => elem = ` - ${elem}`).join('<br>');
                                messageToast += `need deactivation :<br><b>${needDeactivation}</b><br>`;
                            }
                            toastService.toast('danger', messageToast);
                        } else if(err.message) {
                            toastService.toast('danger', err.message);
                        }
                        if (err.datas && err.datas.modules) {
                            $scope.modules = err.datas.modules;
                        }
                    }else{
                        console.error(err);
                        // no toast because maybe it's the timeout
                    }
                });
            }
        }, function(err) {
            $scope.showModuleLoading = false;
            console.error(err);
            toastService.toast('danger', err.message);
            $scope.modules.find((elem) => elem._id === id).active = false;
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

ModulesControllers.controller('ModulesCheckVersionCtrl', [
    '$scope', '$http', 'toastService', '$modal', '$modalInstance', 'checkModule', 'changeModuleActive',
    function ($scope, $http, toastService, $modal, $modalInstance, checkModule, changeModuleActive) {
        $scope.checkModule              = checkModule;
        $scope.alreadyInstalledPackages = angular.copy(checkModule.alreadyInstalled);

        $scope.save = function (form) {
            const choosedVersion = {
                api   : {},
                theme : {}
            };

            for (const apiOrTheme of Object.keys($scope.alreadyInstalledPackages)) {
                for (const value of Object.keys($scope.alreadyInstalledPackages[apiOrTheme])) {
                    if (form[`${value}Version`]) {
                        choosedVersion[apiOrTheme][value] = form[`${value}Version`].$modelValue;
                    }
                }
            }
            $modalInstance.close({
                toBeChanged : choosedVersion,
                toBeRemoved : checkModule.toBeRemoved
            });
        };

        $scope.close = function (isEditMode) {
            changeModuleActive.active = false;
            $modalInstance.close();
        };

        $scope.cancel = function (event) {
            event.preventDefault();
            changeModuleActive.active = false;
            $modalInstance.dismiss('cancel');
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
