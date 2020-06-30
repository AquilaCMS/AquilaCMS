var PaymentMethodControllers = angular.module("aq.paymentMethod.controllers", []);

PaymentMethodControllers.controller("PaymentMethodListCtrl", [
    "$scope", "$location", "PaymentMethodV2", function ($scope, $location, PaymentMethodV2)
    {
        $scope.sortType = "name"; // set the default sort type
        $scope.sortReverse = false;  // set the default sort order

        PaymentMethodV2.list({PostBody: {filter: {}, limit: 99, structure: '*'}}, function ({datas})
        {
            $scope.paymentMethods = datas;
        });

        $scope.goToPaymentMethodDetails = function (methodCode)
        {
            $location.path("/paymentMethods/" + methodCode);
        };

    }
]);

PaymentMethodControllers.controller("PaymentMethodDetailCtrl", [
    "$scope", "$routeParams", "PaymentMethodV2", "$location", "toastService", "$rootScope",
    function ($scope, $routeParams, PaymentMethodV2, $location, toastService, $rootScope)
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
                toastService.toast("success", "Sauvegarde effectuée");
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
