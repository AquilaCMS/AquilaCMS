let ProductDirectives = angular.module("aq.product.directives", []);

// plus utilisé
// ProductDirectives.directive("nsProductList", function ()
// {
//     return {
//         restrict: "E",
//         scope: {},
//         templateUrl: "app/product/views/templates/nsProductList.html",
//         controller: [
//             "$scope", "Product", "ProductPagination", "ProductSearch",
//             function ($scope, Product, ProductPagination, ProductSearch)
//             {
//                 $scope.getProducts = function (page, limit)
//                 {
//                     var filter = {};
//                     filter.page = page;
//                     filter.limit = limit;
//                     return ProductPagination.query(filter).$promise;
//                 };
//
//                 $scope.config = {
//                     columns: [
//                         {title: "ID", field: "id"},
//                         {title: "Image", field: "imageUrl", format: "image"},
//                         {title: "Nom", field: "name"},
//                         {title: "Prix", field: "price_sale"},
//                         {title: "Quantité", field: "qty"},
//                         {title: "Type", field: "type", format: "nsProductTypeName"},
//                         {title: "Actif", field: "active"},
//                         {title: "Visible", field: "_visible"}
//                     ],
//                     sourceData: {read: $scope.getProducts, dataField: "products", totalField: "count"},
//                     pagination: {
//                         serverPaging: true
//                     }
//                 };
//
//             }
//         ]
//     };
// });

ProductDirectives.directive("nsProductsList", function () {
    return {
        restrict : "E",
        scope    : {
            onSelect    : "=", queryFilter : "="
        },
        templateUrl : "app/product/views/templates/nsProductsList.html",
        controller  : [
            "$scope", "ProductsV2", "ProductTri", "SuppliersV2", "$rootScope",
            function ($scope, ProductsV2, ProductTri, SuppliersV2, $rootScope) {
                $scope.totalItems = 0;
                $scope.nbItemsPerPage = 12;
                $scope.maxSize = 10;
                $scope.active = false;
                $scope.visible = false;
                $scope.pagination = {};
                $scope.typeProduit = "";
                $scope.pagination.typeProduit = $scope.$parent.product.type;
                $scope.f = {
                    nameFilter : "",
                    codeFilter : ""
                };

                // Pagination
                $scope.onPageChange = function (page) {
                    SuppliersV2.list({PostBody: {filter: {}, structure: '*', limit: 99}}, function ({datas}) {
                        $scope.suppliers = {"": ""};
                        for (let i = 0; i < datas.length; i++) {
                            $scope.suppliers[datas[i]._id] = datas[i].name;
                        }

                        const filter = angular.copy($scope.queryFilter);
                        // Si pagination avec recherche
                        console.log("open popup");
                        // if ($scope.f.nameFilter.length > 0) {
                        const paramsV2 = {
                            lang: "fr",
                            PostBody: {
                                filter:{}, // q: $scope.f.nameFilter
                                structure: {
                                    code: 1,
                                    supplier_ref:1 // TODO : faire le populate !
                                },
                                limit: $scope.nbItemsPerPage,
                                page
                            }
                        };
                        // TODO adminList : Edit prd, popup crossselling call this. Pb with filter, etc
                        ProductsV2.list(paramsV2, function (res) {
                            // for (let prd of res.datas) {
                            //     prd.images = prd.images.filter(i => i.default)
                            // }
                            $scope.products = res.datas;
                            $scope.addStyle($scope.products)
                            $scope.totalItems = res.count;
                        });
                        // } else {
                        //     ProductsV2.list({PostBody: {filter, structure: '*', limit: $scope.nbItemsPerPage, page}}, function ({datas, count}) {
                        //         for (let prd of datas) {
                        //             prd.images = prd.images.filter(i => i.default)
                        //         }
                        //         $scope.products = datas;
                        //         $scope.addStyle($scope.products)
                        //         $scope.totalItems = count;
                        //     });
                        // }

                        // $scope.queryFilter.supplier_ref = "";
                    });
                };
                $scope.changeTri = function () {
                    ProductTri.search($scope.pagination, function (productsList) {
                        for (let prd of productsList) {
                            prd.images = prd.images.filter(i => i.default)
                        }
                        $scope.products = productsList;
                        $scope.addStyle($scope.products)
                    });
                };
                // modifie le style css en selectionnee et de cette maniere il permet de garder le champ selectione lors du changement de page
                $scope.addStyle = function (allProducts) {
                    for(product of allProducts){
                        for (selectProduct of $scope.$parent.$parent.$parent.selectedProducts) {
                            if (selectProduct._id == product._id) {
                                product.style = {"background-color": "#3f51b5", "color": "white"};
                                continue;
                            }
                        }
                    }
                };

                $scope.defaultLang = $rootScope.languages.find(function (lang) {
                    return lang.defaultLanguage;
                }).code;

                $scope.onPageChange(1);

                // fait en sorte qu il ne s affiche pas lui meme pour la selection des produits associes
                $scope.display = function (product) {
                    return $scope.$parent.product._id != product._id;
                };
                $scope.search = function () {
                    let filterObj = {};
                    if($scope.queryFilter.type){
                        filterObj["type"] = $scope.queryFilter.type;
                    }
                    if($scope.f.codeFilter && $scope.f.codeFilter != ""){
                        filterObj["code"] = { $regex: $scope.f.codeFilter, $options: "i" };
                    }
                    if($scope.f.nameFilter && $scope.f.nameFilter != ""){
                        filterObj[`translation.${$scope.defaultLang}.name`] = { $regex: $scope.f.nameFilter, $options: "i" };
                    }
                    if($scope.queryFilter.supplier_ref && $scope.queryFilter.supplier_ref != "") {
                        filterObj["supplier_ref"] = $scope.queryFilter.supplier_ref;
                    }
                    // lang : "fr" ???
                    const paramsV2 = {
                        lang: "fr",
                        PostBody: {
                            filter: filterObj,
                            structure: {
                                code: 1,
                                active: 1,
                                _visible: 1,
                                stock: 1
                            },
                            limit: $scope.nbItemsPerPage,
                            page: 1
                        }
                    };
                    //console.log("filter popup");
                    // TODO adminList : Edit prd, popup crossselling search call this. Pb with filter, etc
                    ProductsV2.list(paramsV2, function (res) {
                        for (let prd of res.datas) {
                            prd.images = prd.images.filter(i => i.default)
                        }
                        $scope.products = res.datas;
                        $scope.totalItems = res.count;
                        $scope.currentPage = 1;
                        $scope.addStyle($scope.products); //we colorize product alerady added
                    });
                };
            }
        ]
    };
});

ProductDirectives.directive("nsProductGeneral", function () {
    return {
        restrict : "E",
        scope    : {
            product     : "=", lang        : "=", isEditMode  : "=", productType : "=?", form        : "="
        },
        templateUrl : "app/product/views/templates/nsProductGeneral.html",
        controller  : 'nsProductGeneral'
    };
});
// product: Objet contenant les informations du produits
// form: Formulaire
// init: permet d'initialiser les valeurs (dans ce cas lorsque le produit est bien entierement chargé, on peut charger les données du fournisseur de cet article)

ProductDirectives.directive("nsProductMarketing", [
    "SuppliersV2", function (SuppliersV2) {
        return {
            restrict    : "E",
            require     : "ngModel",
            scope       : {form: "=", init: "="},
            templateUrl : "app/product/views/templates/nsProductMarketing.html",
            link(scope, element, attrs, ngModel) {
                ngModel.$render = function () {
                    if (ngModel.$modelValue) {
                        scope.product = ngModel.$modelValue;

                        SuppliersV2.list({PostBody: {filter: {}, structure: '*', limit: 99}}, function ({datas}) {
                            scope.supplierList = datas;

                        });
                    }
                };
            },
            controller : [
                "$scope", "$filter", "TrademarksV2", "SuppliersV2", "FamilyV2", function ($scope, $filter, TrademarksV2, SuppliersV2, FamilyV2) {
                    $scope.supplier = {};
                    $scope.trademarkList = [];
                    TrademarksV2.list({PostBody: {filter: {}, structure: '*', limit: 99}}, function({datas}) {
                        $scope.trademarkList = datas
                    });

                    FamilyV2.list({PostBody: {filter: {}, structure: '*', limit: 99}}, function ({datas}) {
                        $scope.allFamilies = datas;
                        $scope.universeList = $filter("filter")(datas, {type: "universe"}, true);
                        $scope.familyList = $filter("filter")(datas, {type: "family"}, true);
                        $scope.subfamilyList = $filter("filter")(datas, {type: "subfamily"}, true);
                    });

                    $scope.updateListFamily = function (listDest, type, origine) {
                        if ($scope.product[origine] != null) {
                            const newListIds = $filter("filter")($scope.allFamilies, {slug: $scope.product[origine]})[0].children;
                            const family = $filter("filter")($scope.allFamilies, {type: listDest.slice(0, -4)}, true);
                            $scope[listDest] = family.filter(function (_family) {
                                if (newListIds.indexOf(_family._id) > -1) {
                                    return true;
                                }

                                return false;
                            });
                        } else {
                            $scope[listDest] = [];
                        }
                    };

                    $scope.$watch("init", function (newValue, oldValue) {
                        if (newValue != oldValue) {
                            if (angular.isDefined($scope.product.supplier_ref)) {
                                $scope.supplier = SuppliersV2.query({PostBody: {filter: {_id: $scope.product.supplier_ref}, structure: '*'}}, function (resp) {
                                    $scope.product.supplier_ref = resp._id;
                                    $scope.product.supplier_code = resp.code;
                                });
                            }
                        }
                    });
                }
            ]
        };
    }
]);

ProductDirectives.directive("nsProductPrice", function () {
    return {
        restrict : "E",
        scope    : {
            form : "="
        },
        require     : "ngModel",
        templateUrl : "app/product/views/templates/nsProductPrice.html",
        link(scope, element, attrs, ngModel) {
            ngModel.$render = function () {
                if (ngModel.$modelValue) {
                    scope.product = ngModel.$modelValue;
                }
            };
        },
        controller : [
            "$scope", "ConfigV2", "$rootScope", function ($scope, ConfigV2, $rootScope) {
                $scope.langs = [];
                $scope.stockLabels = [];
                $scope.config = {};
                $scope.lang = "";

                $scope.lang = $rootScope.languages.find(function (lang) {
                    return lang.defaultLanguage;
                }).code;
                $scope.langs = $rootScope.languages;

                ConfigV2.get({PostBody: {structure: {taxerate: 1, stockOrder: 1}}}, function (config) {
                    $scope.config = config;
                    $scope.config.taxerate = $scope.config.taxerate.map(t => t.rate);
                    if (
                        $scope.config
                        && $scope.config.taxerate.length > 0
                        && $scope.product
                        && $scope.product.price
                        && !$scope.product.price.tax
                    ) {
                        // $scope.product.price.tax = $scope.config.taxerate[$scope.config.taxerate.length - 1].rate;
                        $scope.product.price.tax = 0;
                    }
                    if (Object.keys(config.stockOrder).length > 2) {
                        $scope.stockLabels = config.stockOrder.labels;
                    }
                });

                $scope.recalculate = function (target) {
                    const prices = $scope.product.price;
                    const fields = target.split(".");
                    const vat = prices.tax / 100 + 1;

                    if (fields.length > 1) {
                        let removeFields = false;

                        if (fields[0] === "et") {
                            if (prices.et[fields[1]] !== undefined && prices.et[fields[1]] != null) {
                                prices.ati[fields[1]] = parseFloat((prices.et[fields[1]] * vat).toFixed(2));
                            } else {
                                removeFields = true;
                            }
                        } else {
                            if (prices.ati[fields[1]] !== undefined && prices.ati[fields[1]] != null) {
                                prices.et[fields[1]] = parseFloat((prices.ati[fields[1]] / vat).toFixed(2));
                            } else {
                                removeFields = true;
                            }
                        }

                        if (removeFields) {
                            delete prices.et[fields[1]];
                            delete prices.ati[fields[1]];
                        }
                    } else {
                        if (prices.et && prices.et.normal !== undefined && prices.et.normal != null) {
                            prices.ati.normal = parseFloat((prices.et.normal * vat).toFixed(2));
                        }
                        if (prices.et && prices.et.special !== undefined && prices.et.special != null) {
                            prices.ati.special = parseFloat((prices.et.special * vat).toFixed(2));
                        }
                    }
                };

                $scope.applyTranslationStock = function () {
                    $scope.product.stock.translation = $scope.stockLabels.find(sLabel => sLabel.code === $scope.product.stock.label).translation;
                }
            }
        ]
    };
});

ProductDirectives.directive("nsProductPhoto", function () {
    return {
        restrict : "E",
        scope    : {
            form : "=",
            isSelected: "="
        },
        require     : "ngModel",
        templateUrl : "app/product/views/templates/nsProductPhoto.html",
        link(scope, element, attrs, ngModel) {
            ngModel.$render = function () {
                if (ngModel.$modelValue) {
                    scope.product = ngModel.$modelValue;
                }
            };
        },
        controller : [
            "$scope", function ($scope) {
                $scope.switchDefaultImage = function (image, product) {
                    if (image.default) {
                        for (var i = 0, leni = product.images.length; i < leni; i++) {
                            const _iId = product.images[i]._id ? product.images[i]._id : product.images[i].name;
                            const _imageId = image._id ? image._id : image.name;
                            if (product.images[i].default && _iId !== _imageId && product.images[i].name !== image.name) {
                                product.images[i].default = false;
                            }
                        }
                    } else {
                        for (var i = 0, leni = product.images.length; i < leni; i++) {
                            const _iId = product.images[i]._id ? product.images[i]._id : product.images[i].name;
                            const _imageId = image._id ? image._id : image.name;
                            if (!product.images[i].default && _iId !== _imageId && product.images[i].name !== image.name) {
                                product.images[i].default = true;
                                break;
                            }
                        }
                    }
                };

                $scope.removeImage = function (index) {
                    let defaultImage = $scope.product.images[index].default;
                    $scope.product.images.sort((a, b) => a.position - b.position).splice(index, 1);
                    if ($scope.product.images.length > 0 && defaultImage) {
                        $scope.product.images[0].default = true;
                    }
                };

                $scope.getImageUrl = function (image) {
                    return `images/products/300x300-50/${image._id}/${image.title}${image.extension}`;
                };
            }
        ]
    };
});

ProductDirectives.directive("nsProductCrossSelling", function () {
    return {
        restrict : "E",
        scope    : {
            product    : "=", form       : "=", isEditMode : "=", lang       : "="
        },
        templateUrl : "app/product/views/templates/nsProductCrossSelling.html",
        controller  : [
            "$scope", "$modal", "ProductsV2", function ($scope, $modal, ProductsV2) {
                $scope.associatedPrds = [];
                if ($scope.isEditMode) {
                    $scope.$watch("product.code", function (newVal, oldVal) {
                        if (newVal) {
                            ProductsV2.list({PostBody: {filter: {_id: {$in: $scope.product.associated_prds}}, structure: '*', limit: 99}}, function ({datas, count}) {
                                for (let prd of datas) {
                                    prd.images = prd.images.filter(i => i.default)
                                }
                                $scope.associatedPrds = datas;
                            });
                        }
                    });
                }

                $scope.selectProducts = function () {
                    const modalInstance = $modal.open({
                        templateUrl : "app/product/views/modals/selectproducts.html",
                        controller  : "SelectProductsCtrl",
                        backdrop: 'static',
                        windowClass : "modal-big",
                        scope       : $scope,
                        resolve     : {
                            queryFilter() {
                                return {
                                    type : $scope.product.type
                                };
                            }
                        }
                    });
                    modalInstance.result.then(function (products) {
                        $scope.associatedPrds = $scope.associatedPrds.concat(products);
                        $scope.product.associated_prds = $scope.associatedPrds.map(function (item) {
                            return item._id;
                        });
                    });
                };
                $scope.removeElementAssociatedPrds = function (index) {
                    $scope.associatedPrds.splice(index, 1);
                    if($scope.selectedProducts){
                        let index2 = $scope.selectedProducts.indexOf($scope.associatedPrds[index])
                        $scope.selectedProducts.splice(index2, 1);
                    }
                    $scope.product.associated_prds = $scope.associatedPrds.map(function (item) {
                        return item._id;
                    });
                };
            }
        ]
    };
});

ProductDirectives.directive("nsProductCategories", function () {
    return {
        restrict : "E",
        scope    : {
            product     : "=",
            lang        : "=",
            isEditMode  : "=",
            productType : "=?",
            form        : "="
        },
        templateUrl : "app/product/views/templates/nsProductCategories.html",
        controller  : 'nsProductCategories'
    };
});