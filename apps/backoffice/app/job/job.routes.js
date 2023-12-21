var JobRoutes = angular.module('aq.job.routes', ['ngRoute']);

JobRoutes.config(['$routeProvider', function ($routeProvider) {
    $routeProvider.when('/jobs', {
        templateUrl: 'app/job/views/job-list.html',
        controller: 'JobListCtrl',
        resolve: {
            loggedin: checkLoggedin,
            checkAccess: checkAccess('jobs'),
        }
    }).when('/jobs/:jobId', {
        templateUrl: 'app/job/views/job-detail.html',
        controller: 'JobDetailCtrl',
        resolve: {
            loggedin: checkLoggedin,
            checkAccess: checkAccess('jobs'),
        }
    });
}]); 