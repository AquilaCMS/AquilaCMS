var MailServices = angular.module('aq.mail.services', ['ngResource']);


MailServices.factory('Mail', ['$resource', function ($resource) {
    return $resource('/v2/mails', {}, {
        list: { method: 'POST'}
    });
}]);

MailServices.factory('MailGetById', ['$resource', function ($resource) {
    return $resource('/v2/mail/:_id', {}, {
        query: { method: 'GET', param: {} },
    });
}]);

MailServices.factory('MailRemove', ['$resource', function ($resource) {
    return $resource('/v2/mail/:_id', {}, {
        remove: { method: 'DELETE', params: {} },
    });
}]);

MailServices.factory('MailRemovePdf', ['$resource', function ($resource) {
    return $resource('/v2/mail/removePdf', {}, {
        removePdf: { method: 'PUT', params: {} }
    });
}]);

MailServices.factory('MailUpdate', ['$resource', function ($resource) {
    return $resource('/v2/mail', {}, {
        update: { method: 'PUT', params: {} }
    });
}]);

MailServices.factory('MailSave', ['$resource', function ($resource) {
    return $resource('/v2/mail', {}, {
        save: { method: 'PUT', params: {} }
    });
}]);

MailServices.factory('MailTypesGet', ['$resource', function ($resource) {
    return $resource('/v2/mail_types', {}, {
        query: { method: 'GET', params: {}, isArray: true }
    });
}]);

MailServices.factory('MailTypeGet', ['$resource', function ($resource) {
    return $resource('/v2/mail_type/:code', {}, {
        query: { method: 'GET', params: {}}
    });
}]);

MailServices.service("MailVariables", function ()
{
    return {component_template: ""};
});

MailServices.factory('TestMail', ['$resource', function ($resource) {
    return $resource('v2/mail/test', {}, {
        query: { method: 'POST', params: {} },
    });
}]);

MailServices.factory('TestMailConfig', ['$resource', function ($resource) {
    return $resource('v2/mail/test', {}, {
        sendMailConfig: { method: 'POST', params: {} }
    });
}]);