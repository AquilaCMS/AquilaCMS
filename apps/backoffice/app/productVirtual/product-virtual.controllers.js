const ProductVirtualController = angular.module('aq.productVirtual.controllers', []);

ProductVirtualController.controller('ProductVirtualCtrl', ['$scope', '$location', '$controller', 'toastService', 'ProductsV2', 'CategoryV2', '$routeParams', '$filter', 'SetAttributesV2','AttributesV2', '$modal', '$translate',
    function ($scope, $location, $controller, toastService, ProductsV2, CategoryV2, $routeParams, $filter, SetAttributesV2, AttributesV2, $modal, $translate) {
        angular.extend(this, $controller('SimpleProductCtrl', {$scope: $scope}));
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
                    ProductsV2.preview($scope.product, function (response) {
                        if (response && response.url) {
                            window.open(response.url)
                        }
                    });
                },
            }
        ]

        if ($routeParams.code === "new") {
            $scope.product.type = "virtual";
        }
        $scope.downloadHistory = []
        $scope.downloadHistoryFilters = {$and: [{"product.code": $routeParams.code}, { "user.email": {$regex: "", $options: 'i'}}]}
        $scope.downloadHistoryItemsPerPage = 20;
        $scope.downloadHistoryPage = 1;
        $scope.downloadHistoryCount = 0;

        $scope.getDownloadHistory = function (page = 1) {
            ProductsV2.getDownloadHistory({PostBody: {filter: $scope.downloadHistoryFilters, limit: $scope.downloadHistoryItemsPerPage, page: page, structure: '*'}}, function (response) {
                $scope.downloadHistory = response.datas
                $scope.downloadHistoryCount = response.count
                $scope.downloadHistoryPage = response.page
            })
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
                    const newCode = prompt($translate.instant("simple.inputCode"));
                    if (newCode) {
                        const newPrd = {...$scope.product, code: newCode};
                        const query = ProductsV2.duplicate(newPrd);
                        query.$promise.then(function (savedPrd) {
                            toastService.toast("success", $translate.instant("simple.productDuplicate"));
                            $location.path(`/products/${savedPrd.type}/${savedPrd.code}`);
                        }).catch(function (e) {
                            toastService.toast("danger", $translate.instant("simple.codeExists"));
                        });
                    }
                },
                icon: '<i class="fa fa-clone" aria-hidden="true"></i>',
                isDisplayed: $scope.isEditMode
            }
        ];
    }
]);
