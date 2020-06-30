var adminCatagenFilters = angular.module('adminCatagenFilters');

adminCatagenFilters.filter('langStatus', function() {
    return function(input) {
      if(input === 'visible') return 'Visible';
      else if(input === 'invisible') return 'Invisible';
      else if(input === 'removing') return 'En cours de suppression';
    };
  });