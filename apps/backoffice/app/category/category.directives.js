const CategoryDirectives = angular.module("aq.category.directives", []);

CategoryDirectives.directive("nsCategoryList", function () {
    return {
        restrict: "E",
        scope: {
            categoryIsChecked: "=",
            categoryIsDisabled: "=",
            categoryOnClick: "=",
        },
        templateUrl: "app/category/views/templates/ns-category-list-directives.html",
        controller: 'NsCategoryListController'
    };
});