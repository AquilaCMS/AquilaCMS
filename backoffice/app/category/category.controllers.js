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
            productInCategory: "true" // default value
        };

        $scope.getCategory = function(id){
            CategoryV2.get({PostBody: {filter: {_id: id}, structure: '*'}}, function (response) {
                $scope.category = response;
            });
        }

        $scope.getImage = function (category) {
            if(category && category.img) {
                const nameImg = category.img.replace('medias/category/', '');
                return window.location.origin + "/images/category/max-80/" + category._id + "/" + nameImg;
            }
            return ;
        }

        $scope.deleteImg = function () {
            $scope.category.img = null;
            $scope.category.alt = null;
            CategoryV2.save($scope.category, function (res) {
                toastService.toast("success", $translate.instant("category.list.pictureDelete"));
            });
        }

        $scope.close = function (cat) {
            toastService.toast("success", $translate.instant('gallery.item.updated'));
            $scope.getCategory(cat);
        };

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
        function getAttrib(){
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
                if($scope.category.filters && $scope.category.filters.attributes){
                    const attributesLength = $scope.category.filters.attributes.length;
                    for(var i = 0; i < attributesLength; i++) {
                        // On recherche l'index de usedInFilters existant dans $scope.category.filters.attributes afin de le supprimer de usedInFilters
                        var indexFound = $scope.usedInFilters.findIndex(function (filter) {
                            return filter.id_attribut === $scope.category.filters.attributes[i]._id;
                        });
                        if(indexFound !== -1)
                        {
                            // On ajoute au category.filters.attributes le code afin qu'il soit visible dans la partie de droite des filtres
                            $scope.category.filters.attributes[i].code = $scope.usedInFilters[indexFound].code;
                            $scope.usedInFilters.splice(indexFound, 1);
                        }
                    }
                }
            }, function (err) {
                console.error(err);
            });
        }
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
            sortType : "code", // On trie par code, le sortWeight n'existe pas dans products
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
        /***** Fin multi-langues ********/

        $scope.pagination = {productInCategory: "true"};
        $scope.dateOptions = {
            "starting-day": 1
        };

        var initValues = {start: 0, limit: 15};
        $scope.getProducts = function () {
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
            if(paramsV2.PostBody.filter && paramsV2.PostBody.filter._id) {
                delete paramsV2.PostBody.filter._id;
            }
            let arrayListOfProducts;
            if($scope.category && $scope.category.productsList){
                arrayListOfProducts = $scope.category.productsList.map(function(element) {
                    if(typeof element.id === "string"){
                        return element.id;
                    }else{
                        return element.id.id || element.id._id; // product bundle doesn't have id :(
                    }
                });
            }
            if($scope.searchObj.productInCategory == "true"){
                if(arrayListOfProducts && arrayListOfProducts.length > 0){
                    paramsV2.PostBody.filter = {
                        _id: {$in: arrayListOfProducts}, 
                        ...paramsV2.PostBody.filter
                    };
                    paramsV2.PostBody.limit = arrayListOfProducts.length;
                    delete paramsV2.PostBody.page;
                }
            }else{
                paramsV2.PostBody.filter = {_id: {$nin: arrayListOfProducts}, ...paramsV2.PostBody.filter};
            }

            ProductsV2.list(paramsV2, function (res) {
                if(angular.isArray(res.datas)) {
                    $scope.totalItems = res.count;
                    $scope.products = res.datas;

                    if($scope.category.productsList && $scope.category.productsList.length > 0) {
                        for(var i = 0; i < $scope.products.length; i++) {
                            var prd = $scope.category.productsList.find(function (item) {
                                let idOfItem;
                                if(typeof item.id === "string"){
                                    idOfItem = item.id;
                                }else{
                                    idOfItem = item.id.id || item.id._id; // product bundle doesn't have id :(
                                }
                                return idOfItem == $scope.products[i]._id;
                            });
                            if(prd) {
                                $scope.products[i].sortWeight = prd.sortWeight;
                                $scope.products[i].checked = true;
                            }
                        }
                        $scope.products = filterProducts($scope.products); // filter product by "sortWeight" and "checked" 
                        if($scope.searchObj.productInCategory == "true"){
                            // we only take 15 products, with the correct page (index sort)
                            $scope.products = $scope.products.filter(function(value, index) {
                                const page = $scope.currentPage;
                                const indexMin = (page-1)*15;
                                const indexMax = page*15;
                                if(indexMin <= index && index <= indexMax) {
                                    return true;
                                }

                            });
                        }
                    }
                } else {
                    $scope.products = null;
                }
            });
        };

        function filterProducts(products) {
            return products.sort(function (a, b) {
                // two non checked or two checked, we use the sort
                let aSort = (typeof a.sortWeight === "undefined" || a.sortWeight === null) ? -1 : a.sortWeight;
                let bSort = (typeof b.sortWeight === "undefined" || b.sortWeight === null) ? -1 : b.sortWeight;
                let aChecked = (typeof a.checked === "undefined" || a.checked === null) ? -1 : 1;
                let bChecked = (typeof b.checked === "undefined" || b.checked === null) ? -1 : 1;
                if(aChecked === bChecked){
                    if(aSort == bSort){
                        return 0;
                    }if(aSort < bSort){
                        return -1;
                    }else{
                        return 1;
                    }
                }else if(aChecked < bChecked){
                    return -1;
                }else{
                    return 1;
                }
            }).reverse();
        }

        function init(){
            CategoryV2.get({PostBody: {filter: {_id: $scope.category._id}, structure: '*', populate: ["productsList.id"]}}, function (response) {
                $scope.category = response;
                if($scope.category && $scope.category.productsList){
                    if($scope.category.productsList.length > 0){
                        $scope.products = $scope.category.productsList.map((element) => {
                            return {
                                checked: true,
                                sortWeight: element.sortWeight || 0,
                                ...element.id
                            }
                        })
                        $scope.totalItems = $scope.category.productsList.length;
                        $scope.products = filterProducts($scope.products);
                        $scope.products = $scope.products.filter(function(value, index){
                            return index < 14; // it the first page
                        });
                    }else{
                        // no products in this cat, so we need to change the setup
                        $scope.searchObj.productInCategory == "false";
                        $scope.getProducts();
                    }
                }else{
                    // no products in this cat, so we need to change the setup
                    $scope.searchObj.productInCategory == "false";
                    $scope.getProducts();
                }
            });
        }
        init();
        getAttrib();

        RulesV2.query({PostBody: {filter: {owner_id: $scope.category._id}, structure: '*'}}, function (rule) {
            if(rule.operand === undefined) {
                Object.assign($scope.rule, {
                    owner_id: $scope.category._id,
                    conditions: [],
                    other_rules: []
                });
            } else {
                $scope.rule = rule;
            }
        }, function(error){
            console.error(error);
        });

        $scope.changePosition = function (id, pos) {
            const index = $scope.category.productsList.findIndex(function (prd) {
                return prd.id._id == id;
            });
            if(index == -1){
                // the prodcuts isn't in productsList, so we need to add it to
                if(typeof $scope.category.productsList === "undefined" || $scope.category.productsList == null){
                    $scope.category.productsList = [];
                }
                $scope.category.productsList.push({
                    checked: false,
                    id: {_id: id},
                    sortWeight: pos
                });
            }else{
                $scope.category.productsList[index].sortWeight = pos;
            }
            // we re-build the correct array
            const newCat = angular.copy($scope.category);
            for(let oneProduct of newCat.productsList){
                oneProduct.id = oneProduct.id._id;
            }
            CategoryV2.save(newCat, function (res) {
                toastService.toast("success", $translate.instant("category.detail.positionSaved"));
                if($scope.formMenu) {
                    $scope.formMenu.$setPristine();
                }
            });
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

        $scope.search = function () {
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

        function saveCategory() {
            // we re-build the correct array
            const newCat = angular.copy($scope.category);
            for(let oneProduct of newCat.productsList){
                oneProduct.id = oneProduct.id._id;
            }
            CategoryV2.save(newCat, function (res) {
                CategoryV2.applyTranslatedAttribs({filter: {_id: res._id}})
                toastService.toast("success", $translate.instant("category.detail.categorySaved"));

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
            if(this.formMenu && this.formMenu.ruleForm && this.formMenu.ruleForm.$invalid) {
                toastService.toast("danger", $translate.instant("category.detail.incompleteRules"));
                return;
            }
            if ($scope.rule.operand !== undefined) {
                RulesV2.save($scope.rule, function (response){
                        toastService.toast("success",$translate.instant("category.detail.ruleSaved"));
                        saveCategory();
                    }, function (err) {
                        toastService.toast("danger", $translate.instant("category.detail.noNewRule"));
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

        $scope.checkProduct = function (id, checked) {
            var index = $scope.category.productsList.findIndex(function (item) {
                return item.id._id === id;
            });
            if(index == -1) {
                if(checked == true || typeof checked === "undefined"){
                    // not in the list
                    $scope.category.productsList.push({
                        id: {_id: id},
                        sortWeight: 0,
                        checked: true
                    });
                }
            }else{
                if(checked == true || typeof checked === "undefined"){
                    $scope.category.productsList[index].checked = true;
                }else{
                    $scope.category.productsList.splice(index, 1);
                }
            }
            // we re-build the correct array
            const newCat = angular.copy($scope.category);
            for(let oneProduct of newCat.productsList){
                oneProduct.id = oneProduct.id._id;
            }
            CategoryV2.save({
                _id: newCat._id,
                productsList: newCat.productsList
            }, function (response) {

            });
        };

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

        const structure = {
            _id: 1,
            children: 1,
            ancestor: 1,
            active: 1,
            code: 1,
            nodes: 1,
            translation: 1,
            displayOrder: 1
        };

        $scope.expandOneCat = function(oneCat){
            if(typeof oneCat.children === "undefined"){
                oneCat.children = [];
            }
            if(oneCat.children.length > 0){
                CategoryV2.list({PostBody: {filter: {_id: {$in: oneCat.children.map((child) => child._id)}}, populate: ["children"], sort: {displayOrder: 1}, limit: 99}}, function (response) {
                    oneCat.nodes = response.datas || [];
                    for(let oneNode of oneCat.nodes){
                        $scope.expandOneCat(oneNode);
                    }
                    $scope.$broadcast('angular-ui-tree:expand-all');
                });
            }else{
                oneCat.nodes = [];
            }
        }


        $scope.expandAll = function(){
            for(let oneCat of $scope.categories){
                $scope.expandOneCat(oneCat)
            }
        }
        getMenus();

        function getMenus() {
            CategoryV2.list({
                PostBody: {
                    filter: {
                        ['ancestors.0']: {$exists: false}
                    },
                    populate: ["children"],
                    sort: {displayOrder: 1},
                    structure : structure,
                    limit: 99
                }
            }, function (response) {
                $scope.categories = verifyOrder(response.datas);
                //we expand all the categories
                $scope.expandAll();
            },function(error) {
                console.error(error);
            });
        }

        function verifyOrder(arayOfCat){
            if(arayOfCat && arayOfCat.length > 0){
                var deferred = $q.defer();
                var promiseArray = [];

                const longCat = arayOfCat.length;
                for(let count=0; count < longCat ; count++) {
                    let oneCat = arayOfCat[count];
                    if(oneCat.displayOrder != count){
                        oneCat.displayOrder = count;
                        promiseArray.push(CategoryV2.save(oneCat).$promise);
                    }
                }
                if(promiseArray.length > 0){
                    Promise.all(promiseArray).then(function () {
                        deferred.resolve();
                    }, function (err) {
                        toastService.toast("danger", $translate.instant("category.list.occurErrorAPI"));
                        deferred.reject();
                    });
                }
            }
            return arayOfCat;
        }

        

        $scope.listChildren = function (cat) {
            if(typeof cat.collapsed === "undefined"){
                cat.collapsed = false;
            }
            if(cat.collapsed){
                CategoryV2.list({PostBody: {filter: {_id: {$in: cat.children.map((child) => child._id)}}, populate: ["children"], sort: {displayOrder: 1}, limit: 99}}, function (response) {
                    cat.nodes = response.datas;
                    cat.collapsed = false;
                    for(let oneNode of cat.nodes){
                        oneNode.collapsed = true;
                        oneNode.nodes = [];
                    }
                });
            }else{
                cat.collapsed = !cat.collapsed;
            }
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
                    },
                    allCats: function () {
                        return $scope.categories;
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
                    if (childrenIndex > -1) {
                        categorySource.children.splice(childrenIndex, 1);
                    }
                    const longChild = categorySource.children.length;
                    for(let count=0;count<longChild;count++){
                        let oneChild = categorySource.children[count];
                        if(oneChild.displayOrder > indexPlace){
                            oneChild.displayOrder = count;
                            oneChild.displayOrder--;
                            promiseArray.push(CategoryV2.save(oneChild).$promise);
                        }
                    }
                    //we save
                    promiseArray.push(CategoryV2.save(categorySource).$promise);
                }
                //we add the element
                if(categoryDest != false){
                    if(!categoryDest.children){
                        categoryDest.children = [];
                    }
                    const childrenIndex = categoryDest.children.findIndex((element) => {
                        if(element._id == categoryToMove._id){
                            return element
                        }
                    });
                    if (childrenIndex > -1) {
                        categoryDest.children.splice(childrenIndex, 1);
                    }
                    //the catDestination have children, we need to change the order and make a little place at "indexPlace"
                    const longChild = categoryDest.children.length;
                    for(let count=0;count<longChild;count++){
                        let oneChild = categoryDest.children[count];
                        if(oneChild.displayOrder < indexPlace){
                            // if there is a weird displayOrder number
                            if(oneChild.displayOrder != count){
                                oneChild.displayOrder = count;
                                promiseArray.push(CategoryV2.save(oneChild).$promise);
                            }
                        }else if(oneChild.displayOrder >= indexPlace){
                            oneChild.displayOrder = count;
                            oneChild.displayOrder++;
                            promiseArray.push(CategoryV2.save(oneChild).$promise);
                        }
                    }
                    categoryDest.children.splice(indexPlace, 0, categoryToMove);
                    //we save
                    promiseArray.push(CategoryV2.save(categoryDest).$promise);
                }else{
                    // possible context :
                    // 1. we change the order of root Cats
                    // 2. we change a child cat to a root cat

                    // the cat is already in $scope.categories so we remove the actual categories from $scope.categories
                    let index = 0;
                    for(let oneCat of $scope.categories){
                        if(oneCat._id == categoryToMove._id){
                            break;
                        }
                        index++;
                    }
                    if (index > -1) {
                        $scope.categories.splice(index, 1);
                    }
                    // we create a root cat
                    // we need to change displayOrder of all
                    const longChild = $scope.categories.length;
                    for(let count=0;count<longChild;count++){
                        let oneChild = $scope.categories[count];
                        if(oneChild.displayOrder < indexPlace){
                            oneChild.displayOrder = count;
                            promiseArray.push(CategoryV2.save(oneChild).$promise);
                        }else if(oneChild.displayOrder > indexPlace){
                            oneChild.displayOrder = count;
                            oneChild.displayOrder++;
                            promiseArray.push(CategoryV2.save(oneChild).$promise);
                        }else if(oneChild.displayOrder == indexPlace){
                            if(oneChild.displayOrder == count){
                                oneChild.displayOrder = count;
                                oneChild.displayOrder++;
                            }else{
                                oneChild.displayOrder = count;
                            }
                        promiseArray.push(CategoryV2.save(oneChild).$promise);
                        }
                    }
                    // we add the cat to the good index
                    $scope.categories.splice(indexPlace, 0, categoryToMove);
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
                if(typeof indexPlace !== "undefined"){
                    categoryToMove.displayOrder = indexPlace;
                }
                //we save
                promiseArray.push(CategoryV2.save(categoryToMove).$promise);


                Promise.all(promiseArray).then(function () {
                    deferred.resolve();
                    $scope.$broadcast('angular-ui-tree:expand-all');
                }, function (err) {
                    toastService.toast("danger", $translate.instant("category.list.errorCategoryMove"));
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
    "$scope", "$modalInstance", "CategoryV2", "parent", "lang", "toastService", "allCats",
    function ($scope, $modalInstance, CategoryV2, parent, lang, toastService, allCats) {
        let displayOrder;
        let id_parent;
        if(parent){
            id_parent = [parent._id]
            displayOrder = parent.children.length;
        }else{
            id_parent = [];
            displayOrder = allCats.length;
        }
        $scope.lang = lang;
        $scope.category = {
            ancestors: id_parent,
            translation: {
                [lang]: {}
            },
            displayOrder: displayOrder
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

/*
    Controller for the NscategoryList directives
*/
CategoryControllers.controller("NsCategoryListController", [
    "$scope", "CategoryV2", "$rootScope",
    function ($scope, CategoryV2, $rootScope) {
        
        $scope.lang = $rootScope.languages.find(function (lang) {
            return lang.defaultLanguage;
        }).code;

        $scope.getCategories = function() {
            CategoryV2.list({PostBody: {filter: {['ancestors.0']: {$exists: false}}, populate: ["children"], sort: {displayOrder: 1}, structure: '*', limit: 99}}, function (response) {
                $scope.categories = response.datas;
                //we expand all the categories
                $scope.expandAll();
            });
        }
        
        $scope.catIsDisabled = function (node){
            if(typeof $scope.categoryIsDisabled !== "undefined" && $scope.categoryIsDisabled !== null){
                return $scope.categoryIsDisabled(node);
            } else {
                console.log("NsCategoryList : Helper -> There aren't callBack Function for 'categoryDisabled'");
            }
        };

        $scope.catOnClick = function (node){
            if(typeof $scope.categoryOnClick !== "undefined" && $scope.categoryOnClick !== null){
                return $scope.categoryOnClick(node);
            } else {
                //console.log("NsCategoryList : Helper -> There aren't callBack Function for 'categoryOnClick'");
            }
        };

        $scope.catIsChecked = function (node){
            if(typeof $scope.categoryIsChecked !== "undefined" && $scope.categoryIsChecked !== null){
                return $scope.categoryIsChecked(node);
            } else {
                //console.log("NsCategoryList : Helper -> There aren't callBack Function for 'categoryClick'");
            }
        };

        $scope.expandOneCat = function (oneCat) {
            if (typeof oneCat.children === "undefined") {
                oneCat.children = [];
            }
            if (oneCat.children.length > 0) {
                CategoryV2.list({ PostBody: { filter: { _id: { $in: oneCat.children.map((child) => child._id) } }, populate: ["children"], sort: { displayOrder: 1 }, structure: '*', limit: 99 } }, function (response) {
                    oneCat.nodes = response.datas || [];
                    for (let oneNode of oneCat.nodes) {
                        $scope.expandOneCat(oneNode);
                    }
                    $scope.$broadcast('angular-ui-tree:expand-all');
                });
            } else {
                oneCat.nodes = [];
            }
        }

        $scope.expandAll = function () {
            for (let oneCat of $scope.categories) {
                $scope.expandOneCat(oneCat)
            }
        }

        $scope.listChildren = function (cat, scope) {
            for(let oneNode of cat.nodes){
                CategoryV2.list({PostBody: {filter: {_id: {$in: oneNode.children.map((child) => child._id)}}, populate: ["children"], sort: {displayOrder: 1}, structure: '*', limit: 99}}, function (response) {
                    oneNode.nodes = response.datas;
                });
            }
            scope.toggle();
        };


        
        $scope.getCategories();
    }
]);
