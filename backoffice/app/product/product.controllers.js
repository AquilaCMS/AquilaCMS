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
    "$scope", "$modalInstance", "queryFilter", function ($scope, $modalInstance, queryFilter) {
        ;
        $scope.queryFilter = queryFilter;
        $scope.selectedProducts = [];
        $scope.selectProduct = function (product, ev) {
            let push = true;
            if (product._selected != true) {
                for (let i = 0; i < $scope.selectedProducts.length; i++) {
                    if ($scope.selectedProducts[i]._id == product._id) {
                        push = false;
                    }
                }
                if (push) {
                    $scope.selectedProducts.push(product);
                    product._selected = true;
                } else {
                    var index = $scope.selectedProducts.findIndex(function (currProduct) {
                        return currProduct.id == product.id;
                    });
                    $scope.selectedProducts.splice(index, 1);
                    // $(ev.target).closest('tr').children('td').css({
                    //     'background-color': '',
                    //     'color': ''
                    // });
                    product._selected = false;
                }
                // $(ev.target).closest('tr').children('td').css({
                //     'background-color': '#3f51b5',
                //     'color': 'white'
                // });
            } else {
                var index = $scope.selectedProducts.findIndex(function (currProduct) {
                    return currProduct.code == product.code;
                });
                $scope.selectedProducts.splice(index, 1);
                // $(ev.target).closest('tr').children('td').css({
                //     'background-color': '',
                //     'color': ''
                // });
                product._selected = false;
            }
        };

        $scope.validate = function (products) {
            $modalInstance.close(products);
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
        $scope.currProductId = "";
        $scope.currProductSlugs = [];
        $scope.local = {sortType: "code", sortReverse: false};
        $scope.productTypes = NSConstants.productTypes;
        $scope.export = ExportCollectionCSV;
        $scope.attribs = [];
        $scope.filtersAttribs = {};
        $scope.langs = [];
        $scope.filterLang = "";

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

        $scope.getAttributesClassed = function () {
            AttributesV2.list({PostBody: {filter: {_type: 'products'}, limit: 99}}, function ({datas}) {
                $scope.attribs = datas;
            });
        };

        $scope.getProducts = function (page) {
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
                    } else if (filterKeys[i] === "creationDate") {
                        params.filter.creationDate = {$gte: moment(new Date($scope.filter[filterKeys[i]])), $lt: moment(new Date($scope.filter[filterKeys[i]])).add(1, 'd')};
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
                params.searchObj = $scope.searchObj;
            }

            params.sortObj = {};
            if ($scope.local.sortReverse) {
                params.sortObj[$scope.local.sortType] = -1;
            } else {
                params.sortObj[$scope.local.sortType] = 1;
            }

            ProductsV2.searchObj(params, function (res) {
                getProductImg(0, res.products);

                $scope.products = res.products;
                $scope.totalItems = res.count;
            });
        };

        $scope.updateProduct = function (field, data) {
            console.log(`${field} : ${data}`);
            const d = $q.defer();
            $http.post("/product/update", {
                _id   : $scope.currProductId, value : data, field
            }).success(function (res) {
                res = res || {};
                if (res.status === true) { // {status: "ok"}
                    d.resolve();
                } else { // {status: "error", msg: "..."}
                    d.resolve(res.msg);
                }
            }).error(function (e) {
                d.reject("Server error!");
            });
            return d.promise;
        };

        $scope.setCurrProduct = function (pId, pSmenus) {
            $scope.currProductId = pId;
            $scope.currProductSlugs = pSmenus;
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
    "$scope", "$filter", "ProductSeo", "SetAttributesV2", "AttributesV2", "$modal", "ProductsV2",
    function ($scope, $filter, ProductSeo, SetAttributesV2, AttributesV2, $modal, ProductsV2) {
        $scope.productTypeName = $filter("nsProductTypeName")($scope.productType);
        $scope.test = ProductSeo;
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
                    $scope.config = ConfigV2.environment(function () {
                            $scope.adminUrl = $scope.config.adminPrefix;
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