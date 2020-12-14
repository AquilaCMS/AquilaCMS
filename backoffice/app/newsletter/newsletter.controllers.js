var NewsletterControllers = angular.module("aq.newsletter.controllers", []);

NewsletterControllers.controller("NewsletterListCtrl", [
    "$scope", "$location", "$rootScope", "NewsletterV2", function ($scope, $location, $rootScope, NewsletterV2)
    {
        $scope.newsletters = [];
        $scope.page = 1;
        $scope.currentPage = 1;
        $scope.totalItems = 0;
        $scope.nbItemsPerPage = 12;
        $scope.maxSize = 10;
        $scope.filter = {};
        $scope.sort = {type: "createdAt", reverse: true};

        $scope.getNewsletters = function (page)
        {
            var filter = {};
            var sort = {};

            sort[$scope.sort.type] = $scope.sort.reverse ? -1 : 1;

            var filterKeys = Object.keys($scope.filter);
            for(let i = 0, leni = filterKeys.length; i < leni; i++)
            {
                if($scope.filter[filterKeys[i]])
                {
                    filter[filterKeys[i]] = {$regex: $scope.filter[filterKeys[i]].toString(), $options: "i"};
                }
            }

            NewsletterV2.list({action: 'distinct'}, {PostBody: {filter, sort, limit: $scope.nbItemsPerPage, page}}, function(response) {
                $scope.newsletters = response.datas;
                $scope.totalItems = response.count;
            })
        };

        $scope.goToNewsletterDetails = function (name)
        {
            $location.path("/client/newsletter/" + name);
        };

        $scope.getNewsletters(1)
    }
]);

NewsletterControllers.controller("NewsletterDetailCtrl", [
    "$scope", "NewsletterV2",'$rootScope', "$routeParams",
    function ($scope, NewsletterV2, $rootScope, $routeParams)
    {
        $scope.users = [];
        $scope.newsletter = null;
        $scope.page = 1;
        $scope.currentPage = 1;
        $scope.totalItems = 0;
        $scope.nbItemsPerPage = 12;
        $scope.maxSize = 10;
        $scope.filter = {};
        $scope.sort = {type: "createdAt", reverse: true};

        $scope.getNewsletter = function (page = 1)
        {
            var filter = {};
            var sort = {};

            NewsletterV2.list({}, {PostBody: {filter: {'segment.name': $routeParams.name}, limit: $scope.nbItemsPerPage, page}}, function(response) {
                $scope.users = response.datas;
                $scope.totalItems = response.count;
                $scope.newsletter = response.datas[0].segment.find(function (seg) {
                    return seg.name === $routeParams.name;
                });
            })
        };

        $scope.getUserSubscribtionDate = function (user) {
            const sub = user.segment.find(seg => seg.name === $routeParams.name)
            return sub.date_subscribe;
        }

        $scope.getUserOptin = function (user) {
            const sub = user.segment.find(seg => seg.name === $routeParams.name)
            return sub.optin;
        }

        $scope.downloadEmails = function () {
            NewsletterV2.list({}, {PostBody: {filter: {'segment.name': $routeParams.name}, limit: 99999}}, function(response) {
                var element = angular.element('');
                var anchor = angular.element('<a/>');
                anchor.attr({
                    href: 'data:attachment/csv;charset=utf-8,' + encodeURI(response.datas.map(function(data) {
                        const segment = data.segment.find(function(seg) { return seg.name === $routeParams.name})
                        return `${data.email},${segment.date_subscribe},${segment.optin}`
                    }).join('\r\n')),
                    target: '_blank',
                    download: $routeParams.name + '_emails_list.csv'
                })[0].click();
            })
        }

        $scope.getNewsletter();
    }
]);