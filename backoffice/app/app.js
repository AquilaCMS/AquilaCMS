"use strict";

/* App Module */
var adminCatagenApp = angular.module("adminCatagenApp", [
    "ngRoute",
    "adminCatagenControllers",
    "adminCatagenFilters",
    "adminCatagenServices",
    "adminCatagenDirectives",
    "pascalprecht.translate",
    "ngSanitize",
    "xeditable",
    "ngFileUpload",
    "ui.bootstrap",
    "ui.sortable",
    "infinite-scroll",
    'ui.tinymce',
    "angular-bind-html-compile",
    "ngMessages",
    "aquilaCmsBlocks",
    "ui.tree",
    "angular-clipboard",
    "color.picker",
    "inputDropdown",
    "googlechart",
    // New module architecture
    "aq.home",
    "aq.config",
    "aq.product",
    "aq.simpleProduct",
    "aq.bundleProduct",
    "aq.site",
    "aq.medias",
    "aq.modules",
    "aq.translation",
    "aq.dependencies",
    "aq.cmsBlocks",
    "aq.design",
    "aq.translate",
    "aq.update",
    "aq.staticPage",
    "aq.family",
    "aq.trademark",
    "aq.category",
    "aq.client",
    "aq.attribute",
    "aq.setAttributes",
    "aq.option",
    "aq.setOptions",
    "aq.order",
    "aq.cart",
    "aq.payment",
    "aq.supplier",
    "aq.job",
    "aq.shipment",
    "aq.paymentMethod",
    "aq.statistics",
    "aq.stock",
    "aq.territories",
    "aq.contact",

    /* composant Aquila */
    //"aq.crossSelling",
    "aq.gallery",
    "aq.slider",
    "aq.picto",
    "aq.mail",
    "aq.promo",
    "aq.productReviews",
    "aq.themes",
    "aq.productVirtual",
    "aq.newsletter",
    "aq.system", 

]);

//================================================
// Check if the user is connected
//================================================
var checkLoggedin = function ($q, $http, $location, $rootScope, $window, $timeout)
{
    // Initialize a new promise
    var deferred = $q.defer();

    $http.get("v2/auth/isauthenticated").then(function (resp)
    {
        if (!$rootScope.demoMode){
            $http.get("config/environment/environment").then(function (resp) {
                $rootScope.demoMode = resp.data.demoMode;
            });
        }
        $rootScope.userInfo = resp.data.user;
        if(resp.data.data)
        {
            window.localStorage.setItem("jwtAdmin", resp.data.data);
        }
        $timeout(function ()
        {
            deferred.resolve();
        }, 0);
    }).catch(function (err)
    {
        $timeout(function ()
        {
            deferred.reject();
            $window.location.href = $window.location.pathname + "/login";
        }, 0);
    });

    return deferred.promise;
};
//================================================

var checkAccess = function (route)
{
    return [
        "$q", "$timeout", "$http", "$location", "$rootScope", "$window", "toastService",
        function ($q, $timeout, $http, $location, $rootScope, $window, toastService)
        {
            var deferred = $q.defer();
            $http.get("v2/auth/isauthenticated").then(function (resp)
            {
                if(resp.data.user.accessList.indexOf(route) === -1 ||
                    resp.data.user.accessList === undefined)
                {
                    $timeout(function ()
                    {
                        deferred.resolve();
                    }, 0);
                }
                else
                {
                    $timeout(function ()
                    {
                        deferred.reject();
                        toastService.toast("danger", "Accès interdit !");
                        $location.path("/");
                    }, 0);
                }
            });
            return deferred.promise;
        }
    ];
};

adminCatagenApp.config([
    "$httpProvider", function ($httpProvider)
    {
        //================================================
        // Add an interceptor to build correct URLs and handle errors
        //================================================
        $httpProvider.interceptors.push(function ($q, $location)
        {
            return {
                request: function (config)
                {
                    if (window.localStorage.getItem("jwtAdmin")) {
                        config.headers["Authorization"] = window.localStorage.getItem("jwtAdmin");
                    }
                    if(config.url.indexOf("/") === 0)
                    {
                        config.url = config.url.replace("/", "");
                    }
                    if(
                        config.url.indexOf("api.shopping-feed.com") === -1 &&
                        config.url.indexOf(".html") === -1 &&
                        config.url.indexOf(".tpl") === -1 &&
                        config.url.indexOf("assets/") === -1
                    )
                    {
                        config.url = "api/" + config.url;
                    }
                    return config;
                },
                response: function (response)
                {
                    return response;
                },
                responseError: function (response)
                {
                    // if(response.status === 401)
                    // {
                    //     $location.url("login/");
                    // }
                    return $q.reject(response);
                }
            };
        });
    }
]);

adminCatagenApp.config([
    "$routeProvider", function ($routeProvider)
    {
        $routeProvider
            .when("/", {
                controller: "HomeCtrl",
                templateUrl: "./app/home/views/home.html",
                resolve: {
                    loggedin: checkLoggedin
                }
            })
            .when("/list", {
                templateUrl: "views/admin-list.html",
                controller: "AdminCtrl",
                resolve: {
                    loggedin: checkLoggedin,
                    checkAccess: checkAccess("admin")
                }
            })
            .when("/list/new", {
                templateUrl: "views/admin-list-new.html",
                controller: "AdminNewCtrl",
                resolve: {
                    loggedin: checkLoggedin,
                    checkAccess: checkAccess("admin")
                }
            })
            .when("/list/detail/:id", {
                templateUrl: "views/admin-list-detail.html",
                controller: "AdminDetailCtrl",
                resolve: {
                    loggedin: checkLoggedin,
                    checkAccess: checkAccess("admin")
                }
            }) /*.when('/account/:id', {
             resolve: {
             loggedin: checkLoggedin
             }
             })*/
            .when("/invoices", {
                templateUrl: "views/invoices-list.html",
                controller: "InvoicesController",
                resolve: {
                    loggedin: checkLoggedin,
                    checkAccess: checkAccess('invoices')
                }
            })
            .otherwise({
                redirectTo: "/"
            });
    }
]);

var namespaces = [
    "agenda", "attribute", "tinymce", "bundle", "category", "client", "cmsBlocks", "config", /*"cross-selling", */"design", "translate", "update", "discounts", "family", "gallery", "global", "job", "mail", "medias", "menu", "modules", "option",
    "order", "payment", "paymentMethod", "picto", "product", "productReviews", "promo", "setOption", "setAttribute", "shipment", "simple", "site", "slider", "static", "stats", "stock", "supplier", "trademark", "translation",
    "admin-delete", "confirm-delete", "invoices-edit", "order-info-payment", "order-packages", "order-rma", "ns", "admin-list", "cartOrderConverter", "home", "invoices-list", "logged", "themes", "territories", "shopping", "contact", "virtual", "system"
];
adminCatagenApp
    .factory("customLoader", [
        "$http", "$q", function ($http, $q)
        {
            return function (options)
            {
                var deferred = $q.defer();
                var translation = {};

                $http.post('/v2/modules', {PostBody: {filter: {active: true, loadTranslationBack: true}, limit: 99}}).then(function (response)
                {
                    angular.forEach(response.data.datas, function (m) {
                        $http.get("assets/translations/modules/" + m.name + '/' + options.key + "/" + m.name + ".json").then(function (tr)
                        {
                            translation[m.name] = tr.data;
                        });
                    });
                    angular.forEach(namespaces, function (ns)
                    {
                        $http.get("assets/translations/" + options.key + "/" + ns + ".json").then(function (nsTranslation)
                        {
                            translation[ns] = nsTranslation.data;

                            if(Object.keys(translation).length === namespaces.length)
                            {
                                deferred.resolve(translation);
                            }
                        }).catch(function (err)
                        {
                            deferred.reject(err);
                        });
                    });
                }).catch(function (err)
                {
                    deferred.reject(err);
                });
                return deferred.promise;
            };
        }
    ])
    .factory("customMissingTranslationHandler", [
        function ()
        {
            return function ()
            {
                return " ";
            };
        }
    ]);

adminCatagenApp.config([
    "$translateProvider", function ($translateProvider)
    {
        $translateProvider
            .useSanitizeValueStrategy("sanitize")
            .registerAvailableLanguageKeys(["en", "fr"])
            .useLoader("customLoader", {})
            .useMissingTranslationHandler("customMissingTranslationHandler");
    }
]);


adminCatagenApp.run(function ($rootScope, $http, $window)
{
    $rootScope.message = "";
    // Logout function is available in any pages
    $rootScope.logout = function ()
    {
        window.localStorage.removeItem("jwtAdmin");
        $rootScope.userInfo = {};
        $rootScope.message = "Logged out.";
        $http.post("/v2/auth/logout/admin").then(function ()
        {
            $window.location.href = $window.location.pathname + "/login";
        });
    };
});

adminCatagenApp.run(function (editableOptions)
{
    editableOptions.theme = "bs3"; // bootstrap3 theme. Can be also 'bs2', 'default'
});

adminCatagenApp.config(function (treeConfig, paginationConfig)
{
    treeConfig.defaultCollapsed = true; // collapse nodes by default

    paginationConfig.firstText = "Début";
    paginationConfig.lastText = "Fin";
    paginationConfig.previousText = "Préc.";
    paginationConfig.nextText = "Suiv.";
});

adminCatagenApp.controller("PrincipalCtrl", [ "$http", "$rootScope", "$scope",
    function ($http, $rootScope, $scope)
    {
        if (!$rootScope.content_style){
            let content_style = "";
            $http({ url: `/v2/shortcodes`, method: 'GET' }).then((response) => {
                $scope.shortcodes = response.data;
                for (const element of response.data) {
                    content_style += element.tag + ", ";
                }
                content_style = content_style.substring(0, content_style.length - 2) + " {border:1px solid #CCC;padding:3px;background-color:#576fa1} ";
                for (const element of response.data) {
                    content_style += element.tag + ":before{content:'" + element.tag + "'} ";
                }
                $rootScope.content_style = content_style;
            }, function errorCallback(response) {
                console.log(response);
            });
        }

        $scope.modules = [];
        if(!Array.prototype.find)
        {
            Object.defineProperty(Array.prototype, "find", {
                value: function (predicate)
                {
                    if(this == null)
                    {
                        throw new TypeError("this is null or not defined");
                    }
                    var obj = Object(this);
                    var len = obj.length >>> 0;
                    if(typeof predicate !== "function")
                    {
                        throw new TypeError("predicate must be a function");
                    }
                    var thisArg = arguments[1];
                    var index = 0;
                    while(index < len)
                    {
                        var iValue = obj[index];
                        if(predicate.call(thisArg, iValue, index, obj))
                        {
                            return iValue;
                        }
                        index++;
                    }
                    return undefined;
                }
            });
        }

        Array.prototype.max = function ()
        {
            return Math.max.apply(null, this);
        };

        Array.prototype.min = function ()
        {
            return Math.min.apply(null, this);
        };

        Array.prototype.getAndSortGroups = function (filterQuery = "")
        {
            const sortedGroups = ([...new Set(this.map((element) => (element && !element.group ? 'general' : element.group)))]).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
            // s'il est la, on place "general" en premier index
            if (sortedGroups.includes('general')) {
                sortedGroups.splice(sortedGroups.indexOf('general'), 1);
                sortedGroups.unshift('general');
            }
            return sortedGroups.filter((group) => group && group.match(new RegExp(filterQuery, 'gim')))
        };
    }
]);

// Add controller name to $scope
adminCatagenApp.config(['$provide', function ($provide) {
    $provide.decorator('$controller', [
        '$delegate',
        function ($delegate) {
            return function (constructor, locals) {
                if (typeof constructor === "string") {
                    locals.$scope.controllerName =  constructor;
                }

                return $delegate.apply(this, [].slice.call(arguments));
            }
        }]);
}]);
