var NewsletterRoutes = angular.module('aq.newsletter.routes', ['ngRoute']);

NewsletterRoutes.config(['$routeProvider',

    function ($routeProvider) {

        $routeProvider
        .when('/client/newsletters', {
            templateUrl: 'app/newsletter/views/newsletter-list.html',
            controller: 'NewsletterListCtrl',
            resolve: {
                loggedin: checkLoggedin,
				checkAccess: checkAccess('newsletters'),
            }
        })
        .when('/client/newsletter/:name', {
            templateUrl: 'app/newsletter/views/newsletter-detail.html',
            controller: 'NewsletterDetailCtrl',
            resolve: {
                loggedin: checkLoggedin,
				checkAccess: checkAccess('newsletters'),
            }
        });

    }]);