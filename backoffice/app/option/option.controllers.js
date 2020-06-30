var OptionControllers = angular.module('aq.option.controllers', []);

OptionControllers.controller('OptListCtrl', ['$scope', '$location', 'Opt', 'SetOptionId', 'OptId', function ($scope, $location, Opt, SetOptionId, OptId)
{

    function init()
    {
        $scope.sortType = 'name'; // set the default sort type
        $scope.sortReverse = false;  // set the default sort order
    }

    init();
    function getOptionsClassed()
    {
        Opt.queryClassed({}, function (optsList)
        {
            $scope.optionsClassed = optsList;
            angular.forEach($scope.optionsClassed, function (opt, index)
            {
                opt.setOpts = [];
                for(var i = 0; i < opt.set_options.length; i++)
                {
                    SetOptionId.fOne({id: opt.set_options[i]}, function (setOption)
                    {
                        opt.setOpts.push({name: setOption.name, code: setOption.code});
                    });
                }
            });
        });
    }

    function getOptionsOrphans()
    {
        OptId.queryOrphans({}, function (optionsList)
        {
            $scope.optionsOrphans = optionsList;
        });
    }

    getOptionsClassed();
    getOptionsOrphans();

    $scope.goToOptionDetails = function(optionCode){
        $location.path("/opts/" + optionCode);
    }

}]);

OptionControllers.controller('OptNewCtrl', ['$scope', '$location', 'Opt', 'SetOption', '$routeParams', '$timeout', 'toastService', function ($scope, $location, Opt, SetOption, $routeParams, $timeout, toastService)
{

    SetOption.query({}, function (tab)
    {
        $scope.set_options = tab;
    });

    $scope.opt = [];
    $scope.opt = {
        set_options: [], columns: []
    };

    $scope.choicesC = [];
    $scope.opt.values = [];
    $scope.disableColumns = false;
    $scope.disableLines = false;

    $scope.checkEmpty = function ()
    {
        var arr = [];
        angular.forEach($scope.choicesC, function (column)
        {
            arr.push(column.name);
        });
        function check(element)
        {
            return element.name === undefined;
        }

        if((new Set(arr)).size !== arr.length || $scope.choicesC.find(check))
        {
            $scope.disableLines = true;
        }
        else
        {
            $scope.disableLines = false;
        }
    };

    $scope.addNewChoiceC = function ()
    {
        var newItemNo = $scope.choicesC.length + 1;
        $scope.choicesC.push({'id': 'C' + newItemNo});
        $scope.disableLines = true;
    };

    $scope.removeChoiceC = function ()
    {
        var lastItem = $scope.choicesC.length - 1;
        if($scope.choicesC[lastItem].id != "C1")
        {
            $scope.choicesC.splice(lastItem);
        }
        else
        {
            toastService.toast("danger", 'Impossible de supprimer la colonne Nom !');
        }

    };

    $scope.choicesC.unshift({id: 'C1', name: 'Nom', type: 'Texte Court'});
    $scope.opt.columns = [];
    $scope.opt.columns = $scope.choicesC;

    if($routeParams.code)
    {
        SetOption.get({setOptionCode: $routeParams.code}, function (setOpt)
        {
            $scope.opt.set_options.push(setOpt._id);
            $scope.selectedSet = setOpt._id;
            $scope.display = false;
            $scope.setName = setOpt.name;
        });
    }
    else
    {
        $scope.display = true;
        $scope.selectedSet = "";
    }

    $scope.addNew = function ()
    {
        $scope.disableColumns = true;
        var lines = {};
        angular.forEach($scope.opt.columns, function (column)
        {
            lines[column.name] = null;
        });
        $scope.opt.values.push(lines);
    };

    $scope.removeLine = function ()
    {
        var newDataList = [];
        $scope.selectedAll = false;
        angular.forEach($scope.opt.values, function (selected)
        {
            if(!selected.selected)
            {
                newDataList.push(selected);
            }
        });
        $scope.opt.values = newDataList;
        if(!$scope.opt.values.length)
        {
            $scope.disableColumns = false;
        }
    };

    $scope.checkAll = function ()
    {
        if(!$scope.selectedAll)
        {
            $scope.selectedAll = true;
        }
        else
        {
            $scope.selectedAll = false;
        }
        angular.forEach($scope.opt.values, function (value)
        {
            value.selected = $scope.selectedAll;
        });
    };

    $scope.save = function (data)
    {
        data['update'] = false;
        Opt.save(data, function (res)
        {
            if(res.alreadyExist)
            {
                toastService.toast("warning", 'Une option existe déjà avec ce code, vous allez être redirigé vers celle-ci.');
                $location.path("/opts/" + data['code']);
            }
            else if(res._id)
            {
                $location.path("/opts/" + res.code);
            }
            else
            {
                console.error("Error!");
            }
        });
    };

}]);

OptionControllers.controller('OptDetailCtrl', ['$scope', '$http', '$q', '$location', '$routeParams', 'Opt', 'SetOptionId', 'SetOption', '$timeout', 'toastService', function ($scope, $http, $q, $location, $routeParams, Opt, SetOptionId, SetOption, $timeout, toastService)
{
    $scope.opt = Opt.get({optCode: $routeParams.optCode}, function (obj)
    {
        if(obj.code === undefined)
        {
            toastService.toast("danger", 'Cette option n\'existe pas');
            $location.path("/opts");
        }
        if(!angular.isDefined($scope.opt.code))
        {
            $scope.opt.code = "";
        }

        $scope.opt.multiOptions = $scope.opt.set_options;

        $scope.opt.selectedSetOpts = $scope.opt.set_options;
        for(var i = 0; i < $scope.opt.selectedSetOpts.length; i++)
        {
            SetOptionId.fOne({id: $scope.opt.selectedSetOpts[i]}, function (setOption)
            {
                $scope.opt.set_options[setOption._id] = {
                    name: setOption.name, code: setOption.code, _id: setOption._id
                };
            });
        }

        SetOption.query({}, function (tab)
        {
            $scope.opt.setOptionsAll = tab;
        });
        $scope.choicesC = $scope.opt.columns;
        if($scope.opt.values.length == 0)
        {
            $scope.disableColumns = false;
        }
        else
        {
            $scope.disableColumns = true;
        }
        $scope.disableLines = false;

        $scope.checkEmpty = function ()
        {
            var arr = [];
            angular.forEach($scope.choicesC, function (column)
            {
                arr.push(column.name);
            });
            function check(element)
            {
                return element.name === undefined;
            }

            if((new Set(arr)).size !== arr.length || $scope.choicesC.find(check))
            {
                $scope.disableLines = true;
            }
            else
            {
                $scope.disableLines = false;
            }
        };

        $scope.addNewChoiceC = function ()
        {
            var newItemNo = $scope.choicesC.length + 1;
            $scope.choicesC.push({'id': 'C' + newItemNo});
            $scope.disableLines = true;
        };

        $scope.removeChoiceC = function ()
        {
            var lastItem = $scope.choicesC.length - 1;
            if($scope.choicesC[lastItem].id != "C1")
            {
                $scope.choicesC.splice(lastItem);
            }
            else
            {
                toastService.toast("danger", 'Impossible de supprimer la colonne Nom !');
            }
        };

        $scope.opt.columns = [];
        $scope.opt.columns = $scope.choicesC;

        if($routeParams.code)
        {
            SetOption.get({setOptionCode: $routeParams.code}, function (setOpt)
            {
                $scope.opt.set_options.push(setOpt._id);
                $scope.selectedSet = setOpt._id;
                $scope.display = false;
                $scope.setName = setOpt.name;
            });
        }
        else
        {
            $scope.display = true;
            $scope.selectedSet = "";
        }

        $scope.addNew = function ()
        {
            $scope.disableColumns = true;
            var lines = {};
            angular.forEach($scope.opt.columns, function (column)
            {
                lines[column.name] = null;
            });
            $scope.opt.values.push(lines);
        };

        $scope.removeLine = function ()
        {
            var newDataList = [];
            $scope.selectedAll = false;
            angular.forEach($scope.opt.values, function (selected)
            {
                if(!selected.selected)
                {
                    newDataList.push(selected);
                }
            });
            $scope.opt.values = newDataList;
            if(!$scope.opt.values.length)
            {
                $scope.disableColumns = false;
            }
        };

        $scope.checkAll = function ()
        {
            if(!$scope.selectedAll)
            {
                $scope.selectedAll = true;
            }
            else
            {
                $scope.selectedAll = false;
            }
            angular.forEach($scope.opt.values, function (value)
            {
                value.selected = $scope.selectedAll;
            });
        };
    });

    $scope.save = function (data)
    {
        data.multiModifAdd = [];
        data.multiModifRemove = [];
        if($scope.opt.set_options.length >= $scope.opt.multiOptions.length)
        {
            var i = 0;
            while(i < $scope.opt.set_options.length)
            {
                if($scope.opt.multiOptions.indexOf($scope.opt.set_options[i]) == -1)
                {
                    data.multiModifAdd.push($scope.opt.set_options[i]);
                }

                i++;
            }
        }
        if($scope.opt.multiOptions.length >= $scope.opt.set_options.length)
        {
            var i = 0;
            while(i < $scope.opt.multiOptions.length)
            {
                if($scope.opt.set_options.indexOf($scope.opt.multiOptions[i]) == -1)
                {
                    data.multiModifRemove.push($scope.opt.multiOptions[i]);
                }

                i++;
            }
        }
        data['update'] = true;
        Opt.save(data, function (msg)
        {
            if(msg.status)
            {
                $location.path("/opts");
            }
            else
            {
                console.error("Error!");
            }
        });
    };

    $scope.remove = function (optCode)
    {
        if(confirm("Êtes-vous sûr de vouloir supprimer cette option ?"))
        {
            Opt.remove({optCode: optCode}).$promise.then(function ()
            {
                $location.path("/opts");
            }, function ()
            {
                toastService.toast("danger", 'Une erreur est survenue lors de la suppression.');
            });
        }
    };

}]);
