var TrademarkControllers = angular.module('aq.trademark.controllers', []);

TrademarkControllers.controller('TrademarkListCtrl', ['$scope', '$location', 'TrademarksV2', 'TrademarkSearch', 'nsDataTableConfig',
    function ($scope, $location, TrademarksV2, TrademarkSearch, nsDataTableConfig){
    
    $scope.trademarks = [];
    $scope.filter = {};
    
    $scope.getTradeMarks = function(){
        let filter = {};
        const filterKeys = Object.keys($scope.filter);
        for (let i = 0, leni = filterKeys.length; i < leni; i++) {
            if($scope.filter[filterKeys[i]] === null){
                break;
            }
            if($scope.filter[filterKeys[i]].toString() != ""){
                filter[filterKeys[i]] = { $regex: $scope.filter[filterKeys[i]].toString(), $options: "i" };
            }
        }
        TrademarksV2.list({PostBody: {filter, structure: '*', limit: 99}}, function({datas}) {
            $scope.trademarks = datas
        });
    }
    
    $scope.getTradeMarks();

    $scope.editTrademark = function(trademark){
        $location.path('/trademarks/' + trademark._id);
    };

}]);

TrademarkControllers.controller('TrademarkDetailCtrl', ['$scope', '$location', '$http', '$q', '$routeParams', 'toastService', 'TrademarksV2', function ($scope, $location, $http, $q, $routeParams, toastService, TrademarksV2)
{
    $scope.trademark = {}

    TrademarksV2.query({PostBody: {filter: {_id: $routeParams.trademarkId}, structure: '*'}}, function (data)
    {
        $scope.trademark = data;
    });

    $scope.updateTrademark = function (updt)
    {
        TrademarksV2.save($scope.trademark)
    };
    
    $scope.removeTrademark = function(trademark){
        if(confirm("Voulez-vous supprimer cette marque ?")){
            $location.path("/trademarks");
            toastService.toast("success", 'Suppression effectuée');
            return TrademarksV2.delete({id: trademark._id}).$promise;
        }
    };

    $scope.save = function (data, isQuit) {
        TrademarksV2.save($scope.trademark, function (msg) {

            if (msg._id) {
                console.log("Trademark Saved!");
                toastService.toast("success", 'Marque sauvegardée');
                if (isQuit) {
                    $location.path("/trademarks");
                }
            }
            else {
                toastService.toast("warning", 'Entrez une valeur pour le nom');
                console.error("Error!");
            }
        });
    };

}]);

TrademarkControllers.controller('TrademarkNewCtrl', ['$scope', '$location', 'toastService', 'TrademarksV2', function ($scope, $location, toastService, TrademarksV2)
{

    $scope.master = {
        name: '', _id: ''
    };

    $scope.reset = function ()
    {
        $scope.trademark = angular.copy($scope.master);
    };

    $scope.save = function (data)
    {
        TrademarksV2.save(data, function (msg)
        {
            if(msg._id)
            {
                console.log("Trademark Saved!");
                toastService.toast("success", 'Marque sauvegardée');
                $location.path("/trademarks");
            }
            else
            {
                toastService.toast("warning", 'Entrez une valeur pour le nom');
                console.error("Error!");
            }
        });
    };

    $scope.reset();

}]);