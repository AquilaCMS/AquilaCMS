var TrademarkControllers = angular.module('aq.trademark.controllers', []);

TrademarkControllers.controller('TrademarkListCtrl', ['$scope', '$location', 'TrademarksV2', 'TrademarkSearch', 'nsDataTableConfig',
    function ($scope, $location, TrademarksV2, TrademarkSearch, nsDataTableConfig){
    
    $scope.trademarks = [];
    $scope.filter = {};
    $scope.currentPage = 1;
    $scope.totalItems = 0;
    
    $scope.getTradeMarks = function(page = 1){
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
        TrademarksV2.list({PostBody: {filter, structure: '*', limit: 12, page: page}}, function({datas, count}) {
            $scope.trademarks = datas
            $scope.totalItems = count
            $scope.currentPage = page
        });
    }
    
    $scope.getTradeMarks();

    $scope.editTrademark = function(trademark){
        $location.path('/trademarks/' + trademark._id);
    };

}]);

TrademarkControllers.controller('TrademarkDetailCtrl', ['$scope', '$location', '$http', '$q', '$routeParams', 'toastService', 'TrademarksV2','$translate', 'ProductsV2', function ($scope, $location, $http, $q, $routeParams, toastService, TrademarksV2, $translate, ProductsV2)
{
    $scope.trademark = {}

    $scope.totalItems = 0
    $scope.currentPage = 1

    $scope.getTradeMarkPrds = function (trdmk, page = 1) {
        const select = `{"code": 1, "images": 1, "active": 1, "_visible": 1, "stock.qty": 1,  "type": 1, "price.ati.normal": 1, "translation": 1}`; 
        ProductsV2.list({filter: {'trademark.code': trdmk.code}, limit: 12, page, select}, function (result) {
            $scope.products = result.datas
            $scope.totalItems = result.count
            $scope.currentPage = page
        })
    }

    TrademarksV2.query({PostBody: {filter: {_id: $routeParams.trademarkId}, structure: '*'}}, function (data)
    {
        $scope.trademark = data;
        $scope.getTradeMarkPrds(data, 1)
        $scope.isEditMode = true;
    });

    $scope.updateTrademark = function (updt)
    {
        TrademarksV2.save($scope.trademark)
    };
    
    $scope.removeTrademark = function(trademark){
        if (confirm($translate.instant("confirm.deleteTrademark"))){
            $location.path("/trademarks");
            toastService.toast("success", $translate.instant("global.deleteDone"));
            return TrademarksV2.delete({id: trademark._id}).$promise;
        }
    };

    $scope.save = function (data, isQuit) {
        TrademarksV2.save($scope.trademark, function (msg) {

            if (msg._id) {
                console.log("Trademark Saved!");
                toastService.toast("success", $translate.instant("trademark.detail.markSaved"));
                if (isQuit) {
                    $location.path("/trademarks");
                }
            }
            else {
                toastService.toast("warning", $translate.instant("trademark.detail.nameValue"));
                console.error("Error!");
            }
        }, function(error){
            if(error.data){
                if(error.data.message && error.data.message != ""){
                    toastService.toast("danger",  error.data.message);
                }
            }else if(error && error.code != ""){
                toastService.toast("danger", error.code);
            }else{
                toastService.toast("danger", $translate.instant("global.error"));
            }
        });
    };
    
    $scope.getImage = function(trademark) {
        return `/images/trademark/200x180-70/${trademark._id}/${trademark.logo.split('\\').pop().split('/').pop()}`;
    }

    $scope.goToProductDetails = function (productType, productCode) {
        $location.path("/products/" + productType + "/" + productCode);
    };

}]);

TrademarkControllers.controller('TrademarkNewCtrl', ['$scope', '$location', 'toastService', 'TrademarksV2', '$translate', function ($scope, $location, toastService, TrademarksV2, $translate)
{

    $scope.master = {
        name: '', _id: ''
    };

    $scope.isEditMode = false;

    $scope.reset = function ()
    {
        $scope.trademark = angular.copy($scope.master);
    };

    $scope.save = function (data)
    {
        if(data.name != ""){
            TrademarksV2.save(data, function (msg) {
                if(msg._id) {
                    console.log("Trademark Saved!");
                    toastService.toast("success", $translate.instant("trademark.detail.markSaved"));
                    $location.path("/trademarks/"+msg._id);
                } else {
                    toastService.toast("warning", $translate.instant("trademark.detail.nameValue"));
                    console.error("Error!");
                }
            }, function(error){
                if(error.data){
                    if(error.data.message && error.data.message != ""){
                        toastService.toast("danger",  $translate.instant("trademark.detail.errorName"));
                    }
                }else if(error && error.code != ""){
                    toastService.toast("danger", error.code);
                }else{
                    toastService.toast("danger", $translate.instant("global.error"));
                }
            });
        }else{
            toastService.toast("warning", $translate.instant("trademark.detail.enterValue"));
        }
    };

    $scope.reset();

}]);