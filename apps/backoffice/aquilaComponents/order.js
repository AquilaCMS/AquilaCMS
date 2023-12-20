angular.module('aqCOrder', []).directive('nsOrder', function () {
    return {
        restrict: 'E',
        replace: true,
        scope: {},
        templateUrl: "aquilaComponents/order.html",
        controller: ['$scope', 'Order', function ($scope, Order) {
                Order.query(function(orders){
                   $scope.orders = orders;
                });
                
                $scope.convertToDate = function(stringDate){
                    return new Date(stringDate);
                };
        }]
    };
});