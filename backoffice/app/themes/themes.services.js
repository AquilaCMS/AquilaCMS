const ThemesService = angular.module("aq.themes.services", ["ngResource"]);


ThemesService.service("Themes", [
    "$resource", function ($resource) {
        return $resource("v2/themes", {}, {
            list : {method: "POST", param: {}}
        });
    }
]);


ThemesService.service("ThemeConfig", [
    "$resource", function ($resource) {
        return $resource("v2/themeConfig", {}, {
            query: { method: "POST", param: {} },
            update: { method: "PUT", param:{}}
        });
    }
]);
