var PaymentMethodControllers = angular.module("aq.paymentMethod.controllers", []);

PaymentMethodControllers.controller("PaymentMethodListCtrl", [
    "$scope", "$location", "PaymentMethodV2",
    function ($scope, $location, PaymentMethodV2) {
        $scope.sortType = "name"; // set the default sort type
        $scope.sortReverse = false;  // set the default sort order
        $scope.filter = {};

        $scope.getPaymentMethod = function() {
            let filter = {};
            const filterKeys = Object.keys($scope.filter);
            for (let i = 0, leni = filterKeys.length; i < leni; i++) {
                if($scope.filter[filterKeys[i]] === null){
                    break;
                }
                if(filterKeys[i].includes("active")) {
                    if($scope.filter.active == "true"){
                        filter["active"] = true;
                    }else if($scope.filter.active == "false"){
                        filter["active"] = false;
                    }
                } else if(filterKeys[i].includes("isDeferred")) {
                    if($scope.filter.isDeferred == "true"){
                        filter["isDeferred"] = true;
                    }else if($scope.filter.isDeferred == "false"){
                        filter["isDeferred"] = false;
                    }
                } else {
                    if (typeof ($scope.filter[filterKeys[i]]) === 'object'){
                        filter[filterKeys[i] + ".number"] = { $regex: $scope.filter[filterKeys[i]].number, $options: "i" };
                    }else{
                        if($scope.filter[filterKeys[i]].toString() != ""){
                            filter[filterKeys[i]] = { $regex: $scope.filter[filterKeys[i]].toString(), $options: "i" };
                        }
                    }
                }
            }
            PaymentMethodV2.list({PostBody: {filter, limit: 0, structure: '*'}}, function ({datas}) {
                $scope.paymentMethods = datas;
            });
        }

        $scope.getPaymentMethod();
        
        $scope.goToPaymentMethodDetails = function (methodCode) {
            $location.path("/paymentMethods/" + methodCode);
        };

    }
]);

PaymentMethodControllers.controller("PaymentMethodDetailCtrl", [
    "$scope", "$routeParams", "PaymentMethodV2", "$location", "toastService", "$rootScope", "$translate",
    function ($scope, $routeParams, PaymentMethodV2, $location, toastService, $rootScope, $translate)
    {

        $scope.defaultLang = $rootScope.languages.find(function (lang)
        {
            return lang.defaultLanguage;
        }).code;

        PaymentMethodV2.query({PostBody: {filter: {code: $routeParams.methodId}, structure: '*'}}, function (response)
        {
            $scope.method = response;
        });

        $scope.save = function (isQuit)
        {
            PaymentMethodV2.save($scope.method, function ()
            {
                toastService.toast("success", $translate.instant("global.saveDone"));
                if(isQuit)
                {
                    $location.path("/paymentMethods");
                }
            }, function (err)
            {
                toastService.toast("danger", err.data);
            });
        };
    }
]);
