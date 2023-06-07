const ProductControllers = angular.module("aq.product.controllers", []);

ProductControllers.controller("SelectProductsCtrl", [
    "$scope", "$modalInstance", "queryFilter", "toastService", "productSelected",
    function ($scope, $modalInstance, queryFilter, toastService, productSelected) {
        $scope.queryFilter = queryFilter;
        $scope.selectedProducts = productSelected || [];

        $scope.validate = function () {
            for(let oneProduct of $scope.selectedProducts){
                delete oneProduct._selected;
                delete oneProduct.style;
            }
            $scope.close($scope.selectedProducts)
        };

        $scope.close = function (productsSelected) {
            $modalInstance.close(productsSelected);
        }

        $scope.cancel = function () {
            $modalInstance.dismiss("cancel");
        };
    }
]);

// product
ProductControllers.controller("ProductListCtrl", [
    "$scope", "$http", "$q", "$location", "ProductsV2", "ProductImage", "NSConstants", "ProductColumns", "$rootScope", "ExportCollectionCSV", "AttributesV2",
    function ($scope, $http, $q, $location, ProductsV2, ProductImage, NSConstants, ProductColumns, $rootScope, ExportCollectionCSV, AttributesV2) {
        $scope.columns = ProductColumns;
        $scope.page = 1;
        $scope.totalItems = 0;
        $scope.nbItemsPerPage = 12;
        $scope.maxSize = 10;
        $scope.searchObj = {};
        $scope.filter = {};
        $scope.local = {sortType: "code", sortReverse: false};
        $scope.productTypes = NSConstants.productTypes;
        $scope.export = ExportCollectionCSV;
        $scope.attribs = [];
        $scope.filtersAttribs = {};
        $scope.langs = [];
        $scope.filterLang = "";
        $scope.showLoader = false;

        $scope.getImage = function (images) {
            try {
                const image = images.find(img => img.default) ? images.find(img => img.default) : images[0];
                const link = `/images/products/196x173/${image._id}/${image.url.split('\\').pop().split('/').pop()}`;
                return link;
            } catch (e) {
                return '';
            }
        };
        $scope.collapseAdvancedSearch = function () {
            if(document.getElementById('collapseIcon').className === "ico-arrow-down"){
                document.getElementById('collapseIcon').className = "ico-arrow-up";
                setTimeout(function () {
                    $scope.$apply(function () {
                        $scope.advancedSearchDisplay = true;
                    });
                }, 300); 
            }else {
                document.getElementById('collapseIcon').className = "ico-arrow-down";
            }
        };

        $scope.getAttributesClassed = function () {
            AttributesV2.list({PostBody: {filter: {_type: 'products'}, limit: 0}}, function ({datas}) {
                $scope.attribs = datas;
            });
        };

        $scope.selectNewLang = function (event){
            if(event && event.filterLang) {
                $scope.filterLang = event.filterLang;
            }
        }

        $scope.getProducts = function (page) {
            $scope.showLoader = true;
            const search = $scope.searchObj;
            const filter = $scope.filter;
            let pageAdmin = {location: "products", page: 1};
            if (window.localStorage.getItem("pageAdmin") !== undefined && window.localStorage.getItem("pageAdmin") !== null) {
                try{
                    pageAdmin = JSON.parse(window.localStorage.getItem("pageAdmin"));
                }catch(e){
                    // if JSON.parse() fail => the page doesn't load
                    pageAdmin = {location: "products", page: 1};
                }
            }
            if (page === undefined && pageAdmin.location === "products") {
                const pageSaved = pageAdmin.page;
                $scope.page = pageSaved;
                $scope.currentPage = pageSaved;

                if(pageAdmin.search !== undefined && pageAdmin.search !== null) {
                    $scope.searchObj.translation = pageAdmin.search.translation;
                    if (pageAdmin.search.active){
                        $scope.searchObj.active = pageAdmin.search.active;
                    }
                    if (pageAdmin.search._visible) {
                        $scope.searchObj._visible = pageAdmin.search._visible;
                    }
                }
                if(pageAdmin.filter !== undefined && pageAdmin.filter !== null) {
                    $scope.filter = pageAdmin.filter;
                }
            } else {
                window.localStorage.setItem("pageAdmin", JSON.stringify({location: "products", page, search, filter}));
                $scope.page = page;
                $scope.currentPage = page;
                window.scrollTo(0, 0);
            }

            const params = {page: $scope.page, limit: $scope.nbItemsPerPage};

            cleanEmptyProperties($scope.filter);
            cleanEmptyProperties($scope.searchObj);
            params.filter = {};

            if (Object.keys($scope.filter).length > 0) {
                const filterKeys = Object.keys($scope.filter);
                for (var i = 0; i < filterKeys.length; i++) {
                    if (filterKeys[i] === "end_marketing" || filterKeys[i] === "end_availability") {
                        var now = new Date($scope.filter[filterKeys[i]]);
                        params.filter[filterKeys[i]] = {
                            $lt : Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
                                now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds(), now.getUTCMilliseconds())
                        };
                    } else if (filterKeys[i] === "start_marketing" || filterKeys[i] === "start_availability") {
                        var now = new Date($scope.filter[filterKeys[i]]);
                        params.filter[filterKeys[i]] = {
                            $gt : Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds(), now.getUTCMilliseconds())
                        };
                    } else if (filterKeys[i] === "images") {
                        params.filter["images.url"] = {$regex: $scope.filter[filterKeys[i]], $options: "i"};
                    } else if (filterKeys[i] === "createdAt") {
                        params.filter.createdAt = {$gte: moment(new Date($scope.filter[filterKeys[i]])), $lt: moment(new Date($scope.filter[filterKeys[i]])).add(1, 'd')};
                    } else {
                        params.filter[filterKeys[i]] = {$regex: $scope.filter[filterKeys[i]], $options: "i"};
                    }
                }
            }

            if (Object.keys($scope.filtersAttribs).length > 0) {
                let filters = {};
                params.filter.$and = [];
                for (var i = 0; i < Object.keys($scope.filtersAttribs).length; i++) {
                    const code = Object.keys($scope.filtersAttribs)[i];
                    const value = $scope.filtersAttribs[Object.keys($scope.filtersAttribs)[i]];
                    filters[code] = value;
                    if (value === 'true' || value === 'false') {
                        params.filter.$and.push({attributes: {$elemMatch: {code, [`translation.${$scope.filterLang}.value`]: value === 'true'}}});
                    } else {
                        params.filter.$and.push({attributes: {$elemMatch: {code, [`translation.${$scope.filterLang}.value`]: {$regex: value, $options: "i"}}}});
                    }
                }
                window.localStorage.setItem("pageAdmin", JSON.stringify({ location: "products", page, search, filters }));
                // pageAdmin.filtersAttribs = filters;
            }

            if (Object.keys($scope.searchObj).length > 0) {
                const filterKeys = Object.keys($scope.searchObj);
                const filterLength = filterKeys.length;
                let newFilter = {};
                for (var i = 0; i < filterLength; i++) {
                    if(filterKeys[i] == "translation"){
                        newFilter[`translation.${$scope.filterLang}.name`] = { $regex: $scope.searchObj.translation.name, $options: "i" };
                    }else if(filterKeys[i] == "img"){
                        if ($scope.searchObj[filterKeys[i]] === "true") {
                            newFilter["images"] = {$ne: []};
                        } else {
                            newFilter["images"] = {$eq: []};
                        }
                    }else if(filterKeys[i] == "active" || filterKeys[i] == "_visible"){
                        newFilter[filterKeys[i]] = $scope.searchObj[filterKeys[i]] == "true" ? true : false;
                    }else if (filterKeys[i].includes("min_") || filterKeys[i].includes("max_")) {
                        const key = filterKeys[i].split("_");
                        const value = $scope.searchObj[filterKeys[i]];
                        if (key[1] == "priceSale") {
                            if(typeof newFilter['price.ati.normal'] === "undefined"){
                                newFilter['price.ati.normal'] = {}
                            }
                            newFilter['price.ati.normal'][key[0] === "min" ? "$gte" : "$lte"] = value;
                        }else if(key[1] == "qty"){
                            if(typeof newFilter["stock.qty"] === "undefined"){
                                newFilter["stock.qty"] = {}
                            }
                            newFilter['stock.qty'][key[0] === "min" ? "$gte" : "$lte"] = value;
                        }
                    }
                }
                params.filter = {...params.filter, ...newFilter};
            }

            params.sortObj = {};
            if ($scope.local.sortReverse) {
                params.sortObj[$scope.local.sortType] = -1;
            } else {
                params.sortObj[$scope.local.sortType] = 1;
            }

            const select = `{"code": 1, "images": 1, "active": 1, "_visible": 1, "stock.qty": 1,  "type": 1, "price.ati.normal": 1, "translation.${$scope.filterLang}.name": 1}`;

            const paramsV2 = {
                limit: $scope.nbItemsPerPage,
                page: $scope.currentPage,
                sort: params.sortObj,
                filter: params.filter, // // TODO adminList - searchObj : Filters don't work except for code
                select
            };
            ProductsV2.list(paramsV2, function (res) {
                if(res.count > 0 && res.datas.length == 0){
                    //weird so we reload with page 1
                    $scope.getProducts(1);
                }else{
                    $scope.products = res.datas;
                    $scope.totalItems = res.count;
                    $scope.showLoader = false;
                }
            }, function(error){
                console.error(error);
            });
        };

        $scope.goToProductDetails = function (productType, productSlug) {
            $location.path(`/products/${productType}/${productSlug}`);
        };

        $scope.defaultLang = $rootScope.languages.find(function (lang) {
            return lang.defaultLanguage;
        }).code;
        $scope.langs = $rootScope.languages;
        $scope.filterLang = $scope.defaultLang;

        $scope.getProducts();
        $scope.getAttributesClassed();

        $scope.momentDate = function (date) {
            return moment(date).format('DD/MM/YY');
        };

        $scope.resetFilters = function (date) {
            $scope.filter = {};
            $scope.filtersAttribs = {};
            window.localStorage.setItem("pageAdmin", `{"location":"products","page":1,"search":{},"filter":{}}`);
            $scope.searchObj = {};
            $scope.getProducts(1);
        };

        $scope.onChange = function (code, valeur) {
            if (valeur === "") {
                delete $scope.filtersAttribs[code];
            }
        };
    }
]);

ProductControllers.controller("nsProductGeneral", [
    "$scope", "$filter", "HookProductInfo", "SetAttributesV2", "AttributesV2", "$modal", "$rootScope", "$translate",
    function ($scope, $filter, HookProductInfo, SetAttributesV2, AttributesV2, $modal, $rootScope, $translate) {
        $scope.productTypeName = $filter("nsProductTypeName")($scope.productType);
        $scope.hookInfo = HookProductInfo;

        $scope.loadNewAttrs = async function () {
            AttributesV2.list({ PostBody: { filter: { set_attributes: $scope.product.set_attributes, _type: 'users' }, structure: '*', limit: 0 } }, function ({ datas }) {
                $scope.product.attributes = datas.map(function (attr) {
                    attr.id = attr._id;
                    delete attr._id;
                    return attr;
                });
            });
        };

        SetAttributesV2.list({PostBody: {filter: {type: 'products'}, limit: 0}}, function ({datas}) {
            $scope.setAttributes = datas;

            if ($scope.product && $scope.product.set_attributes === undefined) {
                const set_attributes = datas.find(function (setAttr) {
                    return setAttr.code === "defaut";
                });
                if (set_attributes) {
                    $scope.product.set_attributes = set_attributes;
                    $scope.loadNewAttrs();
                }
            }
        });

        $scope.isGoodCanonical = function () {
            if ($scope.product) {
                // Detect canonical for all languages
                let isGoodCanonicalForAllLang = true;
                for (let index = 0; index < $rootScope.languages.length; index++) {
                    const aLang = $rootScope.languages[index];
                    if(aLang.status === "visible" && !($scope.product.translation && $scope.product.translation[aLang.code] && $scope.product.translation[aLang.code].canonical && $scope.product.translation[aLang.code].canonical.length > 0)) {
                        isGoodCanonicalForAllLang = false;
                    }
                }

                if($scope.product.active || isGoodCanonicalForAllLang){
                    return true;
                }
            }
            return false;
        };

        $scope.changeActiveVisible = function(product){
            $modal.open({
                templateUrl: 'app/product/views/modals/canonical.html',
                controller: function ($scope, $modalInstance, CategoryV2, ConfigV2, toastService, ExecRules) {
                    $scope.product = product;
                    $scope.adminUrl = "";
                    ConfigV2.get({PostBody: {structure: {environment: 1}}}, function (config) {
                        $scope.config = config
                        $scope.adminUrl = $scope.config.environment.adminPrefix;
                    });

                    CategoryV2.list({ PostBody: { filter: { 'productsList.id': $scope.product._id }, limit: 0 } }, function (categoriesLink) {
                        $scope.cat = categoriesLink.datas.length !== 0;
                    });

                    $scope.cancel = function () {
                        $modalInstance.dismiss('cancel');
                    };
                    $scope.runCanonicalisation = async function () {
                        ExecRules.exec({type: "category"}, function (result) {
                            CategoryV2.canonical({}, {}, function () {
                                toastService.toast('success', $translate.instant("product.general.finished"))
                                window.location.reload();
                            })
                        }, function (error) {
                            console.log(error)
                            toastService.toast('danger', $translate.instant("product.general.errorCategorization"))
                        })
                    }
                },
                resolve: {
                    product: function () {
                        return product;
                    },

                }
            }).result.then(function () {
            });
        }

        $scope.downloadLinkChange = function () {
            const url = $scope.product.downloadLink;
            if($scope.product.filename || !url) return;
            $scope.product.filename = url.substring(url.lastIndexOf('/')+1);
        }

        window.addEventListener('displayCanonicalModal', () => $scope.changeActiveVisible($scope.product) )

    }
]);

ProductControllers.controller("nsProductCategories", [
    "$scope", "$filter", "CategoryV2",
    function ($scope, $filter, CategoryV2) {
        $scope.selectNode = function(node){
            //we get the actual productsList
            var tab = node.productsList;
            const productID = $scope.product._id;
            let count = 0;
            const lenTab = tab.length;
            for(let oneObject of tab){
                if(oneObject.id == productID){
                    if(count > -1) {
                        tab.splice(count, 1);
                    }
                    break;
                }else{
                    count++;
                }
            }
            if(count == lenTab) {
                tab.push({id: productID, checked: true});
            }
            //we save
            CategoryV2.save({_id: node._id, code: node.code, productsList: tab}, function () {

            });
        };
        
        $scope.catDisabled = function (node){
            let final = false;
            if(node.action !== "catalog"){
                final = true;
            }else{
                if(node.productsList){
                    for(let oneChild of node.productsList){
                        if(oneChild.id == $scope.product._id){
                            final = !oneChild.checked;
                            break;
                        }
                    }
                }
            }
            return final;
        };

        $scope.catCheck = function (node){
            let final = false;
            if(node.productsList){
                for(let oneChild of node.productsList){
                    if(oneChild.id == $scope.product._id){
                        final = true;
                        break;
                    }
                }
            }
            return final;
        };
    }
]);