var ClientServices = angular.module('aq.client.services', []);

ClientServices.factory('Client', ['$resource', function ($resource)
{
    return $resource('client/:clientId', {}, {
        query: {method: 'GET', param: {clientId: ''}},

		remove: {method: 'DELETE', params: {}}
    });
}]);

ClientServices.factory('ClientAdmin', ['$resource', function ($resource)
{
    return $resource('v2/auth/loginAdminAsClient', {}, {
        logAsClient: {method: 'POST', params: {}}
    });
}]);

ClientServices.factory('ClientUpdate', ['$resource', function ($resource)
{
	return $resource('users/update', {}, {
		update: {method: 'POST', params: {}}
	});
}]);

ClientServices.factory('ClientScroll', ['$resource', function ($resource)
{
    return $resource('client/partial/:start/:limit', {}, {
        query: {method: 'GET', params: {start: '', limit: ''}, isArray: true}
    });
}]);

ClientServices.factory('ClientSearch', ['$resource', function ($resource)
{
    return $resource('client/search', {}, {
        query: {method: 'POST', params: {}, isArray: true}
    });
}]);

ClientServices.factory('ClientCountry', ['$resource', function ($resource)
{
    return $resource('v2/territory', {}, {
        query: {method: 'POST', params: {}, isArray: false}
    });
}]);

ClientServices.factory('Newsletter', ['$resource', function ($resource)
{
    return $resource('v2/newsletter/:email', {}, {
        list: { method: 'GET', params: {}, isArray: false },
        query: { method: 'POST', params: {}, isArray: false }
    });
}]);
ClientServices.factory('ActivateAccount', ['$resource', function ($resource)
{
    return $resource('v2/mail/activation/account/sent/:userId/:lang', {}, {
        query: { method: 'GET', params: {}, isArray: false }
    });
}]);

ClientServices.service('ClientColumns', function ()
{
    return [];
});

ClientServices.service('ClientFields', function ()
{
    return [];
});

ClientServices.service("ClientBlocks", function ()
{
    return [];
});


// route v2

ClientServices.factory('ClientV2', ['$resource', function ($resource)
{
    return $resource('v2/:type/:id', {}, {
        list: {method: 'POST', params: {type: 'users'}},
        query: {method: 'POST', params: {type: 'user'}},
        save: {method: 'PUT', params: {type: 'user'}},
		delete: {method: 'DELETE', params: {type: 'user'}},
        getUserTypes: {method: 'POST', params: {type: 'getUserTypes'}, isArray: true},
        resetpassword: {method: 'POST', params: {type: 'user', id: 'resetpassword'}},
        testUser: {method: 'POST', params: {type: 'rules', id: 'testUser'}, isArray: true}
    });
}]);