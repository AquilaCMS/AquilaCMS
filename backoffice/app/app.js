"use strict";

Number.prototype.aqlRound = function (places = 2, addingTrailingZeros = true) {
    let roundNum = +(`${Math.round(`${this}e+${places}`)}e-${places}`);
    if (places !== 0 && addingTrailingZeros) {
        roundNum        = roundNum.toString();
        let intPart     = roundNum;
        let decimalPart = '';

        // if we have a decimal number we split it into two parts
        if (roundNum.includes('.')) {
            roundNum    = roundNum.split('.');
            intPart     = roundNum[0];
            decimalPart = roundNum[1];
        }

        // if the size of the decimal part is not equal to the number of digits after the decimal point given in parameter, we add the missing zeros
        if (decimalPart.length !== places) {
            const numOfMissingZero = places - decimalPart.length;
            decimalPart            = decimalPart.padEnd(numOfMissingZero + decimalPart.length, 0);
        }
        roundNum = `${intPart}.${decimalPart}`;
    }
    return roundNum;
};

var aqModules = [
    "ngRoute",
    "adminCatagenControllers",
    "adminCatagenFilters",
    "adminCatagenServices",
    "adminCatagenDirectives",
    "pascalprecht.translate",
    "schemaForm",
    "ngSanitize",
    "xeditable",
    "ngFileUpload",
    "ui.bootstrap",
    "ui.sortable",
    "infinite-scroll",
    'ui.tinymce',
    "angular-bind-html-compile",
    "aquilaCmsBlocks",
    "ui.tree",
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
    "aq.invoices",
    "aq.adminList",
    "aq.dependencies"
]

/* App Module */
var    adminCatagenApp = angular.module("adminCatagenApp", aqModules);

//================================================
// Check if the user is connected
//================================================
var checkLoggedin = function ($q, $http, $location, $rootScope, $window, $timeout) {
    // Initialize a new promise
    var deferred = $q.defer();

    $http.get("v2/auth/isauthenticated").then(function (resp) {
        if (!$rootScope.demoMode) {

            $http.post("v2/config", {PostBody: {structure: {environment: 1}}}).then(function (response) {
                $rootScope.demoMode = response.data.environment.demoMode;
            });
        }
        $rootScope.userInfo = resp.data.user;
        if(resp.data.data) {
            window.localStorage.setItem("jwtAdmin", resp.data.data);
        }

        $timeout(function () {
            deferred.resolve();
        }, 0);
    }).catch(function (err) {
        $timeout(function () {
            deferred.reject();
            $window.location.href = $window.location.pathname + "/login";
        }, 0);
    });

    return deferred.promise;
};
//================================================

var checkAccess = function (route) {
    return [
        "$q", "$timeout", "$http", "$location", "$rootScope", "$window", "toastService", "$translate",
        function ($q, $timeout, $http, $location, $rootScope, $window, toastService, $translate)
        {
            var deferred = $q.defer();
            $http.get("v2/auth/isauthenticated").then(function (resp)
            {
                $rootScope.userInfo = {...$rootScope.userInfo, ...resp.data.user};
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
                        toastService.toast("danger", $translate.instant("global.accessForbidden"));
                        $location.path("/");
                    }, 500);
                }
            });
            return deferred.promise;
        }
    ];
};

var delayTimer;
function input(ele) {
    clearTimeout(delayTimer);
    delayTimer = setTimeout(function() {
       ele.value = parseFloat(ele.value).aqlRound(2).toString();
    }, 800); 
}

adminCatagenApp.config([
    "$httpProvider", function ($httpProvider)
    {
        //================================================
        // Add an interceptor to build correct URLs and handle errors
        //================================================
        $httpProvider.interceptors.push(function ($q, $location, $rootScope)
        {
            return {
                request: function (config)
                {
                    if (window.localStorage.getItem("jwtAdmin")) {
                        config.headers.Authorization = window.localStorage.getItem("jwtAdmin");
                    }
                    const defaultLangCode = window.localStorage.getItem("adminLang");
                    if(defaultLangCode) {
                        window.localStorage.setItem("adminLang", defaultLangCode);
                        $rootScope.adminLang = defaultLangCode;
                        config.headers.lang = defaultLangCode;
                    }
                    if(config.url.indexOf("/") === 0)
                    {
                        config.url = config.url.replace("/", "");
                    }
                    if(
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
             /*.when('/account/:id', {
             resolve: {
             loggedin: checkLoggedin
             }
             })*/
            .otherwise({
                redirectTo: "/"
            });
    }
]);

var namespaces = [
    "agenda", "attribute", "tinymce", "bundle", "category", "client", "cmsBlocks", "config", /*"cross-selling", */"design", "translate", "update", "discounts", "family", "gallery", "global", "job", "mail", "medias", "menu", "modules",
    "order", "payment", "paymentMethod", "picto", "product", "productReviews", "promo", "setAttribute", "shipment", "simple", "site", "slider", "static", "stats", "stock", "supplier", "trademark", "translation",
    "admin-delete", "confirm-delete", "invoices-edit", "order-info-payment", "order-packages", "order-rma", "ns", "admin-list", "cartOrderConverter", "home", "invoices-list", "logged", "themes", "territories", "shopping", "contact", "virtual", "system",
    "carrier","confirm"
];
adminCatagenApp
    .factory("customLoader", [
        "$http", "$q", function ($http, $q)
        {
            return function (options)
            {
                var deferred = $q.defer();
                var translation = {};

                $http.post('/v2/modules', {PostBody: {filter: {active: true, loadTranslationBack: true}, limit: 0}}).then(function (response)
                {
                    const translationArray = []; // {url:"", name:""}

                    // Listing of translation for module
                    for (let index = 0; index < response.data.datas.length; index++) {
                        const m = response.data.datas[index];
                        translationArray.push({
                            url:"assets/translations/modules/" + m.name + '/' + options.key + "/" + m.name + ".json",
                            name : m.name
                        });
                    }

                    // Listing of translation for Aquila admin
                    for (let index = 0; index < namespaces.length; index++) {
                        const ns = namespaces[index];
                        translationArray.push({
                            url:"assets/translations/" + options.key + "/" + ns + ".json",
                            name:ns
                        });
                    }

                    let i = 0;
                    angular.forEach(translationArray, function (element)
                    {
                        $http.get(element.url).then(function (nsTranslation) {
                            translation[element.name] = nsTranslation.data;
                            if(i === translationArray.length-1) {
                                deferred.resolve(translation);
                            }
                            i++;
                        }).catch(function (err) {
                            console.error(`Error loading : "${element.name}" at "${element.url}"`);
                            i++;
                            // if we defer, that breaks the translation
                            // deferred.reject(err);
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
            .useSanitizeValueStrategy(null) //comment it to allow specials characters in confirm box
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
        $window.location.href = $window.location.pathname + "/login";
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

        if (!window.localStorage.getItem("adminLang")) {
            $http({ url: `/v2/languages`, method: 'POST', data: {PostBody: {filter: {}, structure: {code: 1, defaultLanguage: 1}}} }).then(function (response) {
                let defaultLang = response.data.datas.find((element) => element.defaultLanguage);
                let defaultLangCode;
                if(defaultLang) {
                    defaultLangCode = defaultLang.code;
                } else {
                    defaultLang = response.data.datas[0];
                }
                defaultLangCode = defaultLang.code;

                localStorage.setItem("adminLang", defaultLangCode);
            })
            
        }

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
