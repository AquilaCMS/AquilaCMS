var BundleProductControllers = angular.module("aq.bundleProduct.controllers", []);

BundleProductControllers.controller("BundleProductCtrl", [
    "$scope", "$http", "$location", "$modal", "ProductService", "$routeParams", "AttributesV2", "toastService", "CategoryV2",
    "BundleSectionDisplayModes", "ProductsV2","SetAttributesV2", "ProductsTabs", "$translate",
    function ($scope, $http, $location, $modal, ProductService, $routeParams, AttributesV2, toastService, CategoryV2, BundleSectionDisplayModes, ProductsV2, SetAttributesV2, ProductsTabs, $translate)
    {   
        $scope.isEditMode = false;
        $scope.disableSave = false;
        $scope.promos = [];
        $scope.displayModes = BundleSectionDisplayModes;
        $scope.additionnalTabs = ProductsTabs;
        $scope.nsUploadFiles = {
            isSelected: false
        };

        SetAttributesV2.list({ PostBody: { filter: { type: 'products' }, limit: 0 } }, function ({ datas }) {
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
            AttributesV2.list({ PostBody: { filter: { set_attributes: $scope.product.set_attributes._id, _type: 'products' }, limit: 0 } }, function ({ datas }) {
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
                        toastService.toast("danger", "product.toast.URLcanonical");
                        const event = new CustomEvent('displayCanonicalModal');
                        window.dispatchEvent(event);
                    }
                },
            }
        ]

        if($routeParams.code !== "new")
        {
            $scope.isEditMode = true;

            ProductsV2.query({PostBody: {filter: {code: $routeParams.code, type: 'bundle'}, structure: '*', populate: ["set_attributes", "bundle_sections.products.id", "associated_prds"], withPromos: false}}, function (product)
            {
                $scope.product = product;

                $scope.genAttributes();
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

        $scope.genAttributes = function ()
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

        $scope.removeBundleSection = function (section) {
            if(confirm($translate.instant("bundle.msg.deleteSelection"))){
                $scope.product.bundle_sections.splice($scope.product.bundle_sections.indexOf(section), 1);
            }
        };

        $scope.addBundleProduct = function (section) {
            var modalInstance = $modal.open({
                templateUrl: "app/product/views/modals/selectproducts.html",
                controller: "SelectProductsCtrl",
                windowClass: "modal-big",
                scope: $scope,
                resolve: {
                    queryFilter: function (){
                        return {
                            type: "simple"
                        };
                    },
                    productSelected(){
                        let newObj = [];
                        for(let oneProd of section.products){
                            oneProd.id.modifier = {
                                modifier_weight: oneProd.modifier_weight,
                                modifier_price: oneProd.modifier_price
                            }
                            newObj.push(oneProd.id);
                        }
                        return newObj;
                    }
                }
            });
            modalInstance.result.then(function (products) {
                section.products = products.map((item) => {
                    let productReturned       = {};
                    productReturned.id        = item;
                    productReturned.isDefault = false;
                    if(item.modifier){
                        if(item.modifier.modifier_price){
                            productReturned.modifier_price = item.modifier.modifier_price;
                        }
                        if(item.modifier.modifier_weight){
                            productReturned.modifier_weight = item.modifier.modifier_weight
                        }
                    }
                    return productReturned;
                });
            });
        };

        $scope.removeBundleProduct = function (section, product)
        {
            section.products.splice(section.products.indexOf(product), 1);
        };

        $scope.recalculate = function (target, prd) {
            const fields = target.split(".");
            const vat = $scope.product.price.tax / 100 + 1;

            if (fields.length > 1) {
                let removeFields = false;

                if (fields[1] === "et") {
                    if (prd.modifier_price.et !== undefined && prd.modifier_price.et != null) {
                        prd.modifier_price.ati = parseFloat((prd.modifier_price.et * vat).aqlRound(2));
                    } else {
                        removeFields = true;
                    }
                } else {
                    if (prd.modifier_price.ati !== undefined && prd.modifier_price.ati != null) {
                        prd.modifier_price.et = parseFloat((prd.modifier_price.ati / vat).aqlRound(2));
                    } else {
                        removeFields = true;
                    }
                }

                if (removeFields) {
                    delete prd.modifier_price.et;
                    delete prd.modifier_price.ati;
                }
            } else {
                if (prd.modifier_price.et !== undefined && prd.modifier_price.et != null) {
                    prd.modifier_price.ati = parseFloat((prd.modifier_price.et * vat).aqlRound(2));
                }
                if (prd.modifier_price.et !== undefined && prd.modifier_price.et != null) {
                    prd.modifier_price.ati = parseFloat((prd.modifier_price.et * vat).aqlRound(2));
                }
            }
        };

        function checkForm(fieldsToCheck){
            let text = "";
            for(let oneField of fieldsToCheck){
                const elt = document.querySelector(`label[for="${oneField}"]`);
                const translationToCheck = ["name"]; // TODO : you may need to add string here (also in simpleProduct)
                if(translationToCheck.includes(oneField)){
                    for(let oneLang of $scope.languages){
                        if($scope.product.translation && $scope.product.translation[oneLang.code] && $scope.product.translation[oneLang.code][oneField] && $scope.product.translation[oneLang.code][oneField] != ""){
                        //good
                        }else{
                            text += `name (${oneLang.name}), `;
                        }
                    }
                }else{
                    if (elt) {
                        if(elt.control && elt.control.value == ""){
                            if(elt.innerText){
                                text += `${elt.innerText}, `;
                            }
                        }
                    }
                }
            }
            return text;
        }

        $scope.saveProduct = function (product, isQuit)
        {
            if ($scope.nsUploadFiles.isSelected) {
                let response = confirm($translate.instant("confirm.fileAttachedNotSaved"));
                if (!response) { return }
            }
            var attrsErrors = false;
            //Utilisé pour afficher les messages d'erreur au moment de la soumission d'un formulaire
            $scope.form.nsSubmitted = true;

            product.bundle_sections.forEach(function (section)
            {
                section.products = section.products.map(function (item)
                {
                    const prd = {id: item.id, isDefault: item.isDefault};
                    if (item.modifier_price && item.modifier_price.ati) {
                        prd.modifier_price = item.modifier_price;
                    } else {
                        prd.$unset = {modifier_price: ""}
                    }
                    if (item.modifier_weight) {
                        prd.modifier_weight = item.modifier_weight;
                    } else {
                        prd.$unset = {modifiers_weight: ""}
                    }
                    return prd;
                });
            });

            let strInvalidFields = "";
            if ($scope.form.$invalid) {
                if ($scope.form.$error && $scope.form.$error.required) {
                    $scope.form.$error.required.forEach((requiredField, index) => {
                        strInvalidFields += checkForm([requiredField.$name]);
                    });
                }
            }else{
                strInvalidFields = checkForm(["name"]);
            }
            //we remove ", "
            if(strInvalidFields.substring(strInvalidFields.length-2, strInvalidFields.length) == ", "){
                strInvalidFields = strInvalidFields.substring(0, strInvalidFields.length-2)
            }
            if(strInvalidFields != ""){
                const text = $translate.instant("product.toast.notValid");
                toastService.toast("danger", `${text} : ${strInvalidFields}`);
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
                        toastService.toast("success", $translate.instant("bundle.product.productSaved"));
                        if($scope.product.type !== $routeParams.type) {
                            window.location.hash = `/products/${savedPrd.type}/${savedPrd.code}`
                        }
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
                            $location.path(window.location.href);
                        }
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
            if (confirm($translate.instant("confirm.deleteProduct")))
            {
                ProductsV2.delete({id: _id}).$promise.then(function ()
                {
                    $location.path("/products");
                }, function ()
                {
                    toastService.toast("danger", $translate.instant("bundle.product.errorDeleting"));
                });
            }
        };


        $scope.cancel = function ()
        {
            $location.path("/products");
        };

        
        $scope.moreButtons = [
            {
                text: 'product.general.coherenceTitle',
                onClick: function () {
                    $modal.open({
                        templateUrl: 'app/product/views/modals/coherence.html',
                        controller: function ($scope, $modalInstance, $sce, productSolv, ProductCoherence) {
                            $scope.product = productSolv;
                            ProductCoherence.getCoherence({id : $scope.product._id}, function(response){
                                $scope.modal.data = response.content;
                            });
                            $scope.modal = {data : ''};
                            $scope.trustHtml = function(){
                                return $sce.trustAsHtml($scope.modal.data);
                            }
                            $scope.cancel = function () {
                                $modalInstance.close('cancel');
                            };
                        },
                        resolve: {
                            productSolv: function () {
                                return $scope.product;
                            },
                        }
                    });
                },
                icon: '<i class="fa fa-puzzle-piece" aria-hidden="true"></i>',
                isDisplayed: $scope.isEditMode
            },
            {
                text: 'product.button.dup',
                onClick: function (){
                    var clone = angular.copy($scope.product);
                    clone.code = prompt($translate.instant("bundle.product.inputCode"));
                    ProductsV2.duplicate(clone, function (savedPrd)
                    {
                        if(!savedPrd)
                        {
                            $location.path("/products");
                        }
                        else
                        {
                            toastService.toast("success", $translate.instant("bundle.product.productSaved"));
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
                        if(err.status === 409) {
                            toastService.toast("danger", $translate.instant("simple.codeExists"));
                        } else {
                            toastService.toast("danger", $translate.instant("bundle.product.errorSaving"));
                        }
                        $scope.disableSave = false;
                    });
                },
                moreText: '<i class="fa fa-clone" aria-hidden="true"></i>',
                isDisplayed: $scope.isEditMode
            }
        ];



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
