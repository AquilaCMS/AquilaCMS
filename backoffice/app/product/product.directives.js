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
                        if ($scope.f.nameFilter.length > 0) {
                            ProductsV2.adminList({filter, q: $scope.f.nameFilter, page, limit: $scope.nbItemsPerPage}, function ({datas, count}) {
                                $scope.products = products;
                                $scope.totalItems = count;
                            });
                        } else {
                            ProductsV2.list({PostBody: {filter, structure: '*', limit: $scope.nbItemsPerPage, page}}, function ({datas, count}) {
                                $scope.products = datas;
                                $scope.totalItems = count;
                            });
                        }

                        // $scope.queryFilter.supplier_ref = "";
                    });
                };
                $scope.changeTri = function () {
                    ProductTri.search($scope.pagination, function (productsList) {
                        $scope.products = productsList;
                    });
                };
                // modifie le style css en selectionnee et de cette maniere il permet de garder le champ selectione lors du changement de page
                $scope.getSelectStyle = function (product) {
                    for (let i = 0; i < $scope.$parent.selectedProducts.length; i++) {
                        if ($scope.$parent.selectedProducts[i]._id == product._id) {
                            if ($scope.$parent.selectedProducts[i]._selected) {
                                return "background-color: #3f51b5;color: white;";
                            }

                            return "background-color: #3f51b5;color: white;";
                        }
                    }
                    return "background-color: '';color: '';";
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
                    const filter = angular.copy($scope.queryFilter);
                    const searchObj = {
                        code : '',
                        translation : {
                            name : ''
                        }
                    };
                    searchObj.translation.name = $scope.f.nameFilter;
                    searchObj.code = $scope.f.codeFilter;

                    if (filter.supplier_ref == "") {
                        delete filter.supplier_ref;
                    }
                    if ($scope.f.nameFilter.length > 0 || $scope.f.codeFilter.length > 0) {
                        ProductsV2.adminList({filter, page: 1, limit: $scope.nbItemsPerPage, searchObj}, function (res) {
                            $scope.products = res.products;
                            $scope.totalItems = res.count;
                            $scope.currentPage = 1;
                        });
                    } else {
                        filter.page = 1;
                        filter.limit = $scope.nbItemsPerPage;
                        ProductsV2.list({PostBody: {filter, structure: '*', limit: $scope.nbItemsPerPage, page: 1}}, function (res) {
                            $scope.products = res.datas;
                            $scope.totalItems = res.count;
                            $scope.currentPage = 1;
                        });
                    }
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
                $scope.taxerate = [];
                $scope.lang = "";

                $scope.lang = $rootScope.languages.find(function (lang) {
                    return lang.defaultLanguage;
                }).code;
                $scope.langs = $rootScope.languages;

                ConfigV2.taxerate(function (taxerate) {
                    $scope.taxerate = taxerate;
                    if ($scope.taxerate.length > 0 && ($scope.product === undefined || $scope.product.price === undefined || $scope.product.price.tax === undefined)) {
                        // $scope.product.price.tax = $scope.taxerate[$scope.taxerate.length - 1].rate;
                        $scope.product.price.tax = 0;
                    }
                });


                ConfigV2.stockOrder(function (cfg) {
                    if (Object.keys(cfg).length > 2) {
                        $scope.stockLabels = cfg.labels;
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
                        if (prices.et.normal !== undefined && prices.et.normal != null) {
                            prices.ati.normal = parseFloat((prices.et.normal * vat).toFixed(2));
                        }
                        if (prices.et.special !== undefined && prices.et.special != null) {
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
                    $scope.product.associated_prds = $scope.associatedPrds.map(function (item) {
                        return item._id;
                    });
                };
            }
        ]
    };
});
