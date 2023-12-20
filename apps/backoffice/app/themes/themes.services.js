const ThemesService = angular.module("aq.themes.services", ["ngResource"]);


ThemesService.service("Themes", [
    "$resource", function ($resource) {
        return $resource("v2/themes/:type/:action", {}, {
            list           : {method: "POST", params: {}},
            packageInstall : {method: "POST", params: {type: "package", action: "install"}},
            packageBuild   : {method: "POST", params: {type: "package", action: "build"}},
            delete         : {method: "POST", params: {type: "delete"}},
            copyData       : {method: "POST", params: {type: "copyDatas"}},
            save           : {method: "POST", params: {type: "save", action: "before"}},
            saveAfter      : {method: "POST", params: {type: "save", action: "after"}},
            info           : {method: "GET",  params: {type: "informations"}}
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
