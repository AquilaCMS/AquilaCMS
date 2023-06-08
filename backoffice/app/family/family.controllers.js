const FamilyControllers = angular.module('aq.family.controllers', []);

FamilyControllers.controller('FamilyEditCtrl', ['$scope', '$modalInstance', '$filter', '$http', '$q', 'FamilyV2', 'item',
    function ($scope, $modalInstance, $filter, $http, $q, FamilyV2, item)     {
        $scope.family = item;
        let parentsList = [];

        FamilyV2.list({PostBody: {filter: {}, structure: '*', limit: 0}}, function ({datas}) {
            $scope.parents = $scope.getParentsList(item.type);

            $scope.showParents = function () {
                const selected = $filter('filter')($scope.parents, {_id: $scope.family.parent});
                return ($scope.family.parent && selected.length) ? selected[0].name : 'Not set';
            };
            parentsList = datas
        });

        $scope.getParentsList = function (type) {
            let parentType = "";
            switch (type) {
            case "universe":
                parentType = null;
                break;
            case "family":
                parentType = "universe";
                break;
            case "subfamily":
                parentType = "family";
                break;
            }
            return $filter('filter')(parentsList, {type: parentType});
        };

        $scope.typeList = [{value: 'universe', text: 'Univers'}, {value: 'family', text: 'Famille'}, {
            value : 'subfamily', text  : 'Sous-famille'
        }];

        $scope.updateFamily = function (data, field) {
            const d = $q.defer();
            FamilyV2.save({_id: $scope.family._id, [field]: data, code: $scope.family.code}, function (fam) {
                fam = fam || {};
                if (fam.status === true) {
                    d.resolve();
                } else {
                    d.resolve(fam.msg);
                }
            }, function (e) {
                d.reject('Server error!');
            });
            return d.promise;
        };

        $scope.ok = function () {
            $modalInstance.close();
        };

        $scope.cancel = function () {
            $modalInstance.dismiss('cancel');
        };
    }]);

FamilyControllers.controller('FamilyListCtrl', ['$scope', '$modal', '$filter', '$http', '$q', 'FamilyV2', 'CategoryV2', 'childrenfamily','$translate',
    function ($scope, $modal, $filter, $http, $q, FamilyV2, CategoryV2, childrenfamily, $translate)     {
        $scope.universes = [];

        FamilyV2.list({PostBody: {filter: {type: 'universe'}, sort: {order: 1}, structure: '*', limit: 0}}, function({datas}) {
            $scope.universes = datas
        });

        $scope.sortableUniverses = {
            update: (e, ui) => $scope.updateOrder(e, ui, $scope.universes)
        }
        $scope.sortableFamilies = {
            update: (e, ui) => $scope.updateOrder(e, ui, $scope.families)
        }
        $scope.sortableSubFamilies = {
            update: (e, ui) => $scope.updateOrder(e, ui, $scope.subFamilies)
        }

        $scope.updateOrder = function (e, ui, list) {
            if(ui.item.sortable.dropindex === ui.item.sortable.index) return;
            if(ui.item.sortable.dropindex > ui.item.sortable.index) {
                list[ui.item.sortable.index].order = ui.item.sortable.dropindex
                $scope.saveFamily(list[ui.item.sortable.index] )
                for(let i = ui.item.sortable.index + 1; i <= ui.item.sortable.dropindex; i++) {
                    list[i].order = i - 1;
                    $scope.saveFamily(list[i] )
                }
            } else {
                list[ui.item.sortable.index].order = ui.item.sortable.dropindex
                $scope.saveFamily(list[ui.item.sortable.index] )
                for(let i = ui.item.sortable.dropindex; i < ui.item.sortable.index; i++) {
                    list[i].order = i + 1;
                    $scope.saveFamily(list[i] )
                }
            }
        }

        $scope.saveFamily = async function (family) {
            await FamilyV2.save({_id: family._id, order: family.order, code: family.code})
        }

        $scope.selectedUniverse = "";
        $scope.selectedFamily = "";

        $scope.currUniverseId = "";
        $scope.currUniverseSlugs = [];

        $scope.setCurrUniverse = function (pId, pSmenus) {
            $scope.currUniverseId = pId;
            $scope.currUniverseSlugs = pSmenus;
        };

        $scope.updateListMenu = function (listDest, type, origine) {
            const newSlug = $scope.selectedMenu[origine];

            if (newSlug != null) {
                const newListId = $filter('filter')($scope.allMenus, {slug: newSlug}, true)[0]._id;
                $scope[listDest] = $filter('filter')($scope.allMenus, {type, parent: newListId});
            } else {
                $scope[listDest] = [];
            }
        };

        $scope.updateFamilyMenu = function (data, action) {
            const d = $q.defer();
            $http.post('/families/menu', {
                _id   : $scope.currUniverseId, value : data, action
            }).success(function (res) {
                res = res || {};
                if (res.status === true) { // {status: "ok"}
                    d.resolve();
                } else { // {status: "error", msg: "..."}
                    d.resolve(res.msg);
                }
            }).error(function (e) {
                d.reject('Server error!');
            });
            return d.promise;
        };

        $scope.addMenuSlug = function () {
            let menuToAdd = "";
            if ($scope.selectedMenu.submenu != "") {
                menuToAdd = $scope.selectedMenu.submenu;
            } else if ($scope.selectedMenu.menu != "") {
                menuToAdd = $scope.selectedMenu.menu;
            } else if ($scope.selectedMenu.category != "") {
                menuToAdd = $scope.selectedMenu.category;
            }
            const slugExist = $filter('filter')($scope.currUniverseSlugs, menuToAdd);
            if (slugExist.length == 0) {
                $scope.currUniverseSlugs.push(menuToAdd);
                $scope.updateFamilyMenu(menuToAdd, "add");
            //
            }
        };

        $scope.removeMenuSlug = function (slug) {
            const slugIndex = $scope.currUniverseSlugs.indexOf(slug);
            if (slugIndex > -1) {
                $scope.currUniverseSlugs.splice(slugIndex, 1);
                $scope.updateFamilyMenu(slug, "remove");
            }
        };

        CategoryV2.list({PostBody: {filter: {origine: 'admin'}, limit: 0}}, function (response) {
            $scope.allMenus = response.datas;
            $scope.categoryList = $filter('filter')($scope.allMenus, {type: "category"});
            $scope.menuList = [];
            $scope.submenuList = [];
        });

        $scope.selectedMenu = {
            category : "", menu     : "", submenu  : ""
        };

        function updateMenu() {
            FamilyV2.list({PostBody: {filter: {type:'universe'}, sort: {order: 1}, limit: 0, structure: '*'}}, function({datas}) {
                $scope.universes = datas
                if ($scope.selectedUniverse) {
                    FamilyV2.list({ PostBody: { filter: { parent: $scope.selectedUniverse}, sort: {order: 1}, limit: 0, structure: '*' }}, function (result) {
                        $scope.families = result.datas?.sort((a, b) => a.order - b.order);
                        if ($scope.selectedFamily) {
                            FamilyV2.list({ PostBody: { filter: { parent: $scope.selectedFamily }, sort: {order: 1}, limit: 0, structure: '*' } }, function (result) {
                                $scope.subFamilies = result.datas?.sort((a, b) => a.order - b.order);
                            });
                        }
                    });
                }
            });
        }

        $scope.newFamilies = function (type, id) {
            if(type === 'family'){
                if ($scope.selectedUniverse != id) {
                    $scope.updateFromUnivers(id)
                }
            }else if(type === 'subfamily'){
                if ($scope.selectedFamily != id) {
                    $scope.updateFromFamily(id)
                }
            }
            const modalInstance = $modal.open({
                templateUrl : 'app/family/views/family-new.html',
                controller  : 'FamilyNewCtrl',
                resolve     : {
                    familyType() {
                        return type;
                    },
                    parent() {
                        return type == "family" ? $scope.selectedUniverse : $scope.selectedFamily;
                    }
                }
            });


            modalInstance.result.then(function () {
                updateMenu();
            }, function () {
                console.log(`Modal dismissed at: ${new Date()}`);
            });
        };

        $scope.editFamilies = function (idFamilies, type) {
            const modalInstance = $modal.open({
                templateUrl : 'app/family/views/modals/family-edit.html',
                controller  : 'FamilyEditCtrl',
                resolve     : {
                    item() {
                        switch (type) {
                            case 'universe':
                                return $filter('filter')($scope.universes, {_id: idFamilies})[0];
                            case 'family':
                                return $filter('filter')($scope.families, {_id: idFamilies})[0];
                            case 'subFamily':
                                return $filter('filter')($scope.subFamilies, {_id: idFamilies})[0];                        
                            default:
                                break;
                        }
                    }
                }
            });

            modalInstance.result.then(function () {
                updateMenu();
            }, function () {
                console.log(`Modal dismissed at: ${new Date()}`);
            });
        };
        $scope.updateFromUnivers = function (idUniverse) {
            if($scope.selectedUniverse != idUniverse){
                $scope.selectedFamilies = "";
                $scope.selectedUniverse = idUniverse;
                $scope.families = [];
    
                FamilyV2.query({PostBody: {filter: {_id: idUniverse}, limit: 0, populate:'children'}}, function (result) {
                    $scope.families = result.children?.sort((a, b) => a.order - b.order);
                });
            }else{
                $scope.selectedUniverse = 0;
            }
 
        };
        $scope.updateFromFamily = function (idCategoryV2) {
            if($scope.selectedFamily != idCategoryV2){
                $scope.selectedFamily = idCategoryV2;
                $scope.subFamilies = [];
                FamilyV2.list({ PostBody: { filter: { _id: idCategoryV2 }, limit: 0, populate: 'children'}}, function (result) {
                    if(result.datas[0] != undefined){
                        $scope.subFamilies = result.datas[0].children?.sort((a, b) => a.order - b.order);
                    }
                });
            }else{
                $scope.selectedFamily = 0;
            }
        };

        $scope.updateFromSubFamily = function (idCategoryV2) {
            $scope.selectedSubFamily = idCategoryV2;
        };

        $scope.removeFamily = function (familyId) {
            if (confirm($translate.instant("confirm.deleteFamily"))) {
                FamilyV2.delete({id: familyId, type: 'family'}, function () {
                    updateMenu();
                });
            }
        };
    }]);

FamilyControllers.controller('FamilyNewCtrl', ['$scope', '$location', '$filter', '$modalInstance', 'FamilyV2', 'familyType', 'parent','toastService','$translate',
    function ($scope, $location, $filter, $modalInstance, FamilyV2, familyType, parent,toastService, $translate)     {
        // $scope.parents = Family.query();
        let parentsList = []

        const fakeTypes = [{name: 'Univers', code: 'universe'}, {name: 'Famille', code: 'family'}, {
            name : 'Sous-famille', code : 'subfamily'
        }];

        $scope.typeName = $filter('filter')(fakeTypes, {code: familyType})[0].name;

        $scope.master = {
            name   : '', code   : '', type   : familyType, types  : fakeTypes, parent : parent != "" ? parent : null
        };

        FamilyV2.list({PostBody: {filter: {}, structure: '*', limit: 0}}, function ({datas}) {
            $scope.parents = $scope.getParentsList(familyType);
            parentsList = datas
        });

        $scope.getParentsList = function (type) {
            let parentType = "";
            switch (type) {
            case "universe":
                parentType = null;
                break;
            case "family":
                parentType = "universe";
                break;
            case "subfamily":
                parentType = "family";
                break;
            }
            return $filter('filter')(parentsList, {type: parentType});
        };

        $scope.reset = function () {
            $scope.family = angular.copy($scope.master);
        };

        $scope.save = function (data) {
            data.id_parent = data.parent;
            FamilyV2.save(data, function (fam) {
                if (fam && fam._id) {
                    $modalInstance.close();
                } else {
                    console.error("Error!");
                }
            }, function (error) {
                if(error.data){
                    if(error.data.message && error.data.message != ""){
                        toastService.toast("danger",  error.data.message);
                    }
                }else if(error && error.code != ""){
                    toastService.toast("danger", error.code);
                }else{
                    toastService.toast("danger", $translate.instant("global.error"));
                }
            });
        };

        $scope.ok = function () {
            $modalInstance.close();
        };

        $scope.cancel = function () {
            $modalInstance.dismiss('cancel');
        };

        $scope.reset();
    }]);

FamilyControllers.controller('FamilyDetailCtrl', ['$scope', '$filter', '$http', '$q', '$routeParams', 'FamilyV2',
    function ($scope, $filter, $http, $q, $routeParams, FamilyV2)     {
        $scope.family = FamilyV2.query({PostBody: {filter: {_id: $routeParams.familyId}, structure: '*'}});

        $scope.typeList = [{value: 'universe', text: 'Univers'}, {value: 'family', text: 'Famille'}, {
            value : 'subfamily', text  : 'Sous-famille'
        }];

        $scope.showTypes = function () {
            const selected = $filter('filter')($scope.typeList, {value: $scope.family.type});
            return ($scope.family.type && selected.length) ? selected[0].text : 'Not set';
        };

        // $scope.parents = Family.query();
        $scope.parents = [];
        $scope.family.parentName = "";

        $scope.loadParents = function () {
            return $scope.parents.length ? null : FamilyV2.list({PostBody: {filter: {}, structure: '*', limit: 0}}, function ({datas}) {
                $scope.parents = datas;
                const selected = $filter('filter')($scope.parents, {_id: $scope.family.parent});
                $scope.family.parentName = selected.length ? selected[0].name : null;
            });
        };

        $scope.$watch('family.parent', function (newVal, oldVal) {
            if (newVal !== oldVal) {
                const selected = $filter('filter')($scope.parents, {_id: $scope.family.parent});
                $scope.family.parentName = selected.length ? selected[0].name : null;
            }
        });

        $scope.loadParents();

        $scope.updateName = function (data) {
            const d = $q.defer();
            FamilyV2.save({_id: $scope.family._id, name: data}, function (fam) {
                fam = fam || {};
                if (fam.status === true) {
                    d.resolve();
                } else {
                    d.resolve(fam.msg);
                }
            }, function (e) {
                d.reject('Server error!');
            });
            return d.promise;
        };

        $scope.updateType = function (data) {
            const d = $q.defer();
            FamilyV2.save({_id: $scope.family._id, type: data}, function (fam) {
                fam = fam || {};
                if (fam.status === true) {
                    d.resolve();
                } else {
                    d.resolve(fam.msg);
                }
            }, function (e) {
                d.reject('Server error!');
            });
            return d.promise;
        };

        $scope.updateParent = function (data) {
            const d = $q.defer();
            FamilyV2.save({_id: $scope.family._id, parent: data}, function (fam) {
                fam = fam || {};
                if (fam.status === true) { // {status: "ok"}
                    d.resolve();
                } else { // {status: "error", msg: "Username should be `awesome`!"}
                    d.resolve(fam.msg);
                }
            }, function (e) {
                d.reject('Server error!');
            });
            return d.promise;
        };
    }]);