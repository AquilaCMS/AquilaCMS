PaymentMethodDirectives = angular.module('aq.paymentMethod.directives',[]);

PaymentMethodDirectives.directive('chequeConfig', function(){
    return {
        restrict: 'E',
        templateUrl: 'app/paymentMethod/views/templates/chequeConfig.html'
    };
});

PaymentMethodDirectives.directive('transferConfig', function(){
    return {
        restrict: 'E',
        templateUrl: 'app/paymentMethod/views/templates/transferConfig.html'
    };
});