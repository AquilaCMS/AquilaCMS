var WYSIWYGDirectives = angular.module("aq.WYSIWYG", []);

WYSIWYGDirectives.directive("wframe", [
    function ()
    {
        var linker = function (scope, $element, attrs, ctrl)
        {
            scope.$watch("sync", function ()
            {
                $element[0].contentDocument.head.innerHTML = "<style>" +
                    "[ns-code], ns-cms, ns-menu, ns-cross, ns-cross-selling, ns-slider, ns-gallery, ns-block-slider, ns-calendar, ns-blog-articles {display: block; text-align: center; border: 3px outset #000000; padding: 5px;}" +
                    "[ns-code]:after, ns-cms:after, ns-menu:after, ns-cross:after, ns-cross-selling:after, ns-slider:after, ns-gallery:after, ns-block-slider:after, ns-calendar:after, ns-blog-articles:after {content: 'Composant Aquila';}" +
                    "</style>";
            });
        };
        return {
            link: linker,
            require: "ngModel",
            replace: true,
            restrict: "AE"
        };
    }
]);
