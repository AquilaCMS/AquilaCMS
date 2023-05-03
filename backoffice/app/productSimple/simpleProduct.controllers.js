
const SimpleProductControllers = angular.module("aq.simpleProduct.controllers", []);

SimpleProductControllers.controller("SimpleProductCtrl", [
    "$scope", "$filter", "$location", "$modal", "ProductService", "AttributesV2", "$routeParams", "toastService", "CategoryV2",
    "ImportedProductImage", "$http", "ProductsV2", "LanguagesApi", "$translate", "SetAttributesV2", "ProductsTabs","HookProductInfo",
    function ($scope, $filter, $location, $modal, ProductService, AttributesV2, $routeParams, toastService, CategoryV2, ImportedProductImage, $http, ProductsV2, LanguagesApi, $translate, SetAttributesV2, ProductsTabs, HookProductInfo) {
        $scope.isEditMode = false;
        $scope.disableSave = false;
        $scope.additionnalTabs = ProductsTabs;
        $scope.nsUploadFiles = {
            isSelected: false
        };
        $scope.hookProductInfo = HookProductInfo;

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
                    if ($scope.product.translation && $scope.product.translation[$scope.adminLang] && $scope.product.translation[$scope.adminLang].canonical) {
                        ProductsV2.preview($scope.product, function (response) {
                            if (response && response.url) {
                                window.open(response.url)
                            }
                        });
                    } else {
                        toastService.toast('danger', $translate.instant("simple.impossibleGeneratedURL"))
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

            $scope.product.price = { purchase: 0, et: { normal: 0 }, ati: { normal: 0 } };
            $scope.product.stock = { qty: 0, qty_booked: 0 };
            $scope.product.associated_prds = [];
            // $scope.product.cmsBlocks = [];
            $scope.product.characteristics = [];
        }

        if ($routeParams.code !== "new") {
            $scope.isEditMode = true;

            ProductsV2.query({ PostBody: { filter: { code: $routeParams.code, type: $routeParams.type }, structure: '*', populate: ["set_attributes", "associated_prds"], withPromos: false } }, function (product) {
                $scope.product = product;

                $scope.genAttributes();

                if ($scope.product.images && $scope.product.images.length > 0 && ImportedProductImage.component_template !== "") {
                    for (let i = 0; i < $scope.product.images.length; i++) {
                        $scope.product.images[i].component_template = ImportedProductImage.component_template;
                    }
                }
            });

            ProductsV2.getPromos({ PostBody: { filter: { code: $routeParams.code }, structure: '*' } }, function (result) {
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
                            ProductCoherence.getCoherence({ id: $scope.product._id }, function (response) {
                                $scope.modal.data = response.content;
                            });
                            $scope.modal = { data: '' };
                            $scope.trustHtml = function () {
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
                    const newCode = prompt($translate.instant("simple.inputCode"));
                    if (newCode) {
                        const newPrd = {...$scope.product, code: newCode };
                        const query = ProductsV2.duplicate(newPrd);
                        query.$promise.then(function (savedPrd) {
                            toastService.toast("success", $translate.instant("simple.productDuplicate"));
                            $location.path(`/products/${savedPrd.type}/${savedPrd.code}`);
                        }).catch(function (e) {
                            if($scope.isEditMode) {
                                toastService.toast("danger", $translate.instant("simple.codeExists"));
                            } else {
                                toastService.toast("danger", $translate.instant("global.standardError"));
                            }
                        });
                    }
                },
                icon: '<i class="fa fa-clone" aria-hidden="true"></i>',
                isDisplayed: $scope.isEditMode
            }
        ];

        $scope.genAttributes = function () {
            angular.forEach($scope.product.attributes, function (attributeI) {
                AttributesV2.query({ PostBody: { filter: { code: attributeI.code }, structure: '*' } }, function (attribute) {
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

        function checkForm(fieldsToCheck) {
            let text = "";
            for (let oneField of fieldsToCheck) {
                const elt = document.querySelector(`label[for="${oneField}"]`);
                const translationToCheck = ["name"];  // TODO : you may need to add string here (also in bundleProduct)
                if (translationToCheck.includes(oneField)) {
                    for (let oneLang of $scope.languages) {
                        if ($scope.product.translation && $scope.product.translation[oneLang.code] && $scope.product.translation[oneLang.code][oneField] && $scope.product.translation[oneLang.code][oneField] != "") {
                            //good
                        } else {
                            text += `name (${oneLang.name}), `;
                        }
                    }
                } else {
                    if (elt) {
                        if (elt.control && elt.control.value == "") {
                            if (elt.innerText) {
                                text += `${elt.innerText}, `;
                            }
                        }
                    }
                }
            }
            return text;
        }

        $scope.saveProduct = function (product, isQuit) {
            if ($scope.nsUploadFiles.isSelected) {
                let response = confirm($translate.instant("confirm.fileAttachedNotSaved"));
                if (!response) { return }
            }
            let attrsErrors = false;
            // Utilisé pour afficher les messages d'erreur au moment de la soumission d'un formulaire
            $scope.form.nsSubmitted = true;

            let strInvalidFields = "";
            if ($scope.form.$invalid) {
                if ($scope.form.$error && $scope.form.$error.required) {
                    $scope.form.$error.required.forEach((requiredField, index) => {
                        strInvalidFields += checkForm([requiredField.$name]);
                    });
                }
            } else {
                strInvalidFields = checkForm(["name"]);
            }
            //we remove ", "
            if (strInvalidFields.substring(strInvalidFields.length - 2, strInvalidFields.length) == ", ") {
                strInvalidFields = strInvalidFields.substring(0, strInvalidFields.length - 2)
            }
            if (strInvalidFields != "") {
                const text = $translate.instant("product.toast.notValid");
                toastService.toast("danger", `${text} : ${strInvalidFields}`);
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
                            const text1 = $translate.instant("attriibute.toast.invalidPart1");
                            const text2 = $translate.instant("attriibute.toast.invalidPart2");
                            toastService.toast("danger", `${text1} ${attr.translation[$scope.lang].name}(${lang}) ${text2}`);
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
                        toastService.toast("success", $translate.instant("simple.productSaved"));
                        if($scope.product.type !== $routeParams.type) {
                            window.location.hash = `/products/${savedPrd.type}/${savedPrd.code}`
                        }
                        if ($scope.isEditMode) {
                            $scope.disableSave = false;
                            savedPrd.set_attributes = $scope.product.set_attributes;
                            $scope.product = savedPrd;
                            $scope.genAttributes();
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
            if (confirm($translate.instant("confirm.deleteProduct"))) {
                ProductsV2.delete({ id: _id }, function () {
                    toastService.toast("success", $translate.instant("simple.deleteDone"));
                    $location.path("/products");
                }, function () {
                    toastService.toast("danger", $translate.instant("simple.errorDelete"));
                });
            }
        };


        $scope.cancel = function () {
            $location.path("/products");
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




    }
]);
