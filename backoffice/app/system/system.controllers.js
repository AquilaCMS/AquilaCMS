const SystemControllers = angular.module("aq.system.controllers", []);

SystemControllers.controller("systemGeneralController", [
    "$scope", "NSConstants", "System", "$http", "toastService",
    function ($scope, NSConstants, System, $http, toastService) {
        console.log('yess');
    }
]);



