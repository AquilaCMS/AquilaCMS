var SiteRoutes = angular.module('aq.site.routes', ['ngRoute']);

SiteRoutes.config(['$routeProvider',
    function ($routeProvider) {

        $routeProvider.when('/site/articles', {
            name: 'articles',
            controller: 'ArticlesSiteCtrl',
            templateUrl: 'app/site/views/articles.site.html',
            resolve: {
                loggedin: checkLoggedin,
                checkAccess: checkAccess('articles')
            }
        }).when('/site/articles/new', {
            name: 'articles',
            controller: 'ArticlesNewSiteCtrl',
            templateUrl: 'app/site/views/articles-new.site.html',
            resolve: {
                loggedin: checkLoggedin,
                checkAccess: checkAccess('articles')
            }
        }).when('/site/articles/detail/:_id', {
            name: 'articles',
            controller: 'ArticlesDetailSiteCtrl',
            templateUrl: 'app/site/views/articles-detail.site.html',
            resolve: {
                loggedin: checkLoggedin,
                checkAccess: checkAccess('articles')
            }
        });
    }]);
