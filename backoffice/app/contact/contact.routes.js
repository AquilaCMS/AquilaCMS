var ContactRoutes = angular.module('aq.contact.routes', ['ngRoute']);

ContactRoutes.config(['$routeProvider',
    function ($routeProvider) {
        $routeProvider
            .when('/contacts', {
                templateUrl: 'app/contact/views/contact-list.html',
                controller: 'ContactListCtrl',
                resolve: {
                    loggedin: checkLoggedin,
                    checkAccess: checkAccess('contacts')
                }
            }).when('/contact/:id', {
                templateUrl: 'app/contact/views/contact-detail.html',
                controller: 'ContactDetailsCtrl',
                resolve: {
                    loggedin: checkLoggedin,
                    checkAccess: checkAccess('contacts')
                }
            });

    }]);