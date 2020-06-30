var ProductReviewsRoutes = angular.module('aq.productReviews.routes', ['ngRoute']);

ProductReviewsRoutes.config(['$routeProvider',
    function ($routeProvider) {
        $routeProvider
                .when('/reviews', {
                    templateUrl: 'app/productReviews/views/productReviews-list.html',
                    controller: 'ProductReviewListCtrl',
                    resolve: {
                        loggedin: checkLoggedin,
                        checkAccess: checkAccess('reviews')
                    }
                })
                .when('/reviews/:reviewId', {
                    templateUrl: 'app/productReviews/views/productReviews-detail.html',
                    controller: 'ProductReviewDetailCtrl',
                    resolve: {
                        loggedin: checkLoggedin,
                        checkAccess: checkAccess('reviews')
                    }
                });
    }]);