var SetOptionsControllers = angular.module('aq.setOptions.controllers', []);

SetOptionsControllers.controller('SetOptionListCtrl', ['$scope', '$location', 'SetOption', function ($scope, $location, SetOption)
{

    function init()
    {
        $scope.sortType = 'name'; // set the default sort type
        $scope.sortReverse = false;  // set the default sort order
    }

    init();
    function getSetOptions()
    {
        SetOption.query({}, function (setOptionsList)
        {
            $scope.setOptions = setOptionsList;
        });
    }

    getSetOptions();

    $scope.goToSetOptionDetails = function(setOptionCode){
        $location.path("/setOptions/" + setOptionCode);
    }

}]);

SetOptionsControllers.controller('SetOptionNewCtrl', ['$scope', '$location', 'SetOption', 'toastService', function ($scope, $location, SetOption, toastService)
{
    $scope.setOption = {};
    $scope.save = function (data)
    {
        data['update'] = false;
        SetOption.save(data, function (msg)
        {
            if(msg.alreadyExist)
            {
                toastService.toast("warning", 'Un jeu d\'options existe déjà avec ce code, vous allez être redirigé vers celui-ci.');
                $location.path("/setOptions/" + data['code']);
            }
            else if(msg.status)
            {
                $location.path("/setOptions");
            }
            else
            {
                console.error("Error!");
            }
        });
    };

}]);

SetOptionsControllers.controller('SetOptionDetailCtrl', ['$scope', '$http', '$q', '$location', '$routeParams', 'SetOption', 'OptId', 'toastService', function ($scope, $http, $q, $location, $routeParams, SetOption, OptId, toastService)
{
    $scope.setOption = SetOption.get({setOptionCode: $routeParams.setOptionCode}, function (obj)
    {
        if(obj.code === undefined)
        {
            toastService.toast("danger", 'Ce jeu d\'options n\'existe pas');
            $location.path("/setOptions");
        }
        if(!angular.isDefined($scope.setOption.code))
        {
            $scope.setOption.code = "";
        }

        function init()
        {
            $scope.sortType = 'name'; // set the default sort type
            $scope.sortReverse = false;  // set the default sort order
        }

        init();
        function getOptions()
        {
            $scope.opt = [];
            for(var i = 0; i < $scope.setOption.opts.length; i++)
            {
                OptId.fOne({id: $scope.setOption.opts[i]}, function (opt)
                {
                    $scope.opt.push({name: opt.name, code: opt.code});
                });
            }
        }

        getOptions();

        $scope.goToOptionDetails = function(optionCode){
            $location.path("/opts/" + optionCode);
        }
    });


    $scope.save = function (data)
    {
        data['update'] = true;
        SetOption.save(data, function (msg)
        {
            if(msg.status)
            {
                $location.path("/setOptions");
            }
            else
            {
                console.error("Error!");
            }
        });
    };

    $scope.remove = function (setOptionCode)
    {
        if(confirm("Êtes-vous sur de vouloir supprimer ce jeu d'options ?"))
        {
            SetOption.remove({setOptionCode: setOptionCode}).$promise.then(function ()
            {
                $location.path("/setOptions");
            }, function (err)
            {
                toastService.toast("danger", err.data);
            });
        }
    };

}]);
