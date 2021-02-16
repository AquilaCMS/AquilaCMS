
const SimpleProductControllers = angular.module("aq.simpleProduct.controllers", []);

SimpleProductControllers.controller("SimpleProductCtrl", [
    "$scope", "$filter", "$location", "$modal", "ProductService", "AttributesV2", "$routeParams", "toastService", "CategoryV2",
    "ImportedProductImage", "$http", "ProductsV2", "LanguagesApi", "$translate", "SetAttributesV2", "ProductsTabs",
    function ($scope, $filter, $location, $modal, ProductService, AttributesV2, $routeParams, toastService, CategoryV2, ImportedProductImage, $http, ProductsV2, LanguagesApi, $translate, SetAttributesV2, ProductsTabs) {
        $scope.isEditMode = false;
        $scope.disableSave = false;
        $scope.additionnalTabs = ProductsTabs;
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
                icon: '<i class="fa fa-eye" aria-hidden="true"></i>',
            }
        ];



        $scope.init = function () {
            $scope.product = ProductService.getProductObject();
            $scope.product.type = "simple";

            $scope.product.price = {purchase: 0, et: {normal: 0}, ati: {normal: 0}};
            $scope.product.stock = {qty: 0, qty_booked: 0};
            $scope.product.associated_prds = [];
            // $scope.product.cmsBlocks = [];
            $scope.product.characteristics = [];
        }

        if ($routeParams.code !== "new") {
            $scope.isEditMode = true;

            ProductsV2.query({PostBody: {filter: {code: $routeParams.code, type: $routeParams.type}, structure: '*', populate: ["set_attributes", "associated_prds"], withPromos: false}}, function (product) {
                $scope.product = product;

                genAttributes();
                getCategories();
                
                if ($scope.product.images && $scope.product.images.length > 0 && ImportedProductImage.component_template !== "") {
                    for (let i = 0; i < $scope.product.images.length; i++) {
                        $scope.product.images[i].component_template = ImportedProductImage.component_template;
                    }
                }
            });

            ProductsV2.getPromos({PostBody: {filter: {code: $routeParams.code}, structure: '*'}}, function (result) {
                $scope.promos = result.datas ? result.datas.promos : [];
            });
        } else {
            $scope.init();
        }

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
                onClick: function () {
                    const newCode = prompt("Saisir le code du nouveau produit : ");
                    if (newCode) {
                        const newPrd = {...$scope.product, code: newCode};
                        delete newPrd._id;
                        const query = ProductsV2.duplicate(newPrd);
                        query.$promise.then(function (savedPrd) {
                            toastService.toast("success", "Produit dupliqué !");
                            $location.path(`/products/${savedPrd.type}/${savedPrd.code}`);
                        }).catch(function (e) {
                            toastService.toast("danger", "Le code existe déjà");
                        });
                    }
                },
                icon: '<i class="fa fa-clone" aria-hidden="true"></i>',
                isDisplayed: $scope.isEditMode
            }
        ];

        function genAttributes() {
            angular.forEach($scope.product.attributes, function (attributeI) {
                AttributesV2.query({PostBody: {filter: {_id: attributeI.id}, structure: '*'}}, function (attribute) {
                    const langKeys = Object.keys(attribute.translation);

                    if (attributeI.translation === undefined) {
                        attributeI.translation = {};
                    }

                    for (let i = 0; i < langKeys.length; i++) {
                        if (attributeI.translation[langKeys[i]] === undefined) {
                            attributeI.translation[langKeys[i]] = {};
                        }

                        attributeI.translation[langKeys[i]].name = attribute.translation[langKeys[i]].name;
                        if (attribute.type === "Intervalle" && attributeI.translation[langKeys[i]].value && attributeI.translation[langKeys[i]].value.length > 0) {
                            attributeI.translation[langKeys[i]].min = attributeI.translation[langKeys[i]].value.min();
                            attributeI.translation[langKeys[i]].max = attributeI.translation[langKeys[i]].value.max();
                        }

                        if (attribute.translation[langKeys[i]].values) {
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

        $scope.langChange = function (lang) {
            $scope.lang = lang;
        };

        $scope.saveProduct = function (product, isQuit) {
            if ($scope.nsUploadFiles.isSelected) {
                let response = confirm("La pièce jointe n'est pas sauvegardée, êtes vous sûr de vouloir continuer ?");
                if (!response) { return }
            }
            let attrsErrors = false;
            // Utilisé pour afficher les messages d'erreur au moment de la soumission d'un formulaire
            $scope.form.nsSubmitted = true;

            if ($scope.form.$invalid) {
                let strInvalidFields = "";
                if ($scope.form.$error && $scope.form.$error.required) {
                    $scope.form.$error.required.forEach((requiredField, index) => {
                        const elt = document.querySelector(`label[for="${requiredField.$name}"]`);
                        if (index === 0) {
                            strInvalidFields = ": ";
                        }
                        if (elt && elt.innerText) {
                            if ($scope.form.$error.required.length - 1 === index) {
                                strInvalidFields += `${elt.innerText}`;
                            } else {
                                strInvalidFields += `${elt.innerText}, `;
                            }
                        }
                    });
                }
                toastService.toast("danger", `Les informations saisies ne sont pas valides${strInvalidFields}`);
                return;
            }

            for (let i = 0; i < product.attributes.length; i++) {
                const attr = product.attributes[i];
                if (attr.type === "Intervalle") {
                    const attrTransKeys = Object.keys(attr.translation);
                    for (let j = 0; j < attrTransKeys.length; j++) {
                        const lang = attrTransKeys[j];
                        attr.translation[$scope.lang].value = [];
                        if (attr.translation[$scope.lang].min <= attr.translation[$scope.lang].max) {
                            for (let k = attr.translation[$scope.lang].min; k < attr.translation[$scope.lang].max + 1; k++) {
                                attr.translation[$scope.lang].value.push(k);
                            }

                            delete attr.translation[$scope.lang].min;
                            delete attr.translation[$scope.lang].max;
                        } else if (attr.translation[$scope.lang].min !== undefined && attr.translation[$scope.lang].max !== undefined && attr.translation[$scope.lang].min !== "" && attr.translation[$scope.lang].max !== "") {
                            attrsErrors = true;
                            toastService.toast("danger", `Le minimum de l'attribut ${attr.translation[$scope.lang].name}(${lang}) est plus grand que le maximum`);
                        }
                    }
                }
            }

            if (attrsErrors === false) {
                $scope.disableSave = !$scope.isEditMode;

                ProductsV2.save(product, function (savedPrd) {
                    if (isQuit) {
                        $location.path("/products");
                    } else {
                        toastService.toast("success", "Produit sauvegardé !");
                        if ($scope.isEditMode) {
                            $scope.disableSave = false;
                            savedPrd.set_attributes = $scope.product.set_attributes;
                            $scope.product = savedPrd;
                            genAttributes();
                        } else {
                            window.location.href = `#/products/${savedPrd.type}/${savedPrd.code}`;
                            $location.path(window.location.href);
                        }
                    }
                }, function (err) {
                    if (err.data.translations && err.data.translations[$scope.adminLang]) {
                        toastService.toast("danger", err.data.translations[$scope.adminLang]);
                    } else if (err.data.message) {
                        toastService.toast("danger", err.data.message);
                    } else {
                        toastService.toast("danger", err.data);
                    }
                    $scope.disableSave = false;
                });
            }
        };

        $scope.removeProduct = function (_id) {
            if (confirm("Etes-vous sûr de vouloir supprimer ce produit ?")) {
                ProductsV2.delete({id: _id}, function () {
                    toastService.toast("success", "Suppression éffectuée");
                    $location.path("/products");
                }, function () {
                    toastService.toast("danger", "Une erreur est survenue lors de la suppression.");
                });
            }
        };


        $scope.cancel = function () {
            $location.path("/products");
        };

        $scope.getCategoriesLink = function (){
            if($scope.product._id) {
                CategoryV2.list({PostBody: {filter: {'productsList.id': $scope.product._id}, limit: 99, structure: {active: 1, translation: 1}}}, function (categoriesLink){
                    $scope.categoriesLink = categoriesLink.datas;
                });
            }
        };


        $scope.momentDate = function (date) {
            if (date === null) {
                return '*';
            }
            return moment(date).format('L');
        };

        $scope.detail = function (promo) {
            $location.url(`/promos/${promo._id}`);
        };



        /*----------------------------------------------------------------- Catory tab -------------------------------------------------------------------*/

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
            CategoryV2.save({_id: node._id, productsList: tab}, function () {

            });
        };

        function getCategories() {
            CategoryV2.list({PostBody: {filter: {['ancestors.0']: {$exists: false}}, populate: ["children"], sort: {displayOrder: 1}, structure: '*', limit: 99}}, function (response)
            {
                $scope.categories = response.datas;
                //we expand all the categories
                $scope.expandAll();
            });
        }
        
        $scope.catDisabled = function (node){
            let final = false;
            if(node.action == "page"){
                final = true;
            }else{
                for(let oneChild of node.productsList){
                    if(oneChild.id == $scope.product._id){
                        final = !oneChild.checked;
                        break;
                    }
                }
            }
            return final;
        };

        $scope.catCheck = function (node){
            let final = false;
            for(let oneChild of node.productsList){
                if(oneChild.id == $scope.product._id){
                    final = true;
                    break;
                }
            }
            return final;
        };

        $scope.expandAll = function(){
            for(let oneCat of $scope.categories){
                CategoryV2.list({PostBody: {filter: {_id: {$in: oneCat.children.map((child) => child._id)}}, populate: ["children"], sort: {displayOrder: 1}, structure: '*', limit: 99}}, function (response) {
                    oneCat.nodes = response.datas;
                    $scope.$broadcast('angular-ui-tree:expand-all');
                    for(let oneNode of oneCat.nodes){
                        CategoryV2.list({PostBody: {filter: {_id: {$in: oneNode.children.map((child) => child._id)}}, populate: ["children"], sort: {displayOrder: 1}, structure: '*', limit: 99}}, function (response) {
                            oneNode.nodes = response.datas;
                            $scope.$broadcast('angular-ui-tree:expand-all');
                        });
                    }
                });
            }
            //or use the $scope.listChildren()
        }

        $scope.listChildren = function (cat, scope) {
            CategoryV2.list({PostBody: {filter: {_id: {$in: cat.children.map((child) => child._id)}}, populate: ["children"], sort: {displayOrder: 1}, limit: 99}}, function (response) {
                cat.nodes = response.datas;
                scope.toggle();
            });
        };

    }
]);
