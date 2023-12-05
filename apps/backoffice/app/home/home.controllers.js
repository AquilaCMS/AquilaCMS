var HomeControllers = angular.module('aq.home.controllers', []);

HomeControllers.controller('HomeCtrl', ['$scope', '$http', '$location', function ($scope, $http, $location)
{
    $scope.obj = {loading : true};
    $http({url: '/v2/adminInformation', method: 'GET'}).then((response) => {
        $scope.adminInformation = response.data;
    });

    $scope.closeInfo = function (code) {
        $http({url: '/v2/adminInformation/' + code, method: 'DELETE'});
        $scope.adminInformation = $scope.adminInformation.filter(el => el.code != code);
    };


    /**
     * Load global stats
     */
    loadGlobalStats = function() {
        $http({ url: '/v2/statistics/globale', method: 'GET' }).then((response) => {
            $scope.adminStats = response.data;
            $scope.obj.loading = false;
        });
    }();

}]);
