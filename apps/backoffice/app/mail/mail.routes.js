var MailRoutes = angular.module('aq.mail.routes', ['ngRoute']);

MailRoutes.config(['$routeProvider', function ($routeProvider) {
    $routeProvider.when('/mails', {
        templateUrl: 'app/mail/views/mail-list.html',
        controller: 'MailListCtrl',
        resolve: {
            loggedin: checkLoggedin,
            checkAccess: checkAccess('mails'),
        }
    })
    .when('/mails/:mailId', {
        templateUrl: 'app/mail/views/mail-detail.html',
        controller: 'MailDetailCtrl',
        resolve: {
            loggedin: checkLoggedin,
            checkAccess: checkAccess('mails'),
        }
    }).when('/mails/:mailId/test/:type', {
        templateUrl: 'app/mail/views/mail-detail-test.html',
        controller: 'MailDetailTestCtrl',
        resolve: {
            loggedin: checkLoggedin,
            checkAccess: checkAccess('mails'),
        }
    });
}]); 