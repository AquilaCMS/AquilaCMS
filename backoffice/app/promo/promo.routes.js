var PromoRoutes = angular.module('aq.promo.routes', ['ngRoute']);

PromoRoutes.config(['$routeProvider', function ($routeProvider) {
    $routeProvider.when('/promos', {
        templateUrl: 'app/promo/views/promo-list.html',
        controller: 'PromoListCtrl',
        resolve: {
            loggedin: checkLoggedin,
            checkAccess: checkAccess('promos'),
        }
    })
    .when('/promos/:promoId', {
        templateUrl: 'app/promo/views/promo-detail.html',
        controller: 'PromoDetailCtrl',
        resolve: {
            loggedin: checkLoggedin,
            checkAccess: checkAccess('promos'),
        }
    });
}]); 