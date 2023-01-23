const AdminListControllers = angular.module("aq.adminList.controllers", []);

AdminListControllers.controller("AdminCtrl", [
    "$scope", "$modal", "ClientV2", "$location",
    function ($scope, $modal, ClientV2, $location) {
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

            ClientV2.delete({ type: 'user', id: client }, function (msg) {
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
    "$scope", "$location", "toastService", "ClientV2", "$translate", "AdminListApi", "$rootScope",
    function ($scope, $location, toastService, ClientV2, $translate, AdminListApi, $rootScope) {
        $scope.user = { accessList: [] };
        $scope.rights = [];

        AdminListApi.list({ PostBody: { filter: {  }, limit: 0, structure: '*' } }, function (data) {
            $scope.rights = data.datas;
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
                        $location.path('/list/detail/' + msg.user._id);
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
    "$scope", "ClientUpdate", "ClientV2", "$location", "$routeParams", "toastService", "$rootScope", "$translate", "AdminListApi",
    function ($scope, ClientUpdate, ClientV2, $location, $routeParams, toastService, $rootScope, $translate, AdminListApi) {
        $scope.rights = []
        ClientV2.query({ PostBody: { filter: { _id: $routeParams.id }, limit: 1, structure: '*' } }, function (client) {
            $scope.user = client;
            $scope.user.oldEmail = client.email;
        });
        AdminListApi.list({ PostBody: { filter: {  }, limit: 0, structure: '*' } }, function (data) {
            $scope.rights = data.datas;
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

        $scope.save = function (quit = false) {
            var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
            if ($scope.user.email === "" || $scope.user.email === undefined || !re.test($scope.user.email)) {
                toastService.toast("danger", $translate.instant("global.invalidMail"));
                return;
            }

            if ($scope.user.email && $scope.user.password && $scope.user.firstname && $scope.user.lastname) {
                $scope.user.isAdmin = true;
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