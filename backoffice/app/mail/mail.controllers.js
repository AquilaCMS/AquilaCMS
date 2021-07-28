var MailControllers = angular.module("aq.mail.controllers", ['ui.bootstrap']);

/**
 * Controller de la page contenant la liste des Mails
 */
MailControllers.controller("MailListCtrl", [
    "$scope", "$location", "Mail", "MailTypesGet", "$rootScope", function ($scope, $location, Mail, MailTypesGet, $rootScope) {
        $scope.adminLang = $rootScope.adminLang;
        $scope.isEditMode = true;
        $scope.filter = {};

        $scope.detail = function (mail) {
            $location.url("/mails/" + mail._id);
        };

        $scope.defaultLang = $rootScope.languages.find(function (lang) {
            return lang.defaultLanguage;
        }).code;

        $scope.getAllMails = function(){
            let filter = {};
            const filterKeys = Object.keys($scope.filter);
            for (let i = 0, leni = filterKeys.length; i < leni; i++) {
                if($scope.filter[filterKeys[i]] === null){
                    break;
                }
                if(filterKeys[i].includes("isVisible")) {
                    if($scope.filter.isVisible == "true"){
                        filter["isVisible"] = true;
                    }else if($scope.filter.isVisible == "false"){
                        filter["isVisible"] = false;
                    }
                } else if(filterKeys[i].includes("subject")) {
                    if($scope.filter.subject != ""){
                        filter["translation."+$scope.defaultLang+".subject"] = { $regex: $scope.filter.subject, $options: "i" };
                    }
                } else {
                    if (typeof ($scope.filter[filterKeys[i]]) === 'object'){
                        filter[filterKeys[i] + ".number"] = { $regex: $scope.filter[filterKeys[i]].number, $options: "i" };
                    }else{
                        if($scope.filter[filterKeys[i]].toString() != ""){
                            filter[filterKeys[i]] = { $regex: $scope.filter[filterKeys[i]].toString(), $options: "i" };
                        }
                    }
                }
            }
            Mail.list({PostBody: {filter, structure: '*', limit: 100, page: 1}}, function ({datas, count}) {
                $scope.mails = datas;
            });
        };

        MailTypesGet.query({}, function (mailTypes) {
            $scope.mailTypes = mailTypes;
        });
        
        $scope.getAllMails();

        

        $scope.getMailTypeDesc = function(type){
            if ($scope.mailTypes && $scope.adminLang){
                const currentType = $scope.mailTypes.find(x => x.code === type);
                if(currentType) {
                    type = currentType.translation[$scope.adminLang].name;
                }
            }
            return type;
        }
    }
]);


/**
 * Controller de la page contenant le detail d'un Mail
 */
MailControllers.controller("MailDetailCtrl", [
    "$scope", "$q", "$routeParams", "$location", "toastService", "MailRemovePdf", "MailSave", "MailUpdate", "MailRemove", "MailGetById", "MailTypesGet", "MailVariables","$modal","$translate",
    function ($scope, $q, $routeParams, $location, toastService, MailRemovePdf, MailSave, MailUpdate, MailRemove, MailGetById, MailTypesGet, MailVariables, $modal, $translate) {
        $scope.mail = {};
        $scope.mailTypes = [];
        $scope.nsUploadFiles = {
            isSelected: false
        };

        $scope.langChange = function (lang) {
            $scope.lang = lang;
        };

        $scope.additionnalButtons = [
            {
                text: 'mail.detail.test',
                onClick: function () {
                    $scope.openItemModal($scope.lang, $scope.mail.type)
                },
                icon:'<i class="fa fa-envelope-o" aria-hidden="true"></i>'
            }
        ]

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

        $scope.getNameAttachment = function(file){
            let name = file.name.originalname + "." + file.name.mimetype.split("/")[1];
            return name;
        }
        
        $scope.MailGetById = function () {
            MailGetById.query({_id: $routeParams.mailId}, function (mail) {
                $scope.mail = mail;
            });
        };
        //On récupére le document uniquement si nous sommes en mode edit
        if($scope.isEditMode)
        {
            $scope.MailGetById();
        }else{
            $scope.mail.type = "";
        }

        $scope.after = function(){
            $scope.MailGetById();
            toastService.toast("success", $translate.instant("mail.detail.fileSaved"));
        }

        $scope.uploadError = function(){
                toastService.toast("danger", $translate.instant("mail.detail.fileUnsaved"));
        }

        $scope.deletePdf = function(position, lang){
            let path = $scope.mail.translation[lang].attachments[position].path;
            $scope.mail.translation[lang].attachments.splice(position, 1);
            MailRemovePdf.removePdf({mail:$scope.mail, path}, function (response) {
                if (response.msg) {
                    toastService.toast("danger", $translate.instant("mail.detail.fileUnsaved"));
                    $scope.MailGetById();
                }
                else {
                    toastService.toast("success", $translate.instant("mail.detail.fileDelete"));
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
            if ($scope.nsUploadFiles.isSelected) {
                let response = confirm($translate.instant("confirm.fileAttachedNotSaved"));
                if (!response) { return }
            }
            $scope.form.nsSubmitted = true;
            if($scope.form.$invalid)
            {
                toastService.toast("danger", $translate.instant("mail.detail.mailUnsaved"));
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
                    if(err.data && err.data.message)
                    {
                        return deferred.reject(err.data.message);
                    }
                    return deferred.reject(err);
                });
            }
            else
            {
                MailSave.save($scope.mail, function (response) {
                    deferred.resolve(response);
                }, function (err) {
                    if(err.data && err.data.message)
                    {
                        return deferred.reject(err.data.message);
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
                    toastService.toast("success", $translate.instant("mail.detail.mailSaved"));
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
            if (confirm($translate.instant("confirm.deleteMail")))
            {
                MailRemove.remove({_id: _id}, function () {
                    toastService.toast("success", $translate.instant("mail.detail.mailDelete"));
                    $location.path("/mails");
                });
            }
        };


        //Ouverture de la modal d'envoie de mails test
        $scope.openItemModal = function (lang, mail) {
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
    "$scope", "$rootScope","$q", "$routeParams", "$location", "toastService", "MailSave", "MailUpdate", "MailRemove", "MailGetById", "MailTypeGet", "MailVariables", "TestMail", "mail", "$modalInstance","lang", "$translate",
    function ($scope,$rootScope,$q, $routeParams, $location, toastService, MailSave, MailUpdate, MailRemove, MailGetById, MailTypeGet, MailVariables, TestMail, mail,$modalInstance, lang, $translate) {
        $scope.path = $routeParams.mailId; 
        $scope.mail = mail;
        $scope.lang = lang;
        $scope.adminLang = $rootScope.adminLang;
        $scope.loading = false;
        MailTypeGet.query({code:$scope.mail.type}, function (mailType) {
            $scope.mailType = mailType;
        });

        $scope.cancel = function () {
            $modalInstance.dismiss('cancel');
        };

        //Envoie de mail test
        $scope.testMail = function(variables){
            $scope.loading = true;
            if($scope.mail.to && $scope.mail.to !== "") {
                for (var data in variables) {
                    if (variables[data].text === undefined){
                        variables[data].text = "";
                    };
                }
                TestMail.query({ mail: $scope.mail, values: variables, lang: $scope.lang }, function (res) {
                    toastService.toast("success", $translate.instant("mail.test.testMailSend"));
                    $scope.loading = false;
                    $modalInstance.close();
                }, function (r) {
                    toastService.toast("warning", r.data.message);
                    $scope.loading = false;
                })
            }else{
                $scope.loading = false;
                toastService.toast("warning", $translate.instant("mail.test.enterRecipient"));
            }
        }
    }
]);
