const PictoControllers = angular.module('aq.picto.controllers', []);

PictoControllers.controller('PictoListCtrl', [
    '$scope',
    'PictoApi',
    '$location',
    function ($scope, PictoApi, $location) {
        $scope.pictos = [];
        $scope.filter = {};
        $scope.getPicto = function(){
            let filter = {};
            const filterKeys = Object.keys($scope.filter);
            for (let i = 0, leni = filterKeys.length; i < leni; i++) {
                if($scope.filter[filterKeys[i]] === null){
                    break;
                }
                if($scope.filter[filterKeys[i]].toString() != ""){
                    filter[filterKeys[i]] = { $regex: $scope.filter[filterKeys[i]].toString(), $options: "i" };
                }
            }
            PictoApi.list({PostBody: {filter, limit: 20}}, function (response) {
                $scope.pictos = response.datas;
            });
        }

        $scope.getPicto();

        $scope.detailsPicto = function (_id) {
            $location.url(`/picto/${_id}`);
        };
    }
]);
PictoControllers.controller('PictoDetailsCtrl', [
    '$scope',
    'PictoApi',
    '$routeParams',
    'toastService',
    'RulesV2',
    '$modal',
    '$location',
    function (
        $scope,
        PictoApi,
        $routeParams,
        toastService,
        RulesV2,
        $modal,
        $location
    ) {
        $scope.picto = {};
        $scope.isEditMode = true;
        $scope.rule = {};
        $scope.nsUploadFiles = {
            isSelected: false
        };
        PictoApi.query(
            {PostBody: {filter: {_id: $routeParams.id}, limit: 1}},
            function (response) {
                $scope.picto = response.datas[0];
            },
            function (err) {
                $location.url('/picto');
            }
        );
        $scope.moreButtons = [
            {
                text: 'picto.details.pictorisation',
                onClick: function () {
                    PictoApi.update({id : $scope.picto._id}, function(response){
                        toastService.toast('success', 'Pictorisation : done');
                    });
                },
                icon: '<i class="fa fa-picture-o" aria-hidden="true"></i>',
            }
        ]
        RulesV2.query({PostBody: {filter: {owner_id: $routeParams.id}, structure: '*'}}, function (rule) {
            if (rule.operand === undefined) {
                Object.assign($scope.rule, {
                    owner_id    : $routeParams.id,
                    conditions  : [],
                    other_rules : []
                });
            } else {
                $scope.rule = rule;
            }
        });

        $scope.openDelete = function () {
            $modal.open({
                template : "<div style='text-align: center; padding: 20px;'>"
                    + "    <h2>Supprimer le pictogramme ?</h2>"
                    + "    <p>Etes vous sûr de vouloir supprimer ce pictogramme ? Les regles associée seront supprimées.</p>"
                    + "    <div class='row'>"
                    + "        <button type='button' class='btn btn-danger' ng-click='cancel()'>Non</button>"
                    + "        <button type='button' class='btn btn-info' ng-click='removePicto(picto)'>Oui</button>"
                    + "    </div>"
                    + "</div>", // loads the template
                scope       : $scope,
                backdrop    : true, // setting backdrop allows us to close the modal window on clicking outside the modal window
                windowClass : 'modal', // windowClass - additional CSS class(es) to be added to a modal window template
                controller: 'PictoModalCtrl',
                resolve: {
                    picto: function () {
                        return $scope.picto;
                    }
                }
            });
        };

        /**
         *
         * @param {bool} back - Retourner a la liste des picto ou des regles apres la sauvegarde
         */
        $scope.save = function (back) {
            if ($scope.nsUploadFiles.isSelected) {
                let response = confirm("La pièce jointe n'est pas sauvegardée, êtes vous sûr de vouloir continuer ?");
                if (!response) { return }
            }
            if (this.form.ruleForm.$invalid) {
                toastService.toast('danger', 'Formulaire des regles incomplet');
                return;
            }
            if (this.form.$invalid) {
                toastService.toast(
                    'danger',
                    'Formulaire du pictogramme incomplet'
                );
                return;
            }
            PictoApi.save({id: $scope.picto._id}, $scope.picto, function (response) {
                if(response.status === 400) {
                    toastService.toast('danger', response.translations[$scope.adminLang]);
                } else {
                    toastService.toast('success', 'Sauvegarde effectuée, lancez la tâche planifiée "Segmentation picto"');
                    if (back) {
                        $location.url('/picto');
                    }
                }
            });
            if ($scope.rule.operand !== undefined) {
                RulesV2.save(
                    $scope.rule,
                    function (response) {
                        toastService.toast(
                            'success',
                            'Règle(s) sauvegardée(s)'
                        );
                    },
                    function (err) {
                        toastService.toast(
                            'danger',
                            'Echec de sauvegarde des règles'
                        );
                    }
                );
            }
        };

        $scope.getImage = function(picto) {
            return `/images/picto/200x180-70/${picto._id}/${picto.filename}`;
        }
    }
]);
PictoControllers.controller('PictoNewCtrl', [
    '$scope',
    'PictoApi',
    '$routeParams',
    'toastService',
    'RuleApi',
    '$location',
    function ($scope, PictoApi, $routeParams, toastService, RuleApi, $location) {
        $scope.picto = {
            location : 'TOP_LEFT',
            enabled  : false,
            code     : '',
            title    : '',
            filename : ''
        };
        $scope.rule = {
            owner_id    : $routeParams.id,
            conditions  : [{}],
            other_rules : []
        };

        $scope.save = function (back) {
            if ($scope.picto === undefined || $scope.picto.code === "" || $scope.picto.title === "") {
                toastService.toast(
                    "danger",
                    "Formulaire du pictogramme incomplet"
                );
                return;
            }

            PictoApi.save({}, $scope.picto, function (response) {
                toastService.toast('success', 'Enregistrement effectué');
                if (back) {
                    $location.url('/picto');
                } else {
                    $location.url(`/picto/${response._id}`);
                }
            });
        };
    }
]);


PictoControllers.controller('PictoModalCtrl', ['$scope', '$modalInstance', 'PictoApi', '$location', function ($scope, $modalInstance, PictoApi, $location) {        

        $scope.pictos = [];
        PictoApi.list({ PostBody: { limit: 20 } }, function (response) {
            $scope.pictos = response.datas;
        });

        $scope.removePicto = function (picto) {
            PictoApi.delete({ id: picto._id }, picto, function (response) {
                $scope.pictos.splice($scope.pictos.indexOf(picto), 1);
                $location.url('/picto');
                $modalInstance.close();
            });
        };
        $scope.cancel = function() {
            $modalInstance.close();
        }
    }
]);
