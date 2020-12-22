"use strict";

/* Controllers */

var adminCatagenControllers = angular.module("adminCatagenControllers", []);

// wrapper
adminCatagenControllers.controller("wrapperCtrl", [
    "$rootScope", "$scope", "$route", "ConfigUpdate", "MenusList", "MenusCatalogList", "LanguagesApiV2", "$translate", "$http",
    function ($rootScope, $scope, $route, ConfigUpdate, MenusList, MenusCatalogList, LanguagesApiV2, $translate, $http)
    {

        $scope.menus = MenusList;
        $scope.menusCatalog = MenusCatalogList;

        function getLanguages() {
            LanguagesApiV2.list({PostBody: {filter: {}, limit: 99}}, function (languages)
            {
                $scope.languages = languages.datas;
                $rootScope.languages = languages.datas;
                var lang = languages.datas.find(_lang => _lang.defaultLanguage).code
    
                moment.locale(lang);
                $rootScope.adminLang = lang;
                $translate.use(lang);
                $translate.preferredLanguage(lang);
                $translate.fallbackLanguage(lang);
            });
        }

        $scope.adminLangChange = function (lang)
        {
            $rootScope.adminLang = lang;
            moment.locale(lang);
            $translate.use(lang);
            $route.reload();
        };

        $scope.updateTheme = function (rep)
        {
            ConfigUpdate.query({"url": rep}, function (up)
            {
                console.log(up);
            });
        };

        $http.get("v2/auth/isauthenticated").then(function (resp) {
            $scope.accessList = resp.data.user.accessList;
            // if(["orders", "payments", "invoices", "cart"].every(num => $scope.accessList.includes(num))){
            //     $scope.accessList.push('transactions');
            // }
            // if(["products", "categories", "promos", "picto", "setAttributes", "attributes", "trademarks", "suppliers", "families"].every(num => $scope.accessList.includes(num))){
            //     $scope.accessList.push('catalogue');
            // }
            // if(["medias", "articles", "cmsBlocks", "staticPage", "categories", "design", "mails", "gallery", "slider"].every(num => $scope.accessList.includes(num))){
            //     $scope.accessList.push('site');
            // }
            // if(["clients", "setAttributes", "attributes", "reviews", "contacts", "newsletters"].every(num => $scope.accessList.includes(num))){
            //     $scope.accessList.push('clientsMenu');
            // }
            // if(["environment", "stock", "mails", "shipments", "territories", "languages", "paymentMethods", "jobs", "list", "update"].every(num => $scope.accessList.includes(num))){
            //     $scope.accessList.push('configuration');
            // }
            debugger;
        });

        window.addEventListener("getLanguages", function(e) { getLanguages() });

        getLanguages()
    }
]);

// logImport
adminCatagenControllers.controller("logimportCtrl", [
    "$rootScope", "$scope", "logImport", function ($rootScope, $scope, logImport)
    {

        logImport.getStatus(function (productStatus)
        {

            $scope.importStatusProduct = productStatus.status;

            if(productStatus.status == false)
            {
                $scope.statusImport = "fa fa-warning red";
            }
            else
            {
                $scope.statusImport = "glyphicon glyphicon-ok-circle green";
            }

        });

        logImport.query(function (listImports)
        {

            //$scope.listImports = listImports;

            var log = {};

            angular.forEach(listImports, function (currImport)
            {
                if(!angular.isDefined(log[currImport.type]))
                {
                    log[currImport.type] = [];
                }
                log[currImport.type].push(currImport);
            });

            console.log(log);
            $scope.listImports = log;

        });
    }
]);

// logged
adminCatagenControllers.controller("loggedCtrl", [
    "$rootScope", "$scope", function ($rootScope, $scope)
    {
        //$scope.userIdent = $rootScope.userInfo._id;
    }
]);

adminCatagenControllers.controller("AdminCtrl", [
    "$scope", "AdminScroll", "$modal", "ClientV2", "$location",
    function ($scope, AdminScroll, $modal, ClientV2, $location) {
        function init()
        {
            $scope.sortType = "lastname"; // set the default sort type
            $scope.sortReverse = false;  // set the default sort order
        }

        init();

        $scope.initValues = {start: 0, limit: 15};
        $scope.page = 1;

        $scope.goToAdminDetails = function(clientId){
            $location.path(`/list/detail/${clientId}`);
        };

        $scope.getClients = function(page = 1)
        {
            $scope.page = page;
            ClientV2.list({PostBody: {filter: {isAdmin: true}, page: $scope.page, limit: $scope.initValues.limit}}, function (clientsList)
            {
                $scope.clients = clientsList.datas;
                $scope.totalAdmin = clientsList.count;
                $scope.scroller = {};
                $scope.scroller.busy = false;
                $scope.scroller.next = function ()
                {
                    if($scope.scroller.busy)
                    {
                        return;
                    }
                    $scope.scroller.busy = true;
                    $scope.initValues.start = $scope.initValues.start + $scope.initValues.limit;
                    var clientAdd = ClientV2.list({PostBody: {filter: {isAdmin: true}, page: $scope.page, limit: $scope.initValues.limit}}, function (partialClients)
                    {
                        if(partialClients.datas.length > 0)
                        {
                            $scope.clients = partialClients.datas;//$scope.clients.concat(partialClients.datas);
                            $scope.scroller.busy = false;
                        }
                    });
                };
            });
        }

        $scope.deleteAdmin = function (admin)
        {
            var modalInstance = $modal.open({
                templateUrl: "views/modals/admin-delete.html", controller: "AdminDeleteCtrl", resolve: {
                    client: function ()
                    {
                        return admin._id;
                    }
                }
            });
            modalInstance.result.then(function (updateAdmin)
            {
                $scope.clients.splice($scope.clients.indexOf(admin), 1);
            });
        };

        $scope.getClients();

    }
]);
adminCatagenControllers.controller("AdminDeleteCtrl", [
    "$scope", "$modalInstance", "client", "ClientV2", "toastService", function ($scope, $modalInstance, client, ClientV2, toastService)
    {
        $scope.ok = function ()
        {

            ClientV2.deleteAdmin({id: client}, function (msg)
            {
                if(msg.status)
                {
                    toastService.toast("success", "Admin Deleted!");
                    $modalInstance.close(msg.status);
                } else {
                    $modalInstance.close();
                    toastService.toast("danger", "Error!");
                }
            });

        };

        $scope.cancel = function ()
        {
            $modalInstance.dismiss("cancel");
        };

    }
]);

adminCatagenControllers.controller("AdminNewCtrl", [
    "$scope", "AdminNew", "$location", "toastService", "ClientV2", function ($scope, AdminNew, $location, toastService, ClientV2)
    {
        $scope.user = {accessList: []};
        $scope.accessList = [

            {code:"orders", translate:"admin-list.transComm"},
            {code:"payments", translate:"admin-list.transPay"},
            {code:"invoices", translate:"admin-list.invoices"},
            {code:"cart", translate:"admin-list.cart"},

            {code:"products", translate:"admin-list.catalPdts"},
            {code:"categories", translate:"admin-list.siteCat"},
            {code:"promos", translate:"admin-list.discount"},
            {code:"picto", translate:"admin-list.picto"},
            {code:"attributes", translate:"admin-list.catalAttr"},

            {code:"trademarks", translate:"admin-list.catalMarques"},
            {code:"suppliers", translate:"admin-list.catalFourn"},
            {code:"families", translate:"admin-list.families"},
            
            {code:"staticPage", translate:"admin-list.siteStatic"},
            {code:"cmsBlocks", translate:"admin-list.siteCMS"},
            {code:"gallery", translate:"admin-list.gallery"},
            {code:"slider", translate:"admin-list.slider"},
            {code:"medias", translate:"admin-list.siteMedias"},
            {code:"articles", translate:"admin-list.siteArt"},
            
            {code:"clients", translate:"admin-list.clients"},
            {code:"reviews", translate:"admin-list.reviews"},
            {code:"contacts", translate:"admin-list.contact"},
            {code:"newsletters", translate:"admin-list.newsletters"},

            {code:"config", translate:"admin-list.confEnv"},
            {code:"stock", translate:"admin-list.stock"},
            {code:"mails", translate:"admin-list.mails"},
            {code:"shipments", translate:"admin-list.shipments"},
            {code:"territories", translate:"admin-list.territories"},
            {code:"languages", translate:"admin-list.confLang"},
            {code:"paymentMethods", translate:"admin-list.paymentModes"},
            {code:"jobs", translate:"admin-list.confTasks"},
            {code:"admin", translate:"admin-list.admin"},
            {code:"update", translate:"admin-list.update"},

            {code:"themes", translate:"admin-list.themes"},
            {code:"design", translate:"admin-list.design"},
            {code:"translate", translate:"admin-list.translate"},

            {code:"modules", translate:"admin-list.modules"},

            {code:"statistics", translate:"admin-list.statistics"},
            
            {code:"options", translate:"admin-list.catalOpt"}
        ];

        $scope.toggleSelection = function toggleSelection(access)
        {
            var idx = $scope.user.accessList.indexOf(access);

            if(idx > -1)
            {
                $scope.user.accessList.splice(idx, 1);
            }
            else
            {
                $scope.user.accessList.push(access);
            }
        };

        $scope.reset = function ()
        {
            $scope.user = {firstname: "", lastname: "", email: "", password: "", accessList: []};
        };

        $scope.save = function (user)
        {
            var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
            if(user.email === "" || user.email === undefined || !re.test(user.email))
            {
                toastService.toast("danger", "L'email n'est pas valide");
                return;
            }

            if(user.email && user.firstname && user.lastname)
            {
                user.isAdmin = true;
                ClientV2.saveAdmin(user, function (msg)
                {
                    if(msg.user)
                    {
                        toastService.toast("success", "Informations sauvegardées !");
                        $location.path('/list/detail/' + msg.user.id);
                    }
                    else
                    {
                        console.error("Error!");
                    }
                }, function(error){
                    if(error.data && error.data.message) {
                        toastService.toast("danger", error.data.message);
                    }
                });
            }
        };
    }
]);

adminCatagenControllers.controller("AdminDetailCtrl", [
    "$scope", "ClientUpdate", "ClientV2", "$location", "$routeParams", "toastService", "$rootScope",
    function ($scope, ClientUpdate, ClientV2, $location, $routeParams, toastService, $rootScope)
    {
        ClientV2.query({PostBody: {filter: {_id: $routeParams.id}, limit: 1, structure: '*'}}, function (client)
        {
            $scope.user = client;
            $scope.user.oldEmail = client.email;
        });

        $scope.toggleSelection = function toggleSelection(access)
        {
            var idx = $scope.user.accessList.indexOf(access);

            if(idx > -1)
            {
                $scope.user.accessList.splice(idx, 1);
            }
            else
            {
                $scope.user.accessList.push(access);
            }
        };

        $scope.goToCustomer = function (id)
        {
            $location.path("/clients/" + id);
        };

        $scope.reset = function ()
        {
            ClientV2.query({PostBody: {filter: {_id: $routeParams.id}, limit: 1, structure: '*'}}, function (client)
            {
                $scope.user = client;
            });
        };

        $scope.accessList = [
            {code:"orders", translate:"admin-list.transComm"},
            {code:"payments", translate:"admin-list.transPay"},
            {code:"invoices", translate:"admin-list.invoices"},
            {code:"cart", translate:"admin-list.cart"},

            {code:"products", translate:"admin-list.catalPdts"},
            {code:"categories", translate:"admin-list.siteCat"},
            {code:"promos", translate:"admin-list.discount"},
            {code:"picto", translate:"admin-list.picto"},
            {code:"attributes", translate:"admin-list.catalAttr"},

            {code:"trademarks", translate:"admin-list.catalMarques"},
            {code:"suppliers", translate:"admin-list.catalFourn"},
            {code:"families", translate:"admin-list.families"},
            
            {code:"staticPage", translate:"admin-list.siteStatic"},
            {code:"cmsBlocks", translate:"admin-list.siteCMS"},
            {code:"gallery", translate:"admin-list.gallery"},
            {code:"slider", translate:"admin-list.slider"},
            {code:"medias", translate:"admin-list.siteMedias"},
            {code:"articles", translate:"admin-list.siteArt"},
            
            {code:"clients", translate:"admin-list.clients"},
            {code:"reviews", translate:"admin-list.reviews"},
            {code:"contacts", translate:"admin-list.contact"},
            {code:"newsletters", translate:"admin-list.newsletters"},

            {code:"config", translate:"admin-list.confEnv"},
            {code:"stock", translate:"admin-list.stock"},
            {code:"mails", translate:"admin-list.mails"},
            {code:"shipments", translate:"admin-list.shipments"},
            {code:"territories", translate:"admin-list.territories"},
            {code:"languages", translate:"admin-list.confLang"},
            {code:"paymentMethods", translate:"admin-list.paymentModes"},
            {code:"jobs", translate:"admin-list.confTasks"},
            {code:"admin", translate:"admin-list.admin"},
            {code:"update", translate:"admin-list.update"},

            {code:"themes", translate:"admin-list.themes"},
            {code:"design", translate:"admin-list.design"},
            {code:"translate", translate:"admin-list.translate"},

            {code:"modules", translate:"admin-list.modules"},

            {code:"statistics", translate:"admin-list.statistics"},
            
            {code:"options", translate:"admin-list.catalOpt"}
        ];

        $scope.save = function (quit = false)
        {
            var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
            if($scope.user.email === "" || $scope.user.email === undefined || !re.test($scope.user.email))
            {
                toastService.toast("danger", "L'email n'est pas valide");
                return;
            }

            if($scope.user.email && $scope.user.password && $scope.user.firstname && $scope.user.lastname)
            {
                $scope.user.isAdmin = true;
                console.log($scope.user)
                ClientV2.save({type: 'user'}, $scope.user, function (response)
                {
                    toastService.toast("success", "Informations sauvegardées !");
                    if(quit) {
                        $location.path("/list")
                    }
                    //$location.path("/list");
                }, function (err)
                {
                    if(err.data.msg !== undefined)
                    {
                        toastService.toast("danger", err.data.msg);
                    }
                    else
                    {
                        toastService.toast("danger", err.data);
                    }
                });
            }
        };

        $scope.reinit = function (email)
        {
            var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
            if(email === "" || email === undefined || !re.test(email))
            {
                toastService.toast("danger", "L'email n'est pas valide");
                return;
            }

            ClientV2.resetpassword({email, lang: $scope.user.preferredLanguage || $rootScope.adminLang})
                .success(function (request)
                {
                    toastService.toast("success", "Un email a été envoyé à cette adresse.");
                })
                .error(function (request)
                {
                    toastService.toast("danger", request.translation.fr);
                });

        };

    }
]);

// carrier
adminCatagenControllers.controller("CarrierListCtrl", [
    "$scope", "Carrier", "toastService", function ($scope, Carrier, toastService)
    {
        $scope.carriers = Carrier.query();

        $scope.removeCarrier = function (carrier)
        {
            if(confirm("Etes-vous sûr de vouloir supprimer cet élément ?"))
            {
                Carrier.remove({carrierId: carrier._id}, function ()
                {
                    $scope.carriers.splice($scope.carriers.indexOf(carrier), 1);
                    toastService.toast("success", "Transporteur supprimé");
                });
            }
        };
    }
]);

adminCatagenControllers.controller("CarrierNewCtrl", [
    "$scope", "$location", "Carrier", "toastService", function ($scope, $location, Carrier, toastService)
    {

        $scope.master = {
            name: "", _id: "", url: "", active: true, deliveryDelay: ""
        };

        $scope.reset = function ()
        {
            $scope.carrier = angular.copy($scope.master);
        };

        $scope.save = function (data)
        {
            Carrier.update(data, function (msg)
            {
                if(msg.status)
                {
                    toastService.toast("success", "Transporteur sauvegardé");
                    $location.path("/carriers");
                }
                else
                {
                    toastService.toast("danger", "Erreur !");
                }
            });
        };

        $scope.reset();

    }
]);

adminCatagenControllers.controller("CarrierDetailCtrl", [
    "$scope", "$http", "$q", "$routeParams", "Carrier", function ($scope, $http, $q, $routeParams, Carrier)
    {
        $scope.carrier = Carrier.get({carrierId: $routeParams.carrierId}, function ()
        {
            ;
        });

        $scope.updateName = function (data)
        {
            var d = $q.defer();
            $http.post("/carriers", {_id: $scope.carrier._id, name: data}).success(function (res)
            {
                res = res || {};
                if(res.status === true)
                { // {status: "ok"}
                    d.resolve();
                }
                else
                {
                    d.resolve(res.msg);
                }
            }).error(function (e)
            {
                d.reject("Server error!");
            });
            return d.promise;
        };
        $scope.updateUrl = function (data)
        {
            var d = $q.defer();
            $http.post("/carriers", {_id: $scope.carrier._id, url: data}).success(function (res)
            {
                res = res || {};
                if(res.status === true)
                { // {status: "ok"}
                    d.resolve();
                }
                else
                {
                    d.resolve(res.msg);
                }
            }).error(function (e)
            {
                d.reject("Server error!");
            });
            return d.promise;
        };
        $scope.updateDeliveryDelay = function (data)
        {
            var d = $q.defer();
            $http.post("/carriers", {_id: $scope.carrier._id, deliveryDelay: data}).success(function (res)
            {
                res = res || {};
                if(res.status === true)
                { // {status: "ok"}
                    d.resolve();
                }
                else
                {
                    d.resolve(res.msg);
                }
            }).error(function (e)
            {
                d.reject("Server error!");
            });
            return d.promise;
        };
        $scope.updateActive = function (data)
        {
            var d = $q.defer();
            $http.post("/carriers", {_id: $scope.carrier._id, active: data}).success(function (res)
            {
                res = res || {};
                if(res.status === true)
                { // {status: "ok"}
                    d.resolve();
                }
                else
                {
                    d.resolve(res.msg);
                }
            }).error(function (e)
            {
                d.reject("Server error!");
            });
            return d.promise;
        };

    }
]);

adminCatagenControllers.controller("CarrierDetailCtrl", [
    "$scope", "$http", "$q", "$routeParams", "Carrier", function ($scope, $http, $q, $routeParams, Carrier)
    {
        $scope.carrier = Carrier.get({carrierId: $routeParams.carrierId}, function ()
        {
            ;
        });

        $scope.updateName = function (data)
        {
            var d = $q.defer();
            $http.post("/carriers", {_id: $scope.carrier._id, name: data}).success(function (res)
            {
                res = res || {};
                if(res.status === true)
                { // {status: "ok"}
                    d.resolve();
                }
                else
                {
                    d.resolve(res.msg);
                }
            }).error(function (e)
            {
                d.reject("Server error!");
            });
            return d.promise;
        };

        $scope.updateUrl = function (data)
        {
            var d = $q.defer();
            $http.post("/carriers", {_id: $scope.carrier._id, url: data}).success(function (res)
            {
                res = res || {};
                if(res.status === true)
                { // {status: "ok"}
                    d.resolve();
                }
                else
                {
                    d.resolve(res.msg);
                }
            }).error(function (e)
            {
                d.reject("Server error!");
            });
            return d.promise;
        };

        $scope.updateDeliveryDelay = function (data)
        {
            var d = $q.defer();
            $http.post("/carriers", {_id: $scope.carrier._id, deliveryDelay: data}).success(function (res)
            {
                res = res || {};
                if(res.status === true)
                { // {status: "ok"}
                    d.resolve();
                }
                else
                {
                    d.resolve(res.msg);
                }
            }).error(function (e)
            {
                d.reject("Server error!");
            });
            return d.promise;
        };

        $scope.updateActive = function (data)
        {
            var d = $q.defer();
            $http.post("/carriers", {_id: $scope.carrier._id, active: data}).success(function (res)
            {
                res = res || {};
                if(res.status === true)
                { // {status: "ok"}
                    d.resolve();
                }
                else
                {
                    d.resolve(res.msg);
                }
            }).error(function (e)
            {
                d.reject("Server error!");
            });
            return d.promise;
        };

    }
]);

adminCatagenControllers.controller("ExportsCtrl", [
    "$scope", "$window", "Client", function ($scope, $window, Client)
    {

        $scope.dateOptions = {
            "year-format": "'yyyy'", "starting-day": 1
        };

    }
]);

adminCatagenControllers.controller("InvoicesController", [
    "$scope", "$modal", "$filter", "Invoice", "InvoiceColumns", "$http", "$translate", '$rootScope', "toastService", '$location', "ExportCollectionCSV", function ($scope, $modal, $filter, Invoice, InvoiceColumns, $http, $translate, $rootScope, toastService, $location, ExportCollectionCSV)
    {
        $scope.columns = InvoiceColumns;
        $scope.currentPage = 1;
        $scope.page = 1;
        $scope.totalItems = 0;
        $scope.nbItemsPerPage = 12;
        $scope.maxSize = 10;
        $scope.filter = {};
        $scope.sort = {type: "createdAt", reverse: true};
        $scope.disabledButton = false;

        function init()
        {
            $scope.sortType = "createdAt"; // set the default sort type
            $scope.sortReverse = true;  // set the default sort order
        }

        init();
        $scope.dateOptions = {
            "year-format": "'yyyy'", "starting-day": 1
        };

        $scope.generatePDF = function(invoice) {
            $scope.disabledButton = true;
            $http({
                method: 'POST',
                url: 'v2/bills/generatePDF',
                data: {
                    PostBody : {
                        structure: {"__v": 0},
                        filter : {_id: invoice._id}
                    }
                },
                headers: {'Content-Type': 'application/json'},
            }).success(function (data, status, headers) {
                $http({
                    method : 'POST',
                    url    : 'v2/bills/generatePDF',
                    data   : {
                        PostBody : {
                            structure : {"__v": 0},
                            filter    : {_id: invoice._id}
                        }
                    },
                    headers      : {'Content-Type': 'application/json'},
                    responseType : 'blob'
                }).success(function (data, status, headers) {
                    headers = headers();

                    let filename    = 'facture.pdf';
                    let contentType = headers['content-type'];

                    let linkElement = document.createElement('a');
                    try {
                        let blob = new Blob([data], {type: contentType});
                        let url  = window.URL.createObjectURL(blob);

                        linkElement.setAttribute('href', url);
                        linkElement.setAttribute("download", filename);

                        let clickEvent = new MouseEvent("click", {
                            "view"       : window,
                            "bubbles"    : true,
                            "cancelable" : false
                        });
                        $scope.disabledButton = false;
                        linkElement.dispatchEvent(clickEvent);
                    } catch (ex) {
                        console.error(ex);
                    }
                })
            }).error(function (data) {
                $scope.disabledButton = false;
                toastService.toast('danger', data.translations[$rootScope.adminLang]);
            });
        };

        $scope.goToOrder = function (invoice) {
            $location.path('/orders/' + invoice.order_id._id)
        }

        $scope.getInvoices = function (page)
        {
            var sort = {};
            sort[$scope.sort.type] = $scope.sort.reverse ? -1 : 1;
            $scope.currentPage = page;

            if ($scope.filter.order_id && $scope.filter.order_id.number === "" ){
                delete $scope.filter.order_id;
            }

            const search = $scope.filter;
            let pageAdmin = { location: "invoices", page: 1 };
            if (window.localStorage.getItem("pageAdmin") !== undefined && window.localStorage.getItem("pageAdmin") !== null) {
                pageAdmin = JSON.parse(window.localStorage.getItem("pageAdmin"));
            }

            if (pageAdmin.search && pageAdmin.search.order_id && pageAdmin.search.order_id.number === "") {
                delete pageAdmin.search.order_id;
            }

            if (page === undefined && pageAdmin.location === "invoices") {
                const pageSaved = pageAdmin.page;
                $scope.page = pageSaved;
                $scope.currentPage = pageSaved;
                page = pageAdmin.page;

                if (pageAdmin.search !== undefined && pageAdmin.search !== null) {
                    $scope.filter = pageAdmin.search;
                }
            } else {
                window.localStorage.setItem("pageAdmin", JSON.stringify({ location: "invoices", page, search }));
                $scope.page = page;
                $scope.currentPage = page;
                window.scrollTo(0, 0);
            }

            let filter = {};
            const filterKeys = Object.keys($scope.filter);
            for (let i = 0, leni = filterKeys.length; i < leni; i++) {
                if($scope.filter[filterKeys[i]] === null){
                    break;
                }
                if (filterKeys[i].includes("amount")) {
                    const key = filterKeys[i].split("_");
                    const value = $scope.filter[filterKeys[i]];
                    filter["payment.0.amount"] = {}
                    filter["payment.0.amount"][key[0] === "min" ? "$gte" : "$lte"] = Number(value);
                } else if (filterKeys[i].includes("min_") || filterKeys[i].includes("max_")) {
                    const key = filterKeys[i].split("_");
                    const value = $scope.filter[filterKeys[i]];

                    if (filter[key[1]] === undefined) {
                        filter[key[1]] = {};
                    }
                    filter[key[1]][key[0] === "min" ? "$gte" : "$lte"] = key[1].toLowerCase().includes("date") ? value.toISOString() : value;
                } else {
                    if (typeof ($scope.filter[filterKeys[i]]) === 'object'){
                        filter[filterKeys[i] + ".number"] = { $regex: $scope.filter[filterKeys[i]].number, $options: "i" };
                    }else{
                        filter[filterKeys[i]] = { $regex: $scope.filter[filterKeys[i]].toString(), $options: "i" };
                    }
                }
            }


            Invoice.query({ PostBody: {filter,limit: $scope.nbItemsPerPage, page, populate: ['order_id']}}, function (invoicesList)
            {
                $scope.invoices = invoicesList.datas.map(function (invoice) {

                    invoice.type = (invoice.avoir ? "invoices-list.avoir" : "invoices-list.facture")
                    return invoice
                });
                $scope.totalItems = invoicesList.count;
            });
        };

        setTimeout(function () { //Obligé de timer sinon la requete s'effectue deux fois à cause du on-select-page du html
            $scope.getInvoices();
        }, 100);

        $scope.export = ExportCollectionCSV;
    }
]);

adminCatagenControllers.controller("ThemesCtrl", [
    "$scope", "Themes", function ($scope, Themes)
    {
        Themes.query(function (themes)
        {
            $scope.themes = themes;
        });
        $scope.useTheme = function (theme)
        {
            Themes.useTheme({name: "name"}, {}, function ()
            {
                $scope.response = {msg: "Le thème " + theme.name + " est maintenant utilisé.", status: true};
            }, function ()
            {
                $scope.response = {msg: "Une erreur est survenue.", status: true};
            });
        };
    }
]);

adminCatagenControllers.controller("ConfirmDeleteCtrl", [
    "$scope", "$modalInstance", "okAction", function ($scope, $modalInstance, okAction)
    {
        $scope.ok = function ()
        {
            okAction().then(function ()
            {
                $modalInstance.close();
            });
        };

        $scope.cancel = function ()
        {
            $modalInstance.dismiss("cancel");
        };
    }
]);
