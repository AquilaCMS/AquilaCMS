var JobControllers = angular.module('aq.job.controllers', []);

/**
 * Controller de la page contenant la liste des Jobs
 */
JobControllers.controller('JobListCtrl', ['$scope', '$rootScope', '$location', 'JobGetAll',
    function ($scope,$rootScope, $location, JobGetAll) {
        $scope.lang = $rootScope.adminLang;
        $scope.isEditMode = true;
        $scope.detail = function (job) {
            $location.url(`/jobs/${job._id}`);
        };
        $scope.getSchedule = function () {
            JobGetAll.query(function (jobs) {
                $scope.activeJobs = jobs;
            });
        };

        $scope.getSchedule();
    }]);


/**
 * Controller de la page contenant le detail d'un Job
 */
    JobControllers.controller('JobDetailCtrl', ['$scope', '$rootScope','$sce', '$q', '$routeParams', '$location', 'JobPlay', 'JobPlayImmediate', 'JobPause', 'toastService', 'JobSave', 'JobUpdate', 'JobRemove', 'JobGetById', '$translate',
    function ($scope, $rootScope, $sce, $q, $routeParams, $location, JobPlay, JobPlayImmediate, JobPause, toastService, JobSave, JobUpdate, JobRemove, JobGetById, $translate) {

        const editDisabledJobs = ['Jobs checks']

        $scope.lang = $rootScope.adminLang;
        $scope.runImmediate = true;
        if ($routeParams.jobId != 'new') {
            $scope.isEditMode = true;
        } else {
            //Mode création
            $scope.isEditMode = false;
        }
        $scope.job = {
            data: {
                method: "get",
                flag: "user",
                params: "",
                onMainThread: true,
                isImportant: false
            }
        };
        $scope.handleChangeType = function () {
            if(['get','post','ftp'].includes($scope.job.data.method)) {
                $scope.job.data.onMainThread = true;
            }
        }
        $scope.trustHtml = function(){
            return $sce.trustAsHtml($scope.job.data.lastExecutionResult);
        }
        $scope.JobGetById = function () {
            JobGetById.query({ _id: $routeParams.jobId }, function (job) {
                $scope.job = job;
                checkFailReason();
            }, function(error){
                console.log(error);
                toastService.toast("danger", $translate.instant("global.standardError"));
            });
        };
        $scope.playImmediate = function (_id) {
            if ($scope.runImmediate == false) return;
            JobPlayImmediate.play({ _id }, function () {
                $scope.JobGetById();
                toastService.toast("success", $translate.instant("job.detail.cronSuccess"));
                $scope.runImmediate = true;
            }, function(err){
                $scope.JobGetById();
                console.error(err);
                if(err.data) {
                    if(err.data.message) {
                        toastService.toast("danger", err.data.message);
                    } else if(err.data.code) {
                        toastService.toast("danger", err.data.code);
                    }
                } else {
                    toastService.toast("danger", $translate.instant("job.detail.errorUnknown"));
                }
                $scope.runImmediate = true;
            });
            $scope.runImmediate = false;
        };
        $scope.play = function (_id) {
            JobPlay.play({ _id }, function () {
                $scope.JobGetById();
            }, function(error) {
                console.error(error);
                if(error.data) {
                    if(error.data.message) {
                        toastService.toast("danger", error.data.message);
                    } else if(error.data.code) {
                        toastService.toast("danger", error.data.code);
                    }
                } else {
                    toastService.toast("danger", $translate.instant("job.detail.errorUnknown"));
                }
            });
        };

        $scope.pause = function (_id) {
            JobPause.pause({ _id }, function () {
                $scope.JobGetById();
            }, function(error) {
                console.error(error);
                if(error.data) {
                    if(error.data.message) {
                        toastService.toast("danger", error.data.message);
                    } else if(error.data.code) {
                        toastService.toast("danger", error.data.code);
                    }
                } else {
                    toastService.toast("danger", $translate.instant("job.detail.errorUnknown"));
                }
            });
        };
        //On récupére le document uniquement si nous sommes en mode edit
        if ($scope.isEditMode) {
            $scope.JobGetById();
        }

        //Ajout ou update d'un job
        $scope.save = function (isQuit) {
            $scope.form.nsSubmitted = true;
            if ($scope.form.$invalid) {
                toastService.toast("danger", $translate.instant("job.detail.infoInvalid"));
                return;
            }
            var deferred = $q.defer();
            if ($scope.isEditMode) {
                JobUpdate.update($scope.job, function (response) {
                    if (response.msg) {
                        deferred.reject({ message: 'Impossible de mettre à jour la tache planifiée' });
                    } else {
                        deferred.resolve(response);
                    }
                }, function (err) {
                    deferred.reject(err);
                });
            } else {
                JobSave.save($scope.job, function (response) {
                    deferred.resolve(response);
                }, function (err) {
                    deferred.reject(err);
                });
            }
            deferred.promise.then(function (response) {
                if (isQuit) {
                    $location.path("/jobs");
                } else {
                    $scope.job = response;
                    checkFailReason();
                    toastService.toast("success", $translate.instant("job.detail.cronSaved"));
                    $location.path("/jobs/" + response._id);
                }
            }, function (err) {
                if (err) toastService.toast("danger", err);
                else toastService.toast("danger", err);
            });
        };

        function checkFailReason() {
            if(typeof $scope.job.failReason !== "undefined" && $scope.job.failReason != ""){
                toastService.toast("warning", `${$translate.instant("job.detail.errFailReason")} "${$scope.job.failReason}"`);
            }
        }

        //Suppression d'un job
        $scope.remove = function (_id) {
            if (confirm($translate.instant("confirm.deleteCron"))) {
                if ($scope.job.data.flag == "system") {
                    return toastService.toast("danger", $translate.instant("job.detail.errorDeleteCron"));
                }
                JobRemove.remove({ _id }, function () {
                    toastService.toast("success", $translate.instant("job.detail.cronDelete"));
                    $location.path("/jobs");
                });
            }
        };

        $scope.isJobEditable = function() {
            return !editDisabledJobs.includes($scope.job.name);
        }

    }]);
