var BundleProductControllers = angular.module("aq.bundleProduct.controllers", []);

BundleProductControllers.controller("BundleProductCtrl", [
    "$scope", "$http", "$location", "$modal", "ProductService", "$routeParams", "AttributesV2", "SetOption", "SetOptionId", "toastService", "CategoryV2",
    "BundleSectionDisplayModes", "ProductsV2", "ProductsV2","SetAttributesV2",
    function ($scope, $http, $location, $modal, ProductService, $routeParams, AttributesV2, SetOption, SetOptionId, toastService, CategoryV2, BundleSectionDisplayModes, ProductsV2, ProductsV2, SetAttributesV2)
    {   
        $scope.isEditMode = false;
        $scope.disableSave = false;
        $scope.promos = [];
        $scope.displayModes = BundleSectionDisplayModes;
        $scope.nsUploadFiles = {
            isSelected: false
        };

        SetAttributesV2.list({ PostBody: { filter: { type: 'products' }, limit: 99 } }, function ({ datas }) {
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

        

        $scope.loadNewAttrs = function () {
            AttributesV2.list({ PostBody: { filter: { set_attributes: $scope.product.set_attributes._id, _type: 'products' }, limit: 99 } }, function ({ datas }) {
                $scope.product.attributes = datas.map(function (attr) {
                    attr.id = attr._id;
                    delete attr._id;
                    return attr;
                });
            });
        };
        
        $scope.additionnalButtons = [
            {
                text: 'product.general.preview',
                onClick: function () {
                    if($scope.product.translation && $scope.product.translation[$scope.adminLang] && $scope.product.translation[$scope.adminLang].canonical) {
                        ProductsV2.preview($scope.product, function (response) {
                            if (response && response.url) {
                                window.open(response.url)
                            }
                        });
                    } else {
                        toastService.toast('danger', 'Impossible de générer l\'URL de test car pas de canonical')
                        const event = new CustomEvent('displayCanonicalModal');
                        window.dispatchEvent(event);
                    }
                },
            }
        ]

        if($routeParams.code !== "new")
        {
            $scope.isEditMode = true;

            ProductsV2.query({PostBody: {filter: {code: $routeParams.code, type: 'bundle'}, structure: '*', populate: ["set_attributes", "bundle_sections.products.id"], withPromos: false}}, function (product)
            {
                $scope.product = product;

                if($scope.product.set_options !== undefined)
                {
                    SetOptionId.fOne({id: $scope.product.set_options}, function (setOpt)
                    {
                        $scope.product.set_options_name = setOpt.name;
                    });
                }

                genAttributes();

                $scope.product.set_options_all = SetOption.query();
            });
            $scope.promos = ProductsV2.getPromos({PostBody: { filter: {code: $routeParams.code}, structure: '*'}}, function (result) {
                $scope.promos = result.datas.promos;
            });
        }
        else
        {
            init();
        }

        function init()
        {
            $scope.product = ProductService.getProductObject();
            $scope.product.type = "bundle";
            $scope.product.bundle_sections = [];
            $scope.product.set_options_all = SetOption.query();

            $scope.product.price = {purchase: 0, et: {normal: 0}, ati: {normal: 0}};
            $scope.product.qty = 0;
            $scope.product.margin = 0;
            $scope.product.associated_prds = [];
            // $scope.product.cmsBlocks = [];
            $scope.product.location = {
                images: []
            };
            $scope.product.characteristics = [];
        }

        function genAttributes()
        {
            angular.forEach($scope.product.attributes, function (attributeI)
            {
                AttributesV2.query({PostBody: {filter: {_id: attributeI.id}, structure: '*', populate: ['associated_prds']}}, function (attribute)
                {
                    var langKeys = Object.keys(attribute.translation);

                    if(attributeI.translation === undefined)
                    {
                        attributeI.translation = {};
                    }

                    for(var i = 0; i < langKeys.length; i++)
                    {
                        if(attributeI.translation[langKeys[i]] === undefined)
                        {
                            attributeI.translation[langKeys[i]] = {};
                        }

                        attributeI.translation[langKeys[i]].name = attribute.translation[langKeys[i]].name;
                        if(attribute.type === "Intervalle" && attributeI.translation[langKeys[i]].value && attributeI.translation[langKeys[i]].value.length > 0)
                        {
                            attributeI.translation[langKeys[i]].min = attributeI.translation[langKeys[i]].value.min();
                            attributeI.translation[langKeys[i]].max = attributeI.translation[langKeys[i]].value.max();
                        }

                        if(attribute.translation[langKeys[i]].values)
                        {
                            attributeI.translation[langKeys[i]].values = attribute.translation[langKeys[i]].values;
                        }
                    }

                    attributeI.type = attribute.type;
                    attributeI.code = attribute.code;
                    attributeI.param = attribute.param;
                    attributeI.position = attribute.position;
                });
            });
        }

        $scope.langChange = function (lang)
        {
            $scope.lang = lang;
        };

        $scope.removeImage = function (url) {
            $http.post('/medias/remove/', {url: url}).then(function ()
            {
                $scope.saveProduct($scope.product, false);
            });
        };

        $scope.addBundleSection = function ()
        {
            var modalInstance = $modal.open({
                templateUrl: "app/productBundle/views/modals/newBundleSection.html", controller: "NewBundleSectionCtrl"
            });
            modalInstance.result.then(function (bundleSection)
            {
                $scope.product.bundle_sections.push({
                    ref: bundleSection.ref,
                    type: bundleSection.type,
                    products: [],
                    isRequired: true
                });
            });
        };

        $scope.removeBundleSection = function (section)
        {
            $scope.product.bundle_sections.splice($scope.product.bundle_sections.indexOf(section), 1);
        };

        $scope.addBundleProduct = function (section)
        {
            var modalInstance = $modal.open({
                templateUrl: "app/product/views/modals/selectproducts.html", controller: "SelectProductsCtrl", windowClass: "modal-big", scope: $scope, resolve: {
                    queryFilter: function ()
                    {
                        return {
                            type: "simple"
                        };
                    }
                }
            });
            modalInstance.result.then(function (products)
            {
                var newProducts = products.map(function (item)
                {
                    return {id: item, isDefault: false};
                });
                section.products = section.products.concat(newProducts);
            });
        };

        $scope.removeBundleProduct = function (section, product)
        {
            section.products.splice(section.products.indexOf(product), 1);
        };

        $scope.saveProduct = function (product, isQuit)
        {
            if ($scope.nsUploadFiles.isSelected) {
                let response = confirm("La pièce jointe n'est pas sauvegardée, êtes vous sûr de vouloir continuer ?");
                if (!response) { return }
            }
            var attrsErrors = false;
            //Utilisé pour afficher les messages d'erreur au moment de la soumission d'un formulaire
            $scope.form.nsSubmitted = true;

            product.bundle_sections.forEach(function (section)
            {
                section.products = section.products.map(function (item)
                {
                    return {id: item.id, isDefault: item.isDefault};
                });
            });

            if($scope.form.$invalid)
            {
                toastService.toast("danger", "Les informations saisies ne sont pas valides");
                return;
            }

            for(var i = 0; i < product.attributes.length; i++)
            {
                var attr = product.attributes[i];
                if(attr.type === "Intervalle")
                {
                    var attrTransKeys = Object.keys(attr.translation);
                    for(var j = 0; j < attrTransKeys.length; j++)
                    {
                        var lang = attrTransKeys[j];
                        attr.translation[lang].value = [];
                        if(attr.translation[lang].min <= attr.translation[lang].max)
                        {
                            for(var k = attr.translation[lang].min; k < attr.translation[lang].max + 1; k++)
                            {
                                attr.translation[lang].value.push(k);
                            }

                            delete attr.translation[lang].min;
                            delete attr.translation[lang].max;
                        }
                        else if(attr.translation[lang].min !== undefined && attr.translation[lang].max !== undefined && attr.translation[lang].min !== "" && attr.translation[lang].max !== "")
                        {
                            attrsErrors = true;
                            toastService.toast("danger", "Le minimum de l'attribut " + attr.translation[lang].name + "(" + lang + ") est plus grand que le maximum");
                        }
                    }
                }
            }

            if(attrsErrors === false)
            {
                $scope.disableSave = !$scope.isEditMode;

                ProductsV2.save(product, function (savedPrd)
                {
                    if(isQuit)
                    {
                        $location.path("/products");
                    }
                    else
                    {
                        toastService.toast("success", "Produit sauvegardé !");
                        $scope.product = savedPrd;
                        // if($scope.isEditMode)
                        // {
                        //     $scope.disableSave = false;
                        //     genAttributes();
                        // }
                        // else
                        // {
                        //     window.location.href = "#/products/" + savedPrd.type + "/" + savedPrd.code;
                        //     window.location.reload();
                        // }
                        if(!$scope.isEditMode)
                        {
                            window.location.href = "#/products/" + savedPrd.type + "/" + savedPrd.code;
                        }
                        window.location.reload();
                    }
                }, function (err)
                {
                    if(err.data.translation && err.data.translation[$scope.lang])
                    {
                        toastService.toast("danger", err.data.translation[$scope.lang]);
                    }
                    else if(err.data.message)
                    {
                        toastService.toast("danger", err.data.message);
                    }
                    else
                    {
                        toastService.toast("danger", err.data);
                    }
                    $scope.disableSave = false;
                });
            }
        };

        $scope.removeProduct = function (_id)
        {
            if(confirm("Etes-vous sûr de vouloir supprimer ce produit ?"))
            {
                ProductsV2.delete({id: _id}).$promise.then(function ()
                {
                    $location.path("/products");
                }, function ()
                {
                    toastService.toast("danger", "Une erreur est survenue lors de la suppression.");
                });
            }
        };


        $scope.cancel = function ()
        {
            $location.path("/products");
        };

        $scope.getCategoriesLink = function ()
        {
            if($scope.product._id) {
                CategoryV2.list({PostBody: {filter: {'productsList.id': $scope.product._id}, limit: 99}}, function (categoriesLink)
                {
                    $scope.categoriesLink = categoriesLink.datas;
                });
            }
        };

        $scope.duplicateProduct = function ()
        {
            var clone = angular.copy($scope.product);
            clone.code = prompt("Saisir le code: ");
            delete clone._id;
            for (const key of Object.keys(clone.translation)) {
                clone.translation[key].slug += "-" + clone.code;
            }  
            ProductsV2.save(clone, function (savedPrd)
            {
                if(!savedPrd)
                {
                    $location.path("/products");
                }
                else
                {
                    toastService.toast("success", "Produit sauvegardé !");
                    if($scope.isEditMode)
                    {
                        $scope.disableSave = false;
                        $location.path("/products/" + savedPrd.type + "/" + savedPrd.code);
                    }
                    else
                    {
                        $location.path("/products/" + savedPrd.type + "/" + savedPrd.code);
                    }
                }
            }, function (err)
            {
                toastService.toast("danger", "Une erreur est survenue lors de la sauvegarde.");
                $scope.disableSave = false;
            });
        };


        $scope.momentDate = function (date) {
            if(date === null) {
                return '*'
            } 
            return moment(date).format('L')
        };

        $scope.detail = function (promo)
        {
            $location.url(`/promos/${promo._id}`);
        };
    }
]);

BundleProductControllers.controller("NewBundleSectionCtrl", [
    "$scope", "$modalInstance", "BundleSectionTypes", function ($scope, $modalInstance, BundleSectionTypes)
    {
        $scope.types = BundleSectionTypes;
        $scope.bundleSection = {type: $scope.types[0].code};

        $scope.validate = function (bundleSection)
        {
            $modalInstance.close(bundleSection);
        };

        $scope.cancel = function ()
        {
            $modalInstance.dismiss("cancel");
        };
    }
]);
