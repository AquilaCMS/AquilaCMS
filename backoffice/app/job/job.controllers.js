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
JobControllers.controller('JobDetailCtrl', ['$scope', '$rootScope','$sce', '$q', '$routeParams', '$location', 'JobPlay', 'JobPlayImmediate', 'JobPause', 'toastService', 'JobSave', 'JobUpdate', 'JobRemove', 'JobGetById', "$translate",
    function ($scope, $rootScope, $sce, $q, $routeParams, $location, JobPlay, JobPlayImmediate, JobPause, toastService, JobSave, JobUpdate, JobRemove, JobGetById, $translate) {
        $scope.lang = $rootScope.adminLang;
        $scope.test = 1;
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
                params: ""
            }
        };
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
                toastService.toast("success", "Tâche planifiée exécutée avec succès");
                $scope.runImmediate = true;
            }, function(err){
                $scope.JobGetById();
                if(err.data && err.data.code) return toastService.toast("danger", err.data.message);
                $scope.runImmediate = true;
                return toastService.toast("danger", "Une erreur inconnue s'est produite");
            });
            $scope.runImmediate = false;
        };
        $scope.play = function (_id) {
            JobPlay.play({ _id }, function () {
                $scope.JobGetById();
            });
        };

        $scope.pause = function (_id) {
            JobPause.pause({ _id }, function () {
                $scope.JobGetById();
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
                toastService.toast("danger", "Les informations saisies ne sont pas valides.");
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
                    toastService.toast("success", 'Tâche planifiée sauvegardée !');
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
            if (confirm("Êtes-vous sûr de vouloir supprimer cette tâche planifiée ?")) {
                if ($scope.job.data.flag == "system") {
                    return toastService.toast("danger", 'Impossible de supprimer une Tâche planifiée système');
                }
                JobRemove.remove({ _id }, function () {
                    toastService.toast("success", 'Tâche planifiée supprimée');
                    $location.path("/jobs");
                });
            }
        };

    }]);
