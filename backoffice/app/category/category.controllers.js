var CategoryControllers = angular.module("aq.category.controllers", []);

CategoryControllers.controller("CategoryDetailCtrl", [
    "$scope", "$rootScope", "$http", "$q", "Category", "$route", "$location", "StaticV2", "ProductsV2", "ProductTri", "ProductSearch", "ProductPagination", "CategoryProducts", "toastService", "RulesV2", "CategoryGetAttributesUsedInFilters", "CategoryV2", "$modal","$translate", "$routeParams", "$location",
    function ($scope, $rootScope, $http, $q, Category, $route, $location, StaticV2, ProductsV2, ProductTri, ProductSearch, ProductPagination, CategoryProducts, toastService, RulesV2, CategoryGetAttributesUsedInFilters, CategoryV2, $modal, $translate, $routeParams, $location)
    {
        $scope.lang = $rootScope.languages.find(function (lang) {
            return lang.defaultLanguage;
        }).code;
        $scope.isEditMode = true;
        $scope.category = {};
        $scope.category._id = $routeParams.id;
        $scope.currentPage = 1;
        $scope.rule = {};
        $scope.usedInFilters = [];
        $scope.selectedAttributes;
        $scope.selectedFilters;
        $scope.searchObj = {
            productInCategory: ""
        };
        


        $scope.getCategory = function(id){
            CategoryV2.get({PostBody: {filter: {_id: id}, structure: '*'}}, function (response) {
                $scope.category = response;
            });
        }

        $scope.getCategory($scope.category._id);
        
        $scope.getImage = function (category) {
            if(category && category.img) {
                const nameImg = category.img.replace('medias/category/', '');
                return window.location.origin + "/images/category/max-80/" + category._id + "/" + nameImg;
            }
            return ;
        }



        $scope.return = function () {
            if ($scope.isSelected === true) {
                let response = confirm("La pièce jointe n'est pas sauvegardée, êtes vous sûr de vouloir continuer ?");
                if (!response) { return }
            }
            if ($scope.form.$dirty) {
                if (
                    confirm(
                        "Les modifications non sauvegardées seront perdues.\nEtes-vous sûr de vouloir quitter cette page ?"
                    )
                ) {
                    $location.path($scope.returnPath);
                }
            }
            else {
                $location.path($scope.returnPath);
            }
        };

        $scope.setEditCat = function(form) {
            if ($scope.nsUploadFiles.isSelected === true) {
                let response = confirm("La pièce jointe n'est pas sauvegardée, êtes vous sûr de vouloir continuer ?");
                if (!response) { return }
            }
            if (form.$dirty) {
                if (confirm("Les modifications non sauvegardées seront perdues.\nEtes-vous sûr de vouloir quitter cette page ?")){
                    debugger
                }
            }
        }

        var selectedLang = "";

        $scope.nsUploadFiles = {
            isSelected: false
        };

        $scope.langChange = function (lang) {
            selectedLang = lang;
        };

        StaticV2.list({ PostBody: { filter: {}, structure: '*', limit: 99 } }, function (staticsList) {
            $scope.pages = staticsList.datas;
            if ($scope.pages[0]) {
                $scope.pageSelelected = $scope.pages[0].translation[$scope.lang].slug;
            }
            $scope.group = staticsList.datas.getAndSortGroups()[0];
        });

        $scope.exist = function(item){
            if (item.translation && item.translation[$scope.lang] && item.translation[$scope.lang].slug){
                // the title is optionnal (when a staticPage is created, there is not title)
                return true;
            }
            return false;
        }
        $scope.getOptGroup = function(group){
            if(!group){
                group = $scope.group;
            }
            return group;
        }
        // On récupére les attributes disponibles dans les filtres automatique (attribute.usedInFilters = true)
        CategoryGetAttributesUsedInFilters.query({ PostBody: { limit: 99, filter: { "usedInFilters":true}}}, function (resp)
        {
            let response = resp.datas;
            for(var i = 0; i < response.length; i++)
            {
                response[i].id_attribut = response[i]._id;
            }
            $scope.usedInFilters = response;
            // Si l'attribut est déjà présent dans la category alors nous le supprimons de usedInFilters et nous ajoutons le code
            // a l'objet category.filters.attributes[i].code
            for(var i = 0; i < $scope.category.filters.attributes.length; i++)
            {
                // On recherche l'index de usedInFilters existant dans $scope.category.filters.attributes afin de le supprimer de usedInFilters
                var indexFound = $scope.usedInFilters.findIndex(function (filter)
                {
                    return filter.id_attribut === $scope.category.filters.attributes[i]._id;
                });
                if(indexFound !== -1)
                {
                    // On ajoute au category.filters.attributes le code afin qu'il soit visible dans la partie de droite des filtres
                    $scope.category.filters.attributes[i].code = $scope.usedInFilters[indexFound].code;
                    $scope.usedInFilters.splice(indexFound, 1);
                }
            }
        }, function (err)
        {
            console.error(err);
        });
        /*
         ** liste information upload image
         */
        // $scope.infoImage = {
        //     header: {
        //         checkUp: false,
        //         defaultUp: true,
        //         showProgressValue: false
        //     },
        //     thumbnail: {
        //         checkUp: false,
        //         defaultUp: true,
        //         showProgressValue: false
        //     }
        // };
        $scope.totalItems = 1;
        $scope.itemPerPage = 15;
        $scope.local = {
            sortType : "sortWeight", // On trie par poid du produit par defaut
            sortReverse : false
        }
        $scope.addCond = function ()
        {
            $scope.category.conditions.push({});
        };
        $scope.removeCond = function (index)
        {
            $scope.category.conditions.splice(index, 1);
        };

        /***** Multi-langues ********/
        $scope.changeLanguage = function (newLanguage)
        {

            angular.forEach(listOfJqueryElements, function (value)
            {
                value.css(
                    "display",
                    !newLanguage.defaultLanguage ? "none" : ""
                );
            });
        };
        /***** Fin multi-langues ********/

        $scope.pagination = {productInCategory: "true"};
        $scope.dateOptions = {
            "starting-day": 1
        };

        var initValues = {start: 0, limit: 15};
        $scope.getProducts = function ()
        {
            var params = {
                page: $scope.currentPage,
                limit: $scope.itemPerPage,
                categoryId: $scope.category._id,
                filter: {}
            };

            if($scope.pagination) {
                if(Object.keys($scope.searchObj).length > 0) {
                    const filterKeys = Object.keys($scope.searchObj);
                    const filterLength = filterKeys.length;
                    let newFilter = {};
                    for (var i = 0; i < filterLength; i++) {
                        if(filterKeys[i] == "translation"){
                            newFilter[`translation.${$scope.lang}.name`] = { $regex: $scope.searchObj.translation.name, $options: "i" };                          
                        } else if (filterKeys[i] == "active" || filterKeys[i] == "_visible"){
                            if($scope.searchObj[filterKeys[i]]){
                                newFilter[filterKeys[i]] = $scope.searchObj[filterKeys[i]] == "true" ? true : false;
                            }
                        } else if (filterKeys[i] == "price.ati.normal" || filterKeys[i] == "stock.qty"){
                            const index = filterKeys[i];
                            newFilter[index] = {};
                            if($scope.searchObj[index].$gte != null){
                                newFilter[index].$gte = $scope.searchObj[index].$gte;
                            }
                            if($scope.searchObj[index].$lt != null){
                                newFilter[index].$lt = $scope.searchObj[index].$lt;
                            }
                        } else if(filterKeys[i] == "productInCategory"){
                            // do nothing because it is notwith the API
                        }else {
                            if($scope.searchObj[filterKeys[i]] != ""){
                                newFilter[filterKeys[i]] = { $regex: $scope.searchObj[filterKeys[i]], $options: "i" };
                            }
                        }
                    }
                    params.filter = {...params.filter, ...newFilter};
                }
            }

            if($scope.local && $scope.local.sortType) {
                params.sortObj = {};
                if($scope.local.sortReverse === false) {
                    params.sortObj[$scope.local.sortType] = -1;
                } else {
                    params.sortObj[$scope.local.sortType] = 1;
                }
            }

            const paramsV2 = {
                lang: "fr",
                PostBody: {
                    filter: params.filter, // // TODO adminList - Category edit > Products list
                    structure: {
                        code: 1,
                        active: 1,
                        _visible: 1,
                        stock: 1
                    },
                    limit: $scope.itemPerPage,
                    page: $scope.currentPage,
                    sort: params.sortObj
                }
            };
            ProductsV2.list(paramsV2, function (res)
            {
                if(angular.isArray(res.datas))
                {
                    $scope.totalItems = res.count;
                    $scope.products = res.datas;

                    if($scope.category.productsList && $scope.category.productsList.length > 0)
                    {
                        for(var i = 0; i < $scope.products.length; i++)
                        {
                            var prd = $scope.category.productsList.find(function (item)
                            {
                                return item.id == $scope.products[i]._id;
                            });
                            if(prd)
                            {
                                $scope.products[i].sortWeight = prd.sortWeight;
                            }
                        }
                        // On trie les produits par sortWeight, si aucune sortWeight n'est présent alors ces produits seront en bas de page
                        $scope.products = $scope.products.sort(function (a, b)
                        {
                            let aSort, bSort;
                            if(typeof a.sortWeight === "undefined" || a.sortWeight === null) aSort = -1;
                            else aSort = a.sortWeight;
                            if(typeof b.sortWeight === "undefined" || b.sortWeight === null) bSort = -1;
                            else bSort = b.sortWeight;
                            return aSort - bSort;
                        }).reverse();
                    }

                    if($scope.category._id !== undefined)
                    {
                        for(var i = 0; i < res.datas.length; i++)
                        {
                            res.datas[i].check = $scope.category.productsList.findIndex(function (item)
                            {
                                return item.id == res.datas[i]._id;
                            }) != -1;
                        }

                    }
                }
                else
                {
                    $scope.products = null;
                }
            });
        };

        RulesV2.query({PostBody: {filter: {owner_id: $scope.category._id}, structure: '*'}}, function (rule)
        {
            if(rule.operand === undefined)
            {
                Object.assign($scope.rule, {
                    owner_id: $scope.category._id,
                    conditions: [],
                    other_rules: []
                });
            }
            else
            {
                $scope.rule = rule;
            }

            $scope.getProducts();
        });

        $scope.changePosition = function (id, pos)
        {
            // $scope.products = $scope.products.sort(function (a, b)
            // {
            //     return a.sortWeight - b.sortWeight;
            // }).reverse();
            var index = $scope.category.productsList.findIndex(function (prd)
            {
                return prd.id == id;
            });
            $scope.category.productsList[index].sortWeight = pos;
            CategoryV2.save($scope.category, function (res)
            {
                toastService.toast("success", "Position sauvegardée");

                if($scope.formMenu)
                {
                    $scope.formMenu.$setPristine();
                }
            });

            // CategoryProducts.move({id: $scope.category._id, productId: id, pos: pos}, function (result)
            // {
            //     if(result.message == "success")
            //     {
            //         $scope.getProducts();
            //     }
            //     else
            //     {
            //         assignProductsPos($scope.category._id);
            //     }
            // });
        };

        $scope.pageChanged = function (newPage)
        {
            $scope.currentPage = newPage;

            $scope.getProducts();
        };

        $scope.changeTri = function ()
        {
            ProductTri.search($scope.pagination, function (productsList)
            {
                $scope.products = productsList;
            });
        };

        $scope.search = function ()
        {
            $scope.pagination.minPrice = undefined;
            $scope.pagination.maxPrice = undefined;
            $scope.pagination.minQuantity = undefined;
            $scope.pagination.maxQuantity = undefined;
            $scope.pagination.typeProduit = 0;
            $scope.pagination.actif = 0;
            $scope.pagination.visible = 0;

            if($scope.pagination.query.length >= 2)
            {
                var currParams = {
                    start: initValues.start, limit: initValues.limit, q: $scope.pagination.query
                };
                if($scope.onlyWithoutMenu)
                {
                    currParams.requiredSlugMenus = true;
                }
                $scope.productCount = 0;
                $scope.scroller.busy = false;
                /*Product.searchCount({q: $rootScope.searchQuery}, function(productCount) {
                 $scope.productCount = productCount.count;
                 });*/
                ProductSearch.query(currParams, function (foundproducts)
                {
                    $scope.products = foundproducts;
                    $scope.scroller = {};
                    $scope.scroller.busy = false;
                    $scope.scroller.next = function ()
                    {
                        if($scope.scroller.busy)
                        {
                            return;
                        }
                        $scope.scroller.busy = true;
                        currParams.start = currParams.start + currParams.limit;
                        currParams.requiredSlugMenus = $scope.onlyWithoutMenu ? true : false;

                        ProductSearch.query(currParams, function (partialProducts)
                        {
                            if(partialProducts.length > 0)
                            {
                                $scope.products = $scope.products.concat(partialProducts);
                                $scope.scroller.busy = false;
                            }
                        });
                    };
                });
            }
            else
            {
                $scope.getProducts();
            }
        };

        // $scope.deleteImage = function (type)
        // {
        //     $scope.infoImage[type].ImageUrl = "";
        //     $scope.category[type + "Url"] = "";
        //     $scope.infoImage[type].checkUp = false;
        // };

        // $scope.onFileSelect = function ($files, type)
        // {
        //     if($files.length >= 1)
        //     {
        //         var reader = new FileReader();
        //         reader.readAsDataURL($files[0]);
        //         $scope.file = $files[0];
        //         $scope.defaultUp = false;
        //         $scope.showProgressValue = true;
        //         reader.onload = function (e)
        //         {
        //             $scope.$apply(function ()
        //             {
        //                 $scope.category[type + "Url"] = e.target.result;
        //                 $scope.infoImage[type].ImageUrl = e.target.result;
        //                 $scope.infoImage[type].file = $scope.file;
        //                 $scope.infoImage[type].showProgressValue = false;
        //                 $scope.infoImage[type].checkUp = true;
        //             });
        //         };
        //     }
        // };

        function saveCategory()
        {
            CategoryV2.save($scope.category, function (res)
            {
                CategoryV2.applyTranslatedAttribs({filter: {_id: res._id}})
                toastService.toast("success", "Catégorie sauvegardée");

                if($scope.formMenu)
                {
                    $scope.formMenu.$setPristine();
                }
            }, function (err) {
                if(err){
                    if(err.data){
                        toastService.toast("danger", err.data.message);
                    }else if(err.message){
                        toastService.toast("danger", err.message);
                    }
                }
            });
        }

        $scope.save = function (isQuit) {   
            if(this.formMenu.ruleForm.$invalid) {
                toastService.toast("danger", "Formulaire des regles incomplet");
                return;
            }
            if ($scope.rule.operand !== undefined) {
                RulesV2.save($scope.rule, function (response){
                        toastService.toast("success","Règle(s) sauvegardée(s)");
                        saveCategory();
                    }, function (err) {
                        toastService.toast("danger","Pas de règles créées");
                        saveCategory();
                    }
                );
            } else {
                saveCategory();
            }
            if(typeof isQuit !== "undefined" && isQuit){
                $scope.editCat = false;
                if (!$scope.$$phase) {
                    $scope.$apply();
                }
                //don't work
            }
        };

        $scope.removeMenu = function () {
            if(confirm("Etes-vous sûr de vouloir supprimer cette catégorie et tous ses enfants ?"))
            {
                CategoryV2.delete({ id: $scope.category._id }).$promise.then(
                    function ()
                    {
                        $location.path('/categories');
                    },
                    function (err) {
                        if(err){
                            if(err.data){
                                toastService.toast("danger", err.data.message);
                            }else if(err.message){
                                toastService.toast("danger", err.message);
                            }
                        }
                    }
                );
            }
        };

        $scope.goToProductDetails = function (productType, productSlug) {
            $location.path("/products/" + productType + "/" + productSlug);
        };

        $scope.checkProduct = function ($index)
        {
            var tab = $scope.category.productsList;

            if(!$scope.products[$index].check)
            {
                var index = tab.findIndex(function (item)
                {
                    return item.id === $scope.products[$index]._id;
                });
                if(index > -1)
                {
                    tab.splice(index, 1);
                }
            }
            else
            {
                tab.push({id: $scope.products[$index]._id, checked: true});
            }

            CategoryV2.save({_id: $scope.category._id, productsList: tab}, function ()
            {
                //assignProductsPos($scope.category._id);
            });
        };

        // function assignProductsPos(categoryId)
        // {
        //     CategoryProducts.getPos({action: "pp", id: categoryId}, function (_products)
        //     {
        //         for(var i = 0; i < $scope.products.length; i++)
        //         {
        //             $scope.products[i].pos = undefined;

        //             for(var j = 0; j < _products.length; j++)
        //             {
        //                 if($scope.products[i]._id == _products[j]._id)
        //                 {
        //                     $scope.products[i].pos = _products[j].pos;
        //                 }
        //             }
        //         }
        //     });
        // }

        /**
         *
         * @param {*} items liste d'item a deplacer
         * @param {*} isAdded true or false:  si true nous devons ajouter les items dans $scope.category.filters.attributes
         *            sinon nous devons ajouter les items a usedInFilters
         */
        $scope.moveItem = function (items, isAdded)
        {
            if(!items || !items.length)
            {
                return;
            }
            for(var i = 0; i < items.length; i++)
            {
                if(isAdded)
                {
                    // On copie l'objet dans category.filters.attributes pour le voir dans la partie de droite
                    $scope.category.filters.attributes.push(Object.assign({}, items[i]));
                    // On cherche l'index de l'objet venant d'être copié
                    var indexToRemove = $scope.usedInFilters.findIndex(function (element)
                    {
                        return element._id === items[i]._id;
                    });
                    // On supprime l'objet de usedInFilters pour ne plus le voir dans la partie de gauche
                    $scope.usedInFilters.splice(indexToRemove, 1);
                }
                else
                {
                    // On copie l'objet dans usedInFilters pour le voir dans la partie de gauche
                    $scope.usedInFilters.push(Object.assign({}, items[i]));
                    // On cherche l'index de l'objet venant d'être copié
                    var indexToRemove = $scope.category.filters.attributes.findIndex(function (element)
                    {
                        return element._id === items[i]._id;
                    });
                    // On supprime l'objet de usedInFilters pour ne plus le voir dans la partie de gauche
                    $scope.category.filters.attributes.splice(indexToRemove, 1);
                }
            }
        };

        $scope.moveAll = function (from, to)
        {
            angular.forEach(from, function (item)
            {
                to.push(item);
            });
            from.length = 0;
        };

    }
]);

CategoryControllers.controller("CategoryListCtrl", [
    "$scope", "$modal", "$q", "toastService","$translate","$modal", "CategoryV2", "$location",
    function ($scope, $modal, $q, toastService, $translate, $modal, CategoryV2, $location) {
        
        var selectedLang = "";
        

        $scope.expandAll = function(){
            for(let oneCat of $scope.categories){
                CategoryV2.list({PostBody: {filter: {_id: {$in: oneCat.children.map((child) => child._id)}}, populate: ["children"], sort: {displayOrder: 1}, limit: 99}}, function (response) {
                    oneCat.nodes = response.datas;
                    $scope.$broadcast('angular-ui-tree:expand-all');
                    for(let oneNode of oneCat.nodes){
                        CategoryV2.list({PostBody: {filter: {_id: {$in: oneNode.children.map((child) => child._id)}}, populate: ["children"], sort: {displayOrder: 1}, limit: 99}}, function (response) {
                            oneNode.nodes = response.datas;
                            $scope.$broadcast('angular-ui-tree:expand-all');
                        });
                    }
                });
            }
            //or use the $scope.listChildren()
        }
        getMenus();

        function getMenus()
        {
            CategoryV2.list({PostBody: {filter: {['ancestors.0']: {$exists: false}}, populate: ["children"], sort: {displayOrder: 1}, structure: '*', limit: 99}}, function (response)
            {
                $scope.categories = response.datas;
                //we expand all the categories
                $scope.expandAll();
            });
        }

        $scope.deleteImg = function() {
             $scope.category.img = null;
             $scope.category.alt = null;
            CategoryV2.save($scope.category, function (res) {
                toastService.toast("success", "Image supprimée ");
            });
        }


        $scope.close = function (cat) {
            toastService.toast("success", $translate.instant('gallery.item.updated'));
            $scope.getCategory(cat);
        };


        /*$scope.removeCategory = function(scope, cat) {
         Category.remove({id: cat._id}, function(){
         scope.remove();
         });
         };*/







        $scope.listChildren = function (cat, scope)
        {
            CategoryV2.list({PostBody: {filter: {_id: {$in: cat.children.map((child) => child._id)}}, populate: ["children"], sort: {displayOrder: 1}, limit: 99}}, function (response)
            {
                cat.nodes = response.datas;
                scope.toggle();
            });
        };

        $scope.langChange = function (lang)
        {
            selectedLang = lang;
        };

        $scope.addCategory = function (nodeParent) {
            var modalInstance = $modal.open({
                templateUrl: "app/category/views/modals/category-new.html",
                controller: "CategoryNewCtrl",
                resolve: {
                    parent: function () {
                            return nodeParent || null;
                    },
                    lang: function () {
                        return selectedLang;
                    }
                }
            });

            modalInstance.result.then(function (returnedValue) {
                getMenus();
            });
        };

        $scope.editCategory = function (cat) {
            $location.path(`/categories/${cat._id}`);
        };

        $scope.treeOptions = {
            accept : function (sourceNodeScope, destNodesScope, destIndex) {
                if(typeof destNodesScope.node == 'undefined') {
                    return false;
                }
                return true;
            },
            dropped: function (event) {

                var deferred = $q.defer();
                var promiseArray = [];

                const indexPlace = event.dest.index;
                let categoryToMove = event.source.nodeScope.$modelValue;
                let categorySource = event.source.nodesScope.$nodeScope !== null ? event.source.nodesScope.$nodeScope.$modelValue : false;
                let categoryDest = event.dest.nodesScope.$nodeScope !== null ? event.dest.nodesScope.$nodeScope.$modelValue : false;

                if(categorySource != false){
                    //we change children of parent
                    //we check if already
                    const childrenIndex = categorySource.children.findIndex((element) => {
                        if(element._id == categoryToMove._id){
                            return element
                        }
                    });
                    debugger
                    if (childrenIndex > -1) {
                        categorySource.children.splice(childrenIndex, 1);
                    }
                    //we save
                    promiseArray.push(CategoryV2.save(categorySource).$promise);
                }
                //we add the element
                if(categoryDest != false){
                    if(!categoryDest.children){
                        categoryDest.children = [];
                    }
                    categoryDest.children.splice(indexPlace, 0, categoryToMove);
                    //we save
                    promiseArray.push(CategoryV2.save(categoryDest).$promise);
                }
                if(!categoryToMove.ancestors){
                    categoryToMove.ancestors = []
                }
                if(categoryToMove.ancestors.length > 0){
                    // we remove the ancestors
                    const ancestorIndex = categoryToMove.ancestors.findIndex((element) => {
                            if(element._id == categorySource._id){
                                return element
                            }
                        });
                    if (ancestorIndex > -1) {
                        categoryToMove.ancestors.splice(ancestorIndex, 1);
                    }
                }
                // we add the new ancestors
                if(categoryDest != false){
                    categoryToMove.ancestors.push(categoryDest._id);
                }
                //we save
                promiseArray.push(CategoryV2.save(categoryToMove).$promise);
                
                
                Promise.all(promiseArray).then(function () {
                    deferred.resolve();
                    $scope.$broadcast('angular-ui-tree:expand-all');
                }, function (err) {
                    toastService.toast("danger", "Une erreur est survenue lors du déplacement de la catégorie.");
                    deferred.reject();
                });

                return deferred.promise;
            }
        };

        function getId(child) {
            if(typeof child === 'object') {
                return child._id;
            } else {
                return child;
            }
        }
    }
]);

CategoryControllers.controller("CategoryNewCtrl", [
    "$scope", "$modalInstance", "CategoryV2", "parent", "lang", "toastService",
    function ($scope, $modalInstance, CategoryV2, parent, lang, toastService) {
        const id_parent = parent ? [parent._id] : [];
        $scope.lang = lang;
        $scope.category = {
            ancestors: id_parent,
            translation: {
                [lang]: {}
            }
        };

        $scope.save = function (category) {
            CategoryV2.save(category, function (rep) {
                if(id_parent.length > 0){
                    parent.children.push(rep);
                    parent.nodes.push(rep);
                    CategoryV2.save(parent, function (rep) {
                        //we added a children to the parents
                        $modalInstance.close(rep);
                    }, function(err) {
                        if(err.data.code === "Conflict"){
                            toastService.toast("danger", err.data.message + " : code already exists");
                        }else{
                            toastService.toast("danger", err.data.message);
                        }
                    });
                }else{
                    $modalInstance.close(rep);
                }
            }, function(err) {
                if(err.data.code === "Conflict"){
                    toastService.toast("danger", err.data.message + " : code already exists");
                }else{
                    toastService.toast("danger", err.data.message);
                }
            });
        };

        $scope.cancel = function () {
            $modalInstance.dismiss("cancel");
        };
    }
]);
