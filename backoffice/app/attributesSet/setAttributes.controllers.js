var SetAttributesControllers = angular.module("aq.setAttributes.controllers", []);

SetAttributesControllers.controller("SetAttributesListCtrl", [
    "$scope", "$location", "SetAttributesV2", function ($scope, $location, SetAttributesV2) {

        $scope.type = window.location.hash.indexOf('users') > -1 ? 'users' : 'products';

        function init() {
            $scope.sortType = "name"; // set the default sort type
            $scope.sortReverse = false;  // set the default sort order
        }

        init();

        function getSetAttributes() {
            SetAttributesV2.list({PostBody: {filter: {type: $scope.type}, limit: 0, structure: '*'}}, function ({datas}) {
                $scope.setAttributes = datas;
            });
        }

        getSetAttributes();

        $scope.goToSetAttributesDetails = function (setAttributesCode) {
            $location.path(`/${$scope.type}/setAttributes/${setAttributesCode}`);
        };

    }
]);

SetAttributesControllers.controller("SetAttributesNewCtrl", [
    "$scope", "$location", "SetAttributesV2", "toastService","$translate", function ($scope, $location, SetAttributesV2, toastService, $translate) {
        $scope.setAttribute = {};

        $scope.type = window.location.hash.indexOf('users') > -1 ? 'users' : 'products';

        $scope.save = function (data, isQuit) {
            isQuit = true; //Juste le temps de faire le save avec les ns-buttons
            data["update"] = false;
            data.type = $scope.type
            SetAttributesV2.save(data, function (msg) {
                if(msg.status)
                {
                    toastService.toast("success", $translate.instant("setAttribute.new.saveDone"));
                    if(isQuit)
                    {
                        $location.path(`/${$scope.type}/setAttributes`);
                    }
                }
                else
                {
                    console.error("Error!");
                }
            }, function(error){
                if(error.data){
                    if(error.data.message && error.data.message != ""){
                        toastService.toast("danger",  error.data.message);
                    }
                }else if(error && error.code != ""){
                    toastService.toast("danger", error.code);
                }else{
                    toastService.toast("danger", $translate.instant("setAttribute.new.error"));
                }
            });
        };

    }
]);

SetAttributesControllers.controller("SetAttributesDetailCtrl", [
    "$scope", "$location", "$routeParams", "SetAttributesV2", "toastService", "$rootScope", "$translate",
    function ($scope, $location, $routeParams, SetAttributesV2, toastService, $rootScope, $translate) {

        $scope.type = window.location.hash.indexOf('users') > -1 ? 'users' : 'products';

        $scope.setAttribute = SetAttributesV2.query({PostBody: {filter: {code: $routeParams.setAttributeCode, type: $scope.type}, structure: '*', populate: ["attributes"]}}, function (obj) {
            $scope.tabActive = "setAttributes";
            if(obj.code === undefined)
            {
                toastService.toast("warning", $translate.instant("setAttribute.detail.attributNotExist"));
                $location.path(`/${$scope.type}/setAttributes`);
            }
            if(!angular.isDefined($scope.setAttribute.code))
            {
                $scope.setAttribute.code = "";
            }

            function init() {
                $scope.sortType = "name"; // set the default sort type
                $scope.sortReverse = false;  // set the default sort order
            }

            init();
            /**
             * Permet de changer d'onglet et d'afficher le bon contenu
             * @param {*} tabActive
             */
            $scope.changeTab = function(tabActive){
                $scope.tabActive = tabActive;
            };
            // Ajoute un objet gift
            $scope.addQuestion = function(){
                $scope.setAttribute.questions.push({
                    translation:{
                        [$scope.lang]: {question:""}
                    }
                });
            };
            /**
             * Supprime l'objet gift dont l'index est passé en parametre
             * @param {*} i
             */
            $scope.removeQuestion = function(i){
                $scope.setAttribute.questions.splice(i, 1);
            };
            function getAttributes() {
                $scope.att = [];
                for(var i = 0; i < $scope.setAttribute.attributes.length; i++)
                {
                    $scope.att.push({
                        name: $scope.setAttribute.attributes[i].name,
                        code: $scope.setAttribute.attributes[i].code,
                        type: $scope.setAttribute.attributes[i].type,
                        param: $scope.setAttribute.attributes[i].param,
                        translation: $scope.setAttribute.attributes[i].translation
                    });
                }
            }

            $scope.defaultLang = $rootScope.languages.find(function (lang) {
                return lang.defaultLanguage;
            }).code;

            getAttributes();
        });

        $scope.langChange = function (lang)
        {
            $scope.lang = lang;
        };

        $scope.save = function (data, isQuit) {
            data["update"] = true;
            data.type = $scope.type;
            SetAttributesV2.save(data, function (msg) {
                if(msg.status)
                {
                    toastService.toast("success", $translate.instant("setAttribute.detail.saveDone"));
                    if(isQuit)
                    {
                        $location.path(`/${$scope.type}/setAttributes`);
                    }
                }
                else
                {
                    console.error("Error!");
                }
            });
        };

        $scope.remove = function (_id) {
            if (confirm($translate.instant("confirm.removeSetAttribute")))
            {
                SetAttributesV2.delete({id: _id}, function () {
                    $location.path(`/${$scope.type}/setAttributes`);
                }, function (err) {
                    toastService.toast("danger", err.data.message);
                });
            }
        };

        $scope.goToAttributeDetails = function (attributeCode,jeuAttributeCode) {
            window.location.hash = `/${$scope.type}/attributes/${attributeCode}?jeuAttributeCode=${jeuAttributeCode}`;
        };
    }
]);
