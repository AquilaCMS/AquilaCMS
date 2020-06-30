const ProductVirtualController = angular.module('aq.productVirtual.controllers', []);

ProductVirtualController.controller('ProductVirtualCtrl', ['$scope', '$location', '$controller', 'toastService', 'ProductsV2', '$routeParams', '$filter',
    function ($scope, $location, $controller, toastService, ProductsV2, $routeParams, $filter) {
        angular.extend(this, $controller('SimpleProductCtrl', {$scope: $scope}));

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
    }
]);
