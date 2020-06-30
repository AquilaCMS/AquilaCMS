var MailControllers = angular.module("aq.mail.controllers", ['ui.bootstrap']);

/**
 * Controller de la page contenant la liste des Mails
 */
MailControllers.controller("MailListCtrl", [
    "$scope", "$location", "MailGetAll", "$rootScope", function ($scope, $location, MailGetAll, $rootScope) {
        $scope.isEditMode = true;
        $scope.detail = function (mail) {
            $location.url("/mails/" + mail._id);
        };

        $scope.defaultLang = $rootScope.languages.find(function (lang) {
            return lang.defaultLanguage;
        }).code;

        MailGetAll.query(function (mails) {
            $scope.mails = mails;
        });
    }
]);


/**
 * Controller de la page contenant le detail d'un Mail
 */
MailControllers.controller("MailDetailCtrl", [
    "$scope", "$q", "$routeParams", "$location", "toastService", "MailRemovePdf", "MailSave", "MailUpdate", "MailRemove", "MailGetById", "MailTypesGet", "MailVariables","$modal",
    function ($scope, $q, $routeParams, $location, toastService, MailRemovePdf, MailSave, MailUpdate, MailRemove, MailGetById, MailTypesGet, MailVariables, $modal) {
        $scope.mail = {};
        $scope.mailTypes = [];

        if($routeParams.mailId != "new")
        {
            $scope.isEditMode = true;
        }
        else
        {
            //Mode création
            $scope.isEditMode = false;
        }
        //On récupére les types de mail pour les ajouter au select
        MailTypesGet.query({}, function (mailTypes) {
            $scope.mailTypes = mailTypes;
        });

        $scope.MailGetById = function () {
            MailGetById.query({_id: $routeParams.mailId}, function (mail) {
                $scope.mail = mail;
            });
        };
        //On récupére le document uniquement si nous sommes en mode edit
        if($scope.isEditMode)
        {
            $scope.MailGetById();
        }

        $scope.after = function(){
            $scope.MailGetById();
            toastService.toast("success", "Fichier PDF sauvegardé !");
        }

        $scope.uploadError = function(){
                toastService.toast("danger", "Le fichier PDF n'a pas été sauvegardé");
        }

        $scope.deletePdf = function(position, lang){
            let path = $scope.mail.translation[lang].attachments[position].path;
            $scope.mail.translation[lang].attachments.splice(position, 1);
            MailRemovePdf.removePdf({mail:$scope.mail, path}, function (response) {
                if (response.msg) {
                    toastService.toast("danger", "Le fichier PDF n'a pas été supprimé");
                    $scope.MailGetById();
                }
                else {
                    toastService.toast("success", "Fichier PDF supprimé !");
                    $scope.MailGetById();
                }
            }, function (err) {
                if (err.data && err.data.translations) {
                    return deferred.reject(err.data.translations.fr);
                }
                return deferred.reject(err);
            });
        }

        $scope.component_template = MailVariables.component_template;

        //Ajout ou update d'un mail
        $scope.save = function (isQuit) {
            $scope.form.nsSubmitted = true;
            if($scope.form.$invalid)
            {
                toastService.toast("success", "Mail sauvegardé !");
                return;
            }
            var deferred = $q.defer();
            if($scope.isEditMode)
            {
                MailUpdate.update($scope.mail, function (response) {
                    if(response.msg)
                    {
                        deferred.reject({message: "Impossible de mettre à jour le mail"});
                    }
                    else
                    {
                        deferred.resolve(response);
                    }
                }, function (err) {
                    if(err.data && err.data.translations)
                    {
                        return deferred.reject(err.data.translations.fr);
                    }
                    return deferred.reject(err);
                });
            }
            else
            {
                MailSave.save($scope.mail, function (response) {
                    deferred.resolve(response);
                }, function (err) {
                    if(err.data && err.data.translations)
                    {
                        return deferred.reject(err.data.translations.fr);
                    }
                    return deferred.reject(err);
                });
            }
            deferred.promise.then(function (response) {
                if(isQuit)
                {
                    $location.path("/mails");
                }
                else
                {
                    toastService.toast("success", "Mail sauvegardé !");
                    $location.path("/mails/" + response._id);
                }

            }, function (err) {
                if(err)
                {
                    toastService.toast("danger", err);
                }
                else
                {
                    toastService.toast("danger", err);
                }
            });
        };

        //Suppression d'un mail
        $scope.remove = function (_id) {
            if(confirm("Êtes-vous sûr de vouloir supprimer ce mail ?"))
            {
                MailRemove.remove({_id: _id}, function () {
                    toastService.toast("success", "Mail supprimé");
                    $location.path("/mails");
                });
            }
        };


        //Ouverture de la modal d'envoie de mails test
        $scope.openItemModal = function (lang) {
            $modal.open({
                templateUrl: 'app/mail/views/mail-detail-test.html',
                controller: 'MailDetailTestCtrl',
                resolve: {
                    mail: function () {
                        return $scope.mail;
                    },
                    lang: function () {
                        return lang;
                    }
                }
            }).result.then(function () {
            });
        };

    }
]);

MailControllers.controller("MailDetailTestCtrl", [
    "$scope", "$q", "$routeParams", "$location", "toastService", "MailSave", "MailUpdate", "MailRemove", "MailGetById", "MailTypesGet", "MailVariables", "TestMail", "mail", "$modalInstance","lang",
    function ($scope, $q, $routeParams, $location, toastService, MailSave, MailUpdate, MailRemove, MailGetById, MailTypesGet, MailVariables, TestMail, mail,$modalInstance, lang) {
        
        $scope.path = $routeParams.mailId; 
        $scope.mail = mail;
        $scope.lang = lang;
        $scope.loading = false;
        $scope.type = {
            "register" : [
                { name: 'firstname', value:'' },
                { name: 'lastname', value:'' },
                { name: 'company', value:'' },
                { name: 'login', value: '' },
                { name: 'name', value: ''},
                { name: 'activate_account_token', value: '' }
            ],
            "activationAccount": [
                { name: 'firstname', value: '' },
                { name: 'lastname', value: '' },
                { name: 'company', value: '' },
                { name: 'name', value: ''},
                { name: 'activate_account_token' },
            ],
            "orderSuccess":  [
                { name: 'taxdisplay' },
                { name: 'firstname', value: '' },
                { name: 'lastname', value: '' },
                { name: 'company', value: '' },
                { name: 'number' },
                { name: 'dateReceipt' },
                { name: 'hourReceipt' },
                { name: 'address' },
                { name: 'totalamount' },
                { name: 'orderdata' },
                { name: 'appUrl' },
                { name: 'payment_type' },
                { name: 'delivery_type' }
            ],
            "orderSuccessDeferred": [
                { name: 'taxdisplay' },
                { name: 'firstname', value: '' },
                { name: 'lastname', value: '' },
                { name: 'company', value: '' },
                { name: 'number' },
                { name: 'dateReceipt' },
                { name: 'hourReceipt' },
                { name: 'address' },
                { name: 'totalamount' },
                { name: 'orderdata' },
                { name: 'appUrl' },
                { name: 'payment_type' },
                { name: 'delivery_type' }
            ],
            "orderSuccessCompany":   [
                { name: 'firstname', value: '' },
                { name: 'lastname', value: '' },
                { name: 'company', value: '' },
                { name: 'taxdisplay' },
                { name: 'number' },
                { name: 'dateReceipt' },
                { name: 'hourReceipt' },
                { name: 'address' },
                { name: 'totalamount' },
                { name: 'appUrl' },
                { name: 'customer_mobile_phone' },
                { name: 'payment_type' },
                { name: 'delivery_type' },
                { name: 'shipment' }
            ],
            "sendRegisterForAdmin": [
                { name: 'firstname', value: '' },
                { name: 'lastname', value: '' },
                { name: 'login', value: '' },
                { name: 'fullname', value: '' },
                { name: 'name', value: '' },
                { name: 'company', value: '' }
            ],
            "passwordRecovery":    [
                { name: 'firstname', value: '' },
                { name: 'lastname', value: '' },
                { name: 'company', value: '' },
                { name: 'tokenlink' }
            ],
            "changeOrderStatus":  [
                { name: 'appUrl' },
                { name: 'number' },
                { name: 'firstname', value: '' },
                { name: 'lastname', value: '' },
                { name: 'company', value: '' },
                { name: 'status' }
            ],
        
            "contactMail":   [
                { name: 'formDatas' },
            ],
            "rmaOrder":      [
                { name: 'number' },
                { name: 'date' },
                { name: 'articles' },
                { name: 'refund' },
                { name: 'firstname', value: '' },
                { name: 'lastname', value: '' },
                { name: 'fullname', value: '' }
            ],
            "orderSent":     [
                { name: 'number' },
                { name: 'trackingUrl' },
                { name: 'date' },
                { name: 'transporterName' },
                { name: 'address' },
                { name: 'fullname', value: '' },
                { name: 'company', value: '' },
            ],

        };
        $scope.dataMail = $scope.type[$scope.mail.type];

        //Envoie de mail test
        $scope.testMail = function(){
            $scope.loading = true;
            if($scope.mail.to && $scope.mail.to !== "") {
                for (var data in $scope.dataMail) {
                    if($scope.dataMail[data] === undefined){
                        $scope.dataMail[data] = "";
                    };
                }
                TestMail.query({ mail: $scope.mail, values: $scope.dataMail, lang: $scope.lang }, function (res) {
                    toastService.toast("success", "Mail Test envoyé.");
                    $scope.loading = false;
                    $modalInstance.close();
                }, function (r) {
                    toastService.toast("warning", r.data.message);
                    $scope.loading = false;
                })
            }else{
                $scope.loading = false;
                toastService.toast("warning", "Veuillez saisir le destinataire.");
            }
        }
    }
]);
