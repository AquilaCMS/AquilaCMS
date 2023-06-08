let ProductDirectives = angular.module("aq.product.directives", []);

ProductDirectives.directive("nsProductsList", function () {
    return {
        restrict : "E",
        scope    : {
            onSelect: "=", // to override the on-select function
            queryFilter: "=",
            selectedProducts: "=", // array of object with contains _id
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
                
                if(typeof $scope.selectedProducts === "undefined" || $scope.selectedProducts == null) {
                    $scope.selectedProducts = [];
                }

                $scope.defaultLang = $rootScope.languages.find(function (lang) {
                    return lang.defaultLanguage;
                }).code;

                $scope.onSelectFunction = function (product, $event) {
                    if(typeof $scope.onSelect === "undefined" || $scope.onSelect == null) {
                        // "normal" onSelect
                        const indexInSelected = $scope.selectedProducts.findIndex((element)=> {
                            return element._id == product._id;
                        });
                        if(indexInSelected == -1) {
                            // we add a style to the product array
                            product.style = {"background-color": "#3f51b5", "color": "white"};
                            product._selected = true;
                            // we add it into selected product
                            $scope.selectedProducts.push(product);
                        } else {
                            // we remove the product for the product array
                            delete product.style;
                            delete product._selected;
                            // we delete the product from seletected array
                            const indexInProducts = $scope.selectedProducts.findIndex((element)=> {
                                return element._id == product._id;
                            });
                            $scope.selectedProducts.splice(indexInProducts, 1);
                        }
                    } else {
                        $scope.onSelect(product, $event);
                    }
                }

                // Pagination
                $scope.onPageChange = function (page) {
                    SuppliersV2.list({PostBody: {filter: {}, structure: '*', limit: 0}}, function ({datas}) {
                        $scope.suppliers = {"": ""};
                        for (let i = 0; i < datas.length; i++) {
                            $scope.suppliers[datas[i]._id] = datas[i].name;
                        }

                        const filter = angular.copy($scope.queryFilter);
                        // Si pagination avec recherche
                        //console.log("open popup");
                        // if ($scope.f.nameFilter.length > 0) {
                        const select = `{"code": 1, "images": 1, "supplier_ref": 1, "translation": 1}`
                        const paramsV2 = {
                            lang: $scope.defaultLang,
                            filter: {}, // q: $scope.f.nameFilter
                            select,
                            limit: $scope.nbItemsPerPage,
                            page
                        };
                        // TODO adminList : Edit prd, popup crossselling call this. Pb with filter, etc
                        ProductsV2.list(paramsV2, function (res) {
                            $scope.products = res.datas;
                            $scope.addStyle();
                            $scope.totalItems = res.count;
                        });
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
                $scope.addStyle = function () {
                    for (oneSelectProduct of $scope.selectedProducts) {
                        if(typeof oneSelectProduct != "undefined " && oneSelectProduct){
                            let index = $scope.products.findIndex((element) => {
                                return oneSelectProduct._id == element._id
                            })
                            if(index != -1) {
                                $scope.products[index].style = {"background-color": "#3f51b5", "color": "white"};
                                $scope.products[index]._selected = true;
                            }
                        }
                    }
                };


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

                    const select = `{"code": 1, "images": 1, "supplier_ref": 1, "translation": 1}`
                    const paramsV2 = {
                        lang: $scope.defaultLang,
                        filter: filterObj,
                        select,
                        limit: $scope.nbItemsPerPage,
                        page: 1
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
                        $scope.addStyle(); //we colorize product already added
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

ProductDirectives.directive("nsProductDeclinaisons", function () {
    return {
        restrict : "E",
        scope    : {
            product     : "=", lang        : "=", isEditMode  : "=", form        : "="
        },
        templateUrl : "app/product/views/templates/nsProductDeclinaisons.html",
        controller  : ['$scope', 'AttributesV2', '$modal', function($scope, AttributesV2, $modal) {
            $scope.declinaisons = []
            $scope.selectedVariant = -1;
            $scope.selectedVariantValue = {}

            AttributesV2.list({PostBody: {
                filter: {
                    isVariantable: true
                },
                limit: 99
            }}, function(data) {
                $scope.declinaisons = data.datas;
            });

            $scope.createPrds = function () {
                $scope.product.variants_values = []
                const variantNames                                       = [];
                for (const variant of $scope.product.variants) {
                    variantNames.push(variant.translation[$scope.lang].values);
                }
                const f         = (a, b) => [].concat(...a.map((d) => b.map((e) => [].concat(d, e))));
                const cartesian = (a, b, ...c) => (b ? cartesian(f(a, b), ...c) : a);
                const result    = cartesian(...variantNames);
                for (const [index, variantName] of result.entries()) {
                    const variant = {
                        code        : `${$scope.product.code}-${(typeof variantName === 'string' ? variantName : variantName.join('-')).replace(' ', '-').toLowerCase()}`,
                        active      : false,
                        weight      : $scope.product.weight,
                        default     : index === 0,
                        price       : $scope.product.price,
                        stock       : $scope.product.stock,
                        images      : $scope.product.images,
                        variant_codes: (typeof variantName === 'string' ? variantName : variantName.join('--')).toLowerCase(),
                        translation : {}
                    };
                    variant.translation[$scope.lang] = {name: `${$scope.product.translation[$scope.lang].name} ${typeof variantName === 'string' ? variantName : variantName.join('/')}`};
                    $scope.product.variants_values.push(variant);
                }
            }

            $scope.toggleVariant = function (e, variant) {
                e.stopPropagation()
                if(e.target.checked) {
                    if(!$scope.product.variants) $scope.product.variants = []
                    $scope.product.variants.push({
                        ...variant,
                        type: 'image'
                    })
                } else {
                    $scope.product.variants = $scope.product.variants.filter(v => v.code !== variant.code)
                }
                if($scope.product?.variants?.length > 0) {
                    $scope.createPrds()
                } else {
                    $scope.product.variants_values = []
                    $scope.product.variants = []
                }
            }

            $scope.selectVariantValue = function (variantValue, index) {
                if(!$scope.product?.variants_values[0]._id)  return;

                $scope.selectedVariantValue = variantValue
                const ogSelectedVariantValue = angular.copy(variantValue)
                $modal.open({
                    windowClass: "modal-large",
                    templateUrl: "app/product/views/modals/modalVariantValue.html",
                    controller: [
                        "$scope", "$filter", "$modalInstance",
                        function ($scope, $filter, $modalInstance) {
                            $scope.close = function() {
                                $modalInstance.close()
                            }
                            $scope.cancel = function() {
                                $scope.product.variants_values[index] = ogSelectedVariantValue
                                $scope.close();
                            }
                        }
                    ],
                    scope: $scope
                })
            }

            $scope.vartiantValueDetails = function (variant) {
                $scope.selectedIndex = $scope.product.variants.findIndex( v => v.code === variant.code)
            }

            $scope.isVariantSelected = function (variant) {
                return $scope.product.variants && $scope.product.variants.find(v => v.code === variant.code) ? true : false
            }

            $scope.setDeclinaisonType = function (code, type) {
                const index = $scope.product.variants.findIndex(v => v.code === code)
                if(index > -1) {
                    $scope.product.variants[index].type = type
                }
            }

            $scope.setDefaultVariantValue = function (value, e) {
                e.stopPropagation()
                $scope.product.variants_values.map((val) => {
                    val.default = false
                    return val
                })
                value.default = true;
            }

            $scope.getProductVariantIndex = function (code) {
                return $scope.product.variants.findIndex(v => v.code === code)
            }

            $scope.updateVariantType = function (value) {
                if (value === 'list2') {
                    for (let i = 0; i < $scope.product.variants.length; i++) {
                        $scope.product.variants[i].type = value;
                    }
                } else {
                    for (let i = 0; i < $scope.product.variants.length; i++) {
                        if ($scope.product.variants[i].type === 'list2') {
                            $scope.product.variants[i].type = value;
                        }
                    }
                }
            }

            $scope.getImageUrl = function (variant) {
                let defaultImage = variant.images.find(img => img.default)
                if(!defaultImage) defaultImage = variant.images[0] || {}
                return `images/${variant._id ? 'productsVariant' : 'products'}/150x150-50/${defaultImage._id}/${defaultImage.title || 'img'}${defaultImage.extension || '.jpg'}`;
            };

            $scope.activateAllVariants = function () {
                $scope.product.variants_values = $scope.product.variants_values.map(function(vv) {vv.active = true; return vv})
            }

            $scope.disableAllVariants = function () {
                $scope.product.variants_values = $scope.product.variants_values.map(function(vv) {vv.active = false; return vv})
            }
        }]
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

                        SuppliersV2.list({PostBody: {filter: {}, structure: '*', limit: 0}}, function ({datas}) {
                            scope.supplierList = datas;

                        });
                    }
                };
            },
            controller : [
                "$scope", "$filter", "TrademarksV2", "SuppliersV2", "FamilyV2", function ($scope, $filter, TrademarksV2, SuppliersV2, FamilyV2) {
                    $scope.supplier = {};
                    $scope.trademarkList = [];
                    TrademarksV2.list({PostBody: {filter: {}, structure: '*', limit: 0}}, function({datas}) {
                        $scope.trademarkList = datas
                    });

                    FamilyV2.list({PostBody: {filter: {}, structure: '*', limit: 0}}, function ({datas}) {
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
                                prices.ati[fields[1]] = parseFloat((prices.et[fields[1]] * vat).aqlRound(2));
                            } else {
                                removeFields = true;
                            }
                        } else {
                            if (prices.ati[fields[1]] !== undefined && prices.ati[fields[1]] != null) {
                                prices.et[fields[1]] = parseFloat((prices.ati[fields[1]] / vat).aqlRound(2));
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
                            prices.ati.normal = parseFloat((prices.et.normal * vat).aqlRound(2));
                        }
                        if (prices.et && prices.et.special !== undefined && prices.et.special != null) {
                            prices.ati.special = parseFloat((prices.et.special * vat).aqlRound(2));
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
            isSelected: "=", variantId: "="
        },
        require     : "ngModel",
        templateUrl : "app/product/views/templates/nsProductPhoto.html",
        link(scope, element, attrs, ngModel) {
            ngModel.$render = function () {
                if (ngModel.$modelValue) {
                    scope.product = ngModel.$modelValue;
                    scope.product.images = scope.product.images.map((img) => {
                        return {
                            ...img,
                            isYoutube: !!img.content
                        }
                    })
                }
            };
        },
        controller : [
            "$scope", "$modal", function ($scope, $modal) {
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

                $scope.removeImage = function (imgUrl) {
                    const index = $scope.product.images.findIndex(img => img.url === imgUrl)
                    let defaultImage = $scope.product.images[index].default;
                    $scope.product.images.splice(index, 1);
                    if ($scope.product.images.length > 0 && defaultImage) {
                        $scope.product.images[0].default = true;
                    }
                };

                $scope.getImageUrl = function (image, variantImageId) {
                    const imageName = image.title ? image.title : image.name;
                    return `images/${variantImageId ? 'productsVariant' : 'products'}/300x300-50/${variantImageId ? variantImageId : image._id}/${imageName}${image.extension}`;
                };

                $scope.switchType = function (image) {
                    if(image.content) {
                        image.content = undefined
                    } else {
                        image.url = undefined
                    }
                }

                $scope.addMovie = function () {
                    const modalInstance = $modal.open({
                        templateUrl : "app/product/views/modals/add-youtube-video.html",
                        backdrop: 'static',
                        scope       : $scope,
                        controller  : ['$scope', '$modalInstance', function($scope, $modalInstance) {
                            $scope.item = {
                                name: '',
                                content: ''
                            }
                            $scope.saveVideo = function () {
                                $modalInstance.close($scope.item)
                            }
                            $scope.close = function () {
                                $modalInstance.dismiss()
                            }
                        }],
                        resolve     : {
                            queryFilter() {
                                return {
                                    type : $scope.product.type
                                };
                            },
                            productSelected(){
                                return $scope.associatedPrds;
                            }
                        }
                    });
                    modalInstance.result.then(function (item) {
                        $scope.product.images.push({
                            name: item.name, alt: item.name, isYoutube: true, content: item.content, title: item.name
                        })
                    });
                }
            }
        ]
    };
});

ProductDirectives.directive("nsProductCrossSelling", function () {
    return {
        restrict : "E",
        scope    : {
            product    : "=",
            form       : "=",
            isEditMode : "=",
            lang       : "="
        },
        templateUrl : "app/product/views/templates/nsProductCrossSelling.html",
        controller  : [
            "$scope", "$modal", "ProductsV2", function ($scope, $modal, ProductsV2) {
                $scope.associatedPrds = [];
                if ($scope.isEditMode) {
                    $scope.$watch("product.code", function (newVal, oldVal) {
                        if (newVal) {
                            ProductsV2.list({filter: {_id: {$in: $scope.product.associated_prds}}, select: '{}', limit: 0}, function ({datas, count}) {
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
                            },
                            productSelected(){
                                return $scope.associatedPrds;
                            }
                        }
                    });
                    modalInstance.result.then(function (products) {
                        $scope.associatedPrds = products;
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
                }
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