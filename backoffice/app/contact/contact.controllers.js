const ContactControllers = angular.module("aq.contact.controllers", []);

function getPage() {
    if (window.localStorage.getItem("pageAdmin") !== undefined && window.localStorage.getItem("pageAdmin") !== null) {
        const pageAdmin = JSON.parse(window.localStorage.getItem("pageAdmin"));
        if (pageAdmin.location === "contacts") {
            return pageAdmin.page;
        }
    }
    return 10;
}

ContactControllers.controller("ContactListCtrl", [
    "$scope", "$location", "$rootScope", "Contact", "ExportCollectionCSV", function ($scope, $location, $rootScope, Contact, ExportCollectionCSV) {
        $scope.contacts = [];
        $scope.cols = [];
        $scope.nbItemsPerPage = 15;
        $scope.filter = {};
        $scope.local = {
            _sort       : '',
            sortReverse : false
        };
        $scope.event = {};

        $scope.defaultLang = $rootScope.languages.find(function (lang) {
            return lang.defaultLanguage;
        }).code;

        $scope.filterChange = function (e) {
            if (e.target.value === '' && e.target.name.indexOf('data') > -1) {
                delete $scope.filter[e.target.name];
            } else if (e.target.value === '' && e.target.name === "_id") {
                delete $scope.filter._id;
            }
            $scope.getContacts(1);
        };

        $scope.getContacts = function (page) {


            const search = $scope.filter;
            let pageAdmin = { location: "contacts", page: 1 };
            if (window.localStorage.getItem("pageAdmin") !== undefined && window.localStorage.getItem("pageAdmin") !== null) {
                pageAdmin = JSON.parse(window.localStorage.getItem("pageAdmin"));
            }
            if (page === undefined && pageAdmin.location === "contacts") {
                const pageSaved = pageAdmin.page;
                $scope.page = pageSaved;
                $scope.currentClientsPage = pageSaved;
                page = pageAdmin.page;

                if (pageAdmin.filter !== undefined && pageAdmin.filter !== null) {
                    $scope.filter = pageAdmin.filter;
                }
            } else {
                window.localStorage.setItem("pageAdmin", JSON.stringify({ location: "contacts", page, search }));
                $scope.page = page;
                $scope.currentClientsPage = page;
                window.scrollTo(0, 0);
            }

            if (page === undefined) {
                page = getPage();
            }

            Contact.list({PostBody: {filter: $scope.filter, page, limit: $scope.nbItemsPerPage, sort: $scope.local._sort !== '' ? {[$scope.local._sort]: $scope.local.sortReverse ? -1 : 1} : {}}, lang: $scope.defaultLang}, function (res) {
                $scope.contacts = res.datas;
                $scope.totalItems = res.count;
                window.localStorage.setItem("pageAdmin", JSON.stringify({location: "contacts", page, filter: $scope.filter}));
                $scope.page = page;
                window.scrollTo(0, 0);
                for (let i = 0; i < $scope.contacts.length; i++) {
                    const contact = $scope.contacts[i];
                    contact.data.date = moment(contact.createdAt).format('L');
                    for (let j = 0; j < Object.keys(contact.data).length; j++) {
                        if (!$scope.cols.includes(Object.keys(contact.data)[j])) {
                            $scope.cols.push(Object.keys(contact.data)[j]);
                        }
                    }
                }
            });
        };

        $scope.details = function (id) {
            $location.path(`/contact/${id}`);
        };

        setTimeout(function () { //Obligé de timer sinon la requete s'effectue deux fois à cause du on-select-page du html
            $scope.getContacts();
        }, 100);
        
        $scope.export = ExportCollectionCSV;
    }
]);

ContactControllers.controller("ContactDetailsCtrl", [
    "$scope", "$routeParams", "Contact", "$rootScope", "$translate", "OneContact", "toastService", "$location", 
    function ($scope, $routeParams, Contact, $rootScope, $translate, OneContact, toastService, $location) {
        $scope.isEditMode = false;
        $scope.contact = {};
        $scope.keys = [];

        $scope.defaultLang = $rootScope.languages.find(function (lang) {
            return lang.defaultLanguage;
        }).code;

        Contact.list({PostBody: {filter: {_id: $routeParams.id}, limit: 1}, lang: $scope.defaultLang}, function (res) {
            $scope.contact = res.datas[0];
            $scope.contact.data.date = moment($scope.contact.createdAt).format('L');
            $scope.keys = Object.keys($scope.contact.data);
        });

        $scope.removeContact = function (_id) {
            const translation = $translate.instant("contact.detail.confirm");
            if(confirm(translation)) {
                OneContact.delete({id: _id}).$promise.then(function () {
                    $location.path("/contacts");
                }, function () {
                    toastService.toast("danger", $translate.instant("contact.errorDeleting"));
                });
            }
        }
    }
]);
