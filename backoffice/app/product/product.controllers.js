const ProductControllers = angular.module("aq.product.controllers", []);

ProductControllers.controller("ProductBeforeCreateCtrl", [
    "$scope", "NSConstants", "$location", function ($scope, NSConstants, $location) {
        $scope.productTypes = NSConstants.productTypes;
        $scope.settings = {
            productType : $scope.productTypes[0].code
        };

        $scope.validate = function (settings) {
            $location.path(`/products/${settings.productType}/new`);
        };

        $scope.cancel = function () {
            $location.path("/products");
        };
    }
]);

ProductControllers.controller("SelectProductsCtrl", [
    "$scope", "$modalInstance", "queryFilter", "toastService", "productSelected",
    function ($scope, $modalInstance, queryFilter, toastService, productSelected) {
        $scope.queryFilter = queryFilter;
        $scope.selectedProducts = productSelected || [];
        //$scope.selectedProducts = $scope.$parent.associatedPrds || [];
        for(let oneProduct of $scope.selectedProducts){
            oneProduct._selected = true;
            oneProduct.style = {"background-color": "#3f51b5", "color": "white"};
        }

        $scope.selectProduct = function (product, ev) {
            if (typeof product._selected ==='undefined' && typeof product.style ==='undefined'){
                //le produit n'a jamais était selectionné
                $scope.selectedProducts.push(product);
                product._selected = true;
                product.style = {"background-color": "#3f51b5", "color": "white"};
            }else{
                let index = 0;
                for(let oneProduct of $scope.selectedProducts){
                    if(oneProduct._id === product._id){
                        break
                    }else{
                        index++;
                    }
                }
                if(index > -1){
                    $scope.selectedProducts.splice(index, 1);
                }
                delete product.style;
                delete product._selected;
            }
        };

        $scope.validate = function () {
            for(let oneProduct of $scope.selectedProducts){
                delete oneProduct._selected;
                delete oneProduct.style;
            }
            $modalInstance.close($scope.selectedProducts);
        };

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

        function getProductImg(prdIndex, products) {
            if (products && products.length > 0) {
                if (products[prdIndex].imageUrl == "./img/empty.jpg") {
                    ProductImage.query({type: "aquila", id: products[prdIndex].id}, function (data) {
                        products[prdIndex].imageUrl = `data:image/jpg;base64,${data.img}`;

                        if (prdIndex < products.length - 1) {
                            getProductImg(prdIndex + 1, products);
                        }
                    });
                } else {
                    if (prdIndex < products.length - 1) {
                        getProductImg(prdIndex + 1, products);
                    }
                }
            }
        }

        $scope.getImage = function (images) {
            try {
                const image = images.find(img => img.default) ? images.find(img => img.default) : images[0];
                const link = `images/products/196x173/${image._id}/${image.url.split('/')[image.url.split('/').length - 1]}`;
                return link;
            } catch (e) {
                return '';
            }
        };
        $scope.collapse = function () {
          if(document.getElementById('collapseIcon').className === "ico-arrow-down"){
            document.getElementById('collapseIcon').className =  "ico-arrow-up"
          }else {document.getElementById('collapseIcon').className = "ico-arrow-down"}
        };

        $scope.getAttributesClassed = function () {
            AttributesV2.list({PostBody: {filter: {_type: 'products'}, limit: 99}}, function ({datas}) {
                $scope.attribs = datas;
            });
        };

        $scope.getProducts = function (page) {
            $scope.showLoader = true;
            const search = $scope.searchObj;
            const filter = $scope.filter;
            let pageAdmin = {location: "products", page: 1};
            if (window.localStorage.getItem("pageAdmin") !== undefined && window.localStorage.getItem("pageAdmin") !== null) {
                pageAdmin = JSON.parse(window.localStorage.getItem("pageAdmin"));
            }
            if (page === undefined && pageAdmin.location === "products") {
                const pageSaved = pageAdmin.page;
                $scope.page = pageSaved;
                $scope.currentPage = pageSaved;

                if(pageAdmin.search !== undefined && pageAdmin.search !== null) {
                    $scope.searchObj.translation = pageAdmin.search.translation;
                }
                if (pageAdmin.filters !== undefined && pageAdmin.filters !== null) {
                    $scope.filtersAttribs = pageAdmin.filters;
                }
                // if(pageAdmin.filter !== undefined && pageAdmin.filter !== null) {
                //     $scope.filter = pageAdmin.filter;
                // }
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

            const paramsV2 = {
                lang: "fr",
                PostBody: {
                    filter: params.filter, // // TODO adminList - searchObj : Filters don't work except for code
                    structure: {
                        code: 1,
                        active: 1,
                        _visible: 1,
                        stock: 1
                    },
                    limit: 12,
                    page: $scope.currentPage,
                    sort: params.sortObj
                }
            };
            ProductsV2.list(paramsV2, function (res) {
                getProductImg(0, res.datas); // what the hell is that ?!
                $scope.products = res.datas;
                $scope.totalItems = res.count;
                $scope.showLoader = false;
            });
        };

        $scope.goToProductDetails = function (productType, productSlug) {
            $location.path(`/products/${productType}/${productSlug}`);
        };

        $scope.defaultLang = $rootScope.languages.find(function (lang) {
            return lang.defaultLanguage;
        }).code;
        $scope.langs = $rootScope.languages;
        $scope.filterLang = $rootScope.languages[0].code;

        $scope.getProducts();
        $scope.getAttributesClassed();

        $scope.momentDate = function (date) {
            return moment(date).format('DD/MM/YY');
        };

        $scope.resetFilters = function (date) {
            $scope.filter = {};
            $scope.filtersAttribs = {};
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
    "$scope", "$filter", "HookProductInfo", "SetAttributesV2", "AttributesV2", "$modal", "ProductsV2",
    function ($scope, $filter, HookProductInfo, SetAttributesV2, AttributesV2, $modal, ProductsV2) {
        $scope.productTypeName = $filter("nsProductTypeName")($scope.productType);
        $scope.hookInfo = HookProductInfo;
        SetAttributesV2.list({PostBody: {filter: {type: 'products'}, limit: 99}}, function ({datas}) {
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


        $scope.changeActiveVisible = function(product){
            $modal.open({
                templateUrl: 'app/product/views/modals/canonical.html',
                controller: function ($scope, $modalInstance, CategoryV2, ConfigV2, toastService, ExecRules, ProductsV2) {
                    $scope.product = product;
                    $scope.adminUrl = "";
                    ConfigV2.get({PostBody: {structure: {environment: 1}}}, function (config) {
                        $scope.config = config
                        $scope.adminUrl = $scope.config.environment.adminPrefix;
                    });

                    CategoryV2.list({ PostBody: { filter: { 'productsList.id': $scope.product._id }, limit: 99 } }, function (categoriesLink) {
                        $scope.cat = categoriesLink.datas.length !== 0;
                    });

                    $scope.cancel = function () {
                        $modalInstance.dismiss('cancel');
                    };
                    $scope.runCanonicalisation = async function () {
                        ExecRules.exec({type: "category"}, function (result) {
                            CategoryV2.canonical({}, {}, function () {
                                toastService.toast('success', "Terminé")
                                ProductsV2.query({PostBody: {filter: {_id: $scope.product._id}, structure: '*'}}, function (response) {
                                    $scope.product = response;
                                    $scope.product.active = true;
                                    ProductsV2.save({}, $scope.product, function (response) {
                                        window.location.reload()
                                    })
                                })
                            })
                        }, function (error) {
                            console.log(error)
                            toastService.toast('danger', "Erreur lors de la categorisation")
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

        window.addEventListener('displayCanonicalModal', () => $scope.changeActiveVisible($scope.product) )

    }
]);