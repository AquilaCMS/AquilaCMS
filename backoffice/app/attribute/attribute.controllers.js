const AttributeControllers = angular.module("aq.attribute.controllers", []);

AttributeControllers.controller("AttributeListCtrl", [
    "$scope", "$rootScope", "$location", "LanguagesApi", 'AttributesV2',
    function ($scope, $rootScope,  $location, LanguagesApi, AttributesV2) {
        $scope._type = window.location.hash.indexOf('users') > -1 ? 'users' : 'products';
        $scope.local = {search: ""};
        $scope.filter = {};
        function init() {
            $scope.sortType = "name"; // set the default sort type
            $scope.sortReverse = false;  // set the default sort order
        }

        init();

        $scope.getAttributesClassed = function() {
            let filter = {};
            const filterKeys = Object.keys($scope.filter);
            for (let i = 0, leni = filterKeys.length; i < leni; i++) {
                if($scope.filter[filterKeys[i]] === null){
                    break;
                }
                if(filterKeys[i].includes("type")) {
                    if($scope.filter.type != ""){
                        filter["type"] = $scope.filter.type;
                    }
                } else if(filterKeys[i].includes("name")) {
                    if($scope.filter.name != ""){
                        filter["translation.fr.name"] = { $regex: $scope.filter.name, $options: "i" };;
                    }
                } else {
                    if (typeof ($scope.filter[filterKeys[i]]) === 'object'){
                        filter[filterKeys[i] + ".number"] = { $regex: $scope.filter[filterKeys[i]].number, $options: "i" };
                    }else{
                        if($scope.filter[filterKeys[i]].toString() != ""){
                            filter[filterKeys[i]] = { $regex: $scope.filter[filterKeys[i]].toString(), $options: "i" };
                        }
                    }
                }
            }
            filter["_type"] = $scope._type;
            filter["set_attributes"] = {$gt: []};
            let PostBody = {
                filter,
                structure: '*',
                populate : 'set_attributes',
                limit    : 99
            }
            if($scope.local.search) {
                PostBody.filter[`translation.${$scope.adminLang}.name`] = {$regex: $scope.local.search, $options: 'i'}
            }
            AttributesV2.list({
                PostBody
            }, function (attributesList) {
                $scope.attributesClassed = attributesList.datas;
            }, function(error){
                //deal with error here
            });
        }

        function getAttributesOrphans() {
            // recuperation des attributs n'appartenant a aucun set
            AttributesV2.list({PostBody: {filter: {'set_attributes.0': {$exists: false}, _type: $scope._type}, limit: 99, structure: '*'}}, function ({datas}) {
                $scope.attributesOrphans = datas;
            });
        }

        $scope.defaultLang = $rootScope.languages.find(function (lang) {
            return lang.defaultLanguage;
        }).code;

        $scope.getAttributesClassed();
        getAttributesOrphans();

        $scope.goToAttributeDetails = function (attributeCode) {
            $location.path(`/${$scope._type}/attributes/${attributeCode}`);
        };
    }
]);

AttributeControllers.controller("AttributeDetailCtrl", [
    "$scope", "$rootScope", "$location", "$routeParams", "AttributesV2", "SetAttributesV2", "toastService", "AttributesFields", "$translate",
    function ($scope, $rootScope, $location, $routeParams, AttributesV2, SetAttributesV2, toastService, AttributesFields, $translate) {
        $scope.fields = AttributesFields;
        $scope.local = {valuesList: []};
        $scope.selectedSet = "";
        $scope.isEditMode = true;
        $scope.backUrl = {};
        $scope._type = window.location.hash.indexOf('users') > -1 ? 'users' : 'products';

        $scope.getBackUrl = function(type){
            if ($routeParams.code){
                return type + "/setAttributes/" + $routeParams.code;
            }
            return type + "/attributes/";
        }

        if ($routeParams.jeuAttributeCode){
            $scope.backUrl = "setAttributes/" + $routeParams.jeuAttributeCode;
        }else{
            $scope.backUrl = "attributes"
        } 

        $scope.lang = $rootScope.languages.find(function (lang) {
            return lang.defaultLanguage;
        }).code;

        if ($scope.langChange) {
            $scope.langChange($scope.lang);
        }

        $scope.langChange = function (lang) {
            $scope.lang = lang;
            $scope.generateInputs();
        };

        $scope.generateInputs = function () {
            if ($scope.attribute && $scope.attribute.translation && $scope.attribute.translation[$scope.lang] && $scope.attribute.translation[$scope.lang].values) {
                /* if(!Array.isArray($scope.attribute.translation[$scope.lang].values)) {
                        let array = []
                        for(var k = 0; k < Object.keys($scope.attribute.translation[$scope.lang].values).length; k++) {
                            array.push($scope.attribute.translation[$scope.lang].values[Object.keys($scope.attribute.translation[$scope.lang].values)[k]])
                        }
                        $scope.attribute.translation[$scope.lang].values = array;
                    } */
                const valuesList = [];
                for (let i = 0; i < $scope.attribute.translation[$scope.lang].values.length; i++) {
                    valuesList.push(i);
                }
                $scope.local.valuesList = valuesList;
            } else {
                $scope.local.valuesList = [];
            }
        };

        $scope.getAttr = function () {
            $scope.attribute = AttributesV2.query({PostBody: {filter: {code: $routeParams.attributeCode, _type: $scope._type}, structure: '*'}}, function (obj) {
                if (obj.code === undefined) {
                    toastService.toast("danger", $translate.instant("attribute.detail.attributeNotExist"));
                    $location.path(`/${$scope._type}/attributes`);
                }

                if (!angular.isDefined($scope.attribute.code)) {
                    $scope.attribute.code = "";
                }
                $scope.generateInputs();

                $scope.attribute.multiAttributes = $scope.attribute.set_attributes;
            });
        };


        if ($routeParams.attributeCode === "new" || $routeParams.attributeCode === undefined) {
            $scope.isEditMode = false;
            $scope.attribute = {
                values         : [], set_attributes : [], position       : 1, param          : "Non", usedInRules    : true, usedInFilters  : false
            };

            if ($routeParams.code) {
                $scope.oneSetAttr = true;
                SetAttributesV2.query({PostBody: {filter: {code: $routeParams.code, type: $scope._type}}}, function (setAttr) {
                    $scope.attribute.set_attributes.push(setAttr._id);
                    $scope.selectedSet = setAttr._id;
                    $scope.setName = setAttr.name;
                });
            }
        } else {
            $scope.getAttr();
        }

        SetAttributesV2.list({PostBody: {filter: {type: $scope._type}, structure: '*', limit: 99}}, function ({datas}) {
            $scope.setAttributes = datas;
            if($scope.isEditMode === false){
                datas.forEach(element => {
                    if ($scope._type === 'users') {
                        if (element.code === 'defautUser') {
                            $scope.attribute.set_attributes.push(element._id);
                        }
                    }
                    if ($scope._type === 'products') {
                        if (element.code === 'defaut') {
                            $scope.attribute.set_attributes.push(element._id);
                        }
                    }
                });
            }
        });

        $scope.addValue = function () {
            $scope.local.valuesList.push($scope.local.valuesList.length);
            if ($scope.attribute.translation === undefined) {
                $scope.attribute.translation = {};
            }
            if ($scope.attribute.translation[$scope.lang] === undefined) {
                $scope.attribute.translation[$scope.lang] = {};
            }
            if ($scope.attribute.translation[$scope.lang].values === undefined) {
                $scope.attribute.translation[$scope.lang].values = [];
            }
            $scope.attribute.translation[$scope.lang].values.push("");
        };

        $scope.removeValue = function (index) {
            $scope.local.valuesList.splice($scope.local.valuesList.length - 1, 1);
            $scope.attribute.translation[$scope.lang].values.splice(index, 1);
        };

        $scope.save = function (data, isQuit) {
            $scope.valuesError = "";
            var i = 0;
            while ($scope.valuesError == "" && $scope.attribute.translation[$scope.lang].values && i < $scope.attribute.translation[$scope.lang].values.length) {
                let count = 0;
                let j = 0;
                while ($scope.valuesError == "" && j < $scope.attribute.translation[$scope.lang].values.length) {
                    if ($scope.attribute.translation[$scope.lang].values[i] == $scope.attribute.translation[$scope.lang].values[j]) {
                        count++;
                    }

                    if (count > 1) {
                        $scope.valuesError = "Il y a des valeurs en double dans la liste !";
                    }

                    j++;
                }

                i++;
            }

            if ($scope.valuesError == "") {
                if ($scope.isEditMode) {
                    data.multiModifAdd = [];
                    data.multiModifRemove = [];
                    if ($scope.attribute.set_attributes.length >= $scope.attribute.multiAttributes.length) {
                        var i = 0;
                        while (i < $scope.attribute.set_attributes.length) {
                            if ($scope.attribute.multiAttributes.indexOf($scope.attribute.set_attributes[i]) == -1) {
                                data.multiModifAdd.push($scope.attribute.set_attributes[i]);
                            }

                            i++;
                        }
                    }
                    if ($scope.attribute.multiAttributes.length >= $scope.attribute.set_attributes.length) {
                        var i = 0;
                        while (i < $scope.attribute.multiAttributes.length) {
                            if ($scope.attribute.set_attributes.indexOf($scope.attribute.multiAttributes[i]) == -1) {
                                data.multiModifRemove.push($scope.attribute.multiAttributes[i]);
                            }

                            i++;
                        }
                    }
                }

                data.update = true;
                data._type = $scope._type;
                 AttributesV2.save(data, function (res) {
                    if (res._id) {
                        toastService.toast("success", $translate.instant("attribute.detail.saveDone"));
                        if (isQuit) {
                            if($routeParams.code) {
                                return $location.path(`/${$scope._type}/setAttributes/${$routeParams.code}`);
                            } else {
                                return $location.path(`/${$scope._type}/attributes`); 
                            }                           
                        }
                        if($routeParams.attributeCode === "new") {
                            return $location.path(`/${$scope._type}/attributes/${res.code}`);
                        }
                    } else {
                        toastService.toast("danger", $translate.instant("attribute.detail.errorOccurred"));
                        console.error(res);
                    }
                }, function(error){
                    if(error.data){
                        if(error.data.message && error.data.message != ""){
                            toastService.toast("danger",  error.data.message);
                        }
                    }else if(error && error.code != ""){
                        toastService.toast("danger", error.code);
                    }else{
                        toastService.toast("danger", $translate.instant("attribute.detail.error"));
                    }
                });
            }
        };

        $scope.removeAttribute = function (attr) {
            if (confirm("Etes-vous sûr de vouloir supprimer cet attribut ?")) {
                AttributesV2.delete({id: attr._id}, function () {
                    toastService.toast("success", $translate.instant("attribute.detail.deleteAttribute"));
                    $location.path(`/${$scope._type}/attributes`);
                }, function (err) {
                    toastService.toast("danger", err.data);
                });
            }
        };
    }
]);