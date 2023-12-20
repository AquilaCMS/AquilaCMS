var JobServices = angular.module('aq.job.services', ['ngResource']);


JobServices.factory('JobGetAll', ['$resource', function ($resource) {
    return $resource('/v2/jobs', {}, {
        query: { method: 'GET', isArray: true }
    });
}]);

JobServices.service('JobPlay', ['$resource', function ($resource) {
    return $resource('/v2/job/play/:_id', {}, {
        play: { method: 'GET', params: {} },
    });
}]);
JobServices.service('JobPlayImmediate', ['$resource', function ($resource) {
    return $resource('/v2/job/play/immediate/:_id', {}, {
        play: { method: 'GET', params: {} },
    });
}]);
JobServices.service('JobPause', ['$resource', function ($resource) {
    return $resource('/v2/job/pause/:_id', {}, {
        pause: { method: 'GET', params: {} },
    });
}]);

JobServices.factory('JobGetById', ['$resource', function ($resource) {
    return $resource('/v2/job/:_id', {}, {
        query: { method: 'GET', param: {} },
    });
}]);

JobServices.factory('JobRemove', ['$resource', function ($resource) {
    return $resource('/v2/job/:_id', {}, {
        remove: { method: 'DELETE', params: {} },
    });
}]);
JobServices.factory('JobUpdate', ['$resource', function ($resource) {
    return $resource('/v2/job', {}, {
        update: { method: 'PUT', params: {} }
    });
}]);
JobServices.factory('ExecRules', ['$resource', function ($resource) {
    return $resource('/v2/rules/execRule', {}, {
        exec: { method: 'POST', params: {}, isArray: true },
        update: { method: 'POST', params: {} }
    });
}]);
JobServices.factory('JobSave', ['$resource', function ($resource) {
    return $resource('/v2/job', {}, {
        save: { method: 'PUT', params: {} }
    });
}]);

