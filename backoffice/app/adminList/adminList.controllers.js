const AdminListControllers = angular.module("aq.adminList.controllers", []);

const accessList = [
    { code: "orders", translate: "admin-list.transComm" },
    { code: "payments", translate: "admin-list.transPay" },
    { code: "invoices", translate: "admin-list.invoices" },
    { code: "cart", translate: "admin-list.cart" },

    { code: "products", translate: "admin-list.catalPdts" },
    { code: "categories", translate: "admin-list.siteCat" },
    { code: "promos", translate: "admin-list.discount" },
    { code: "picto", translate: "admin-list.picto" },
    { code: "attributes", translate: "admin-list.catalAttr" },

    { code: "trademarks", translate: "admin-list.catalMarques" },
    { code: "suppliers", translate: "admin-list.catalFourn" },
    { code: "families", translate: "admin-list.families" },

    { code: "staticPage", translate: "admin-list.siteStatic" },
    { code: "cmsBlocks", translate: "admin-list.siteCMS" },
    { code: "gallery", translate: "admin-list.gallery" },
    { code: "slider", translate: "admin-list.slider" },
    { code: "medias", translate: "admin-list.siteMedias" },
    { code: "articles", translate: "admin-list.siteArt" },

    { code: "clients", translate: "admin-list.clients" },
    { code: "reviews", translate: "admin-list.reviews" },
    { code: "contacts", translate: "admin-list.contact" },
    { code: "newsletters", translate: "admin-list.newsletters" },

    { code: "mails", translate: "admin-list.mails" },
    { code: "shipments", translate: "admin-list.shipments" },
    { code: "territories", translate: "admin-list.territories" },
    { code: "languages", translate: "admin-list.confLang" },
    { code: "paymentMethods", translate: "admin-list.paymentModes" },
    { code: "admin", translate: "admin-list.admin" },

    { code: "themes", translate: "admin-list.themes" },
    { code: "design", translate: "admin-list.design" },
    { code: "translate", translate: "admin-list.translate" },

    { code: "config", translate: "admin-list.confEnv" },
    { code: "stock", translate: "admin-list.stock" },
    { code: "jobs", translate: "admin-list.confTasks" },
    { code: "system", translate: "admin-list.system" },
    { code: "update", translate: "admin-list.update" },

    { code: "modules", translate: "admin-list.modules" },

    { code: "statistics", translate: "admin-list.statistics" },

    { code: "options", translate: "admin-list.catalOpt" }
];

AdminListControllers.controller("AdminCtrl", [
    "$scope", "AdminScroll", "$modal", "ClientV2", "$location",
    function ($scope, AdminScroll, $modal, ClientV2, $location) {
        $scope.filter = {};
        function init() {
            $scope.sortType = "lastname"; // set the default sort type
            $scope.sortReverse = false;  // set the default sort order
        }

        init();

        $scope.initValues = { start: 0, limit: 15 };
        $scope.page = 1;

        $scope.goToAdminDetails = function (clientId) {
            $location.path(`/list/detail/${clientId}`);
        };

        $scope.getClients = function (page) {
            let filter = {};
            const filterKeys = Object.keys($scope.filter);
            for (let i = 0, leni = filterKeys.length; i < leni; i++) {
                if ($scope.filter[filterKeys[i]] === null) {
                    break;
                }
                if ($scope.filter[filterKeys[i]].toString() != "") {
                    filter[filterKeys[i]] = { $regex: $scope.filter[filterKeys[i]].toString(), $options: "i" };
                }
            }
            filter["isAdmin"] = true;
            ClientV2.list({ PostBody: { filter, page: $scope.page, limit: $scope.initValues.limit } }, function (clientsList) {
                $scope.clients = clientsList.datas;
                $scope.totalAdmin = clientsList.count;
                $scope.scroller = {};
                $scope.scroller.busy = false;
                $scope.scroller.next = function () {
                    if ($scope.scroller.busy) {
                        return;
                    }
                    $scope.scroller.busy = true;
                    $scope.initValues.start = $scope.initValues.start + $scope.initValues.limit;
                    var clientAdd = ClientV2.list({ PostBody: { filter: { isAdmin: true }, page: $scope.page, limit: $scope.initValues.limit } }, function (partialClients) {
                        if (partialClients.datas.length > 0) {
                            $scope.clients = partialClients.datas;//$scope.clients.concat(partialClients.datas);
                            $scope.scroller.busy = false;
                        }
                    });
                };
            });
        }

        $scope.deleteAdmin = function (admin) {
            var modalInstance = $modal.open({
                templateUrl: "views/modals/admin-delete.html", controller: "AdminDeleteCtrl", resolve: {
                    client: function () {
                        return admin._id;
                    }
                }
            });
            modalInstance.result.then(function (updateAdmin) {
                $scope.clients.splice($scope.clients.indexOf(admin), 1);
            });
        };

        $scope.getClients();

    }
]);

AdminListControllers.controller("AdminDeleteCtrl", [
    "$scope", "$modalInstance", "client", "ClientV2", "toastService", "$translate",
    function ($scope, $modalInstance, client, ClientV2, toastService, $translate) {
        $scope.ok = function () {

            ClientV2.deleteAdmin({ id: client }, function (msg) {
                if (msg.status) {
                    toastService.toast("success", $translate.instant("global.deleteAdmin"));
                    $modalInstance.close(msg.status);
                } else {
                    $modalInstance.close();
                    toastService.toast("danger", $translate.instant("global.error"));
                }
            });

        };

        $scope.cancel = function () {
            $modalInstance.dismiss("cancel");
        };

    }
]);

AdminListControllers.controller("AdminNewCtrl", [
    "$scope", "AdminNew", "$location", "toastService", "ClientV2", "$translate",
    function ($scope, AdminNew, $location, toastService, ClientV2, $translate) {
        $scope.user = { accessList: [] };
        $scope.accessList = accessList;

        $scope.toggleSelection = function toggleSelection(access) {
            var idx = $scope.user.accessList.indexOf(access);

            if (idx > -1) {
                $scope.user.accessList.splice(idx, 1);
            }
            else {
                $scope.user.accessList.push(access);
            }
        };

        $scope.reset = function () {
            $scope.user = { firstname: "", lastname: "", email: "", password: "", accessList: [] };
        };

        $scope.save = function (user) {
            var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
            if (user.email === "" || user.email === undefined || !re.test(user.email)) {
                toastService.toast("danger", $translate.instant("global.invalidMail"));
                return;
            }

            if (user.email && user.firstname && user.lastname) {
                user.isAdmin = true;
                ClientV2.save(user, function (msg) {
                    if (msg.user) {
                        toastService.toast("success", $translate.instant("global.infoSaved"));
                        $location.path('/list/detail/' + msg.user.id);
                    }
                    else {
                        console.error("Error!");
                    }
                }, function (error) {
                    if (error.data && error.data.message) {
                        toastService.toast("danger", error.data.message);
                    }
                });
            }
        };
    }
]);

AdminListControllers.controller("AdminDetailCtrl", [
    "$scope", "ClientUpdate", "ClientV2", "$location", "$routeParams", "toastService", "$rootScope", "$translate",
    function ($scope, ClientUpdate, ClientV2, $location, $routeParams, toastService, $rootScope, $translate) {
        ClientV2.query({ PostBody: { filter: { _id: $routeParams.id }, limit: 1, structure: '*' } }, function (client) {
            $scope.user = client;
            $scope.user.oldEmail = client.email;
        });

        $scope.toggleSelection = function toggleSelection(access) {
            var idx = $scope.user.accessList.indexOf(access);

            if (idx > -1) {
                $scope.user.accessList.splice(idx, 1);
            }
            else {
                $scope.user.accessList.push(access);
            }
        };

        $scope.goToCustomer = function (id) {
            $location.path("/clients/" + id);
        };

        $scope.reset = function () {
            ClientV2.query({ PostBody: { filter: { _id: $routeParams.id }, limit: 1, structure: '*' } }, function (client) {
                $scope.user = client;
            });
        };

        $scope.accessList = accessList;

        $scope.save = function (quit = false) {
            var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
            if ($scope.user.email === "" || $scope.user.email === undefined || !re.test($scope.user.email)) {
                toastService.toast("danger", $translate.instant("global.invalidMail"));
                return;
            }

            if ($scope.user.email && $scope.user.password && $scope.user.firstname && $scope.user.lastname) {
                $scope.user.isAdmin = true;
                console.log($scope.user)
                ClientV2.save({ type: 'user' }, $scope.user, function (response) {
                    toastService.toast("success", $translate.instant("global.infoSaved"));
                    if (quit) {
                        $location.path("/list")
                    }
                    //$location.path("/list");
                }, function (err) {
                    if (err.data.msg !== undefined) {
                        toastService.toast("danger", err.data.msg);
                    }
                    else {
                        toastService.toast("danger", err.data);
                    }
                });
            }
        };

        $scope.reinit = function (email) {
            var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
            if (email === "" || email === undefined || !re.test(email)) {
                toastService.toast("danger", $translate.instant("global.invalidMail"));
                return;
            }

            ClientV2.resetpassword({ email, lang: $scope.user.preferredLanguage || $rootScope.adminLang })
                .success(function (request) {
                    toastService.toast("success", $translate.instant("global.emailSent"));
                })
                .error(function (request) {
                    toastService.toast("danger", request.translation.fr);
                });

        };

    }
]);