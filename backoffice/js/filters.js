'use strict';

/* Filters */

var adminCatagenFilters = angular.module('adminCatagenFilters', []);

adminCatagenFilters.filter('reverse', function() {
    return function(input, uppercase) {
      input = input || '';
      var out = "";
      for (var i = 0; i < input.length; i++) {
        out = input.charAt(i) + out;
      }
      // conditional based on optional argument
      if (uppercase) {
        out = out.toUpperCase();
      }
      return out;
    };
  });

adminCatagenFilters.filter('checkmark', function() {
  return function(input) {
    return input ? '\u2713' : '\u2718';
  };
});

adminCatagenFilters.filter('gt', function() {
  return function (items, field, value) {
    var filteredItems = [];
    angular.forEach(items, function (item) {
      if (!value || item[field] > value ) {
        filteredItems.push(item);
      }
    });
    return filteredItems;
  }
});

adminCatagenFilters.filter('lt', function() {
  return function (items, field, value) {
    var filteredItems = [];
    angular.forEach(items, function (item) {
      if (!value || item[field] < value ) {
        filteredItems.push(item);
      }
    });
    return filteredItems;
  }
});

adminCatagenFilters.filter('searchPaymentStatus', function() {
  return function (items, values) {
    var filteredItems = [];
    angular.forEach(items, function (item) {
      if(!values.statusTodo && !values.statusDone && !values.statusCanceled && !values.statusFailed) {
        filteredItems.push(item);
      } else if ((item.status === 'TODO' && values.statusTodo)
        || (item.status === 'DONE' && values.statusDone)
        || (item.status === 'FAILED' && values.statusFailed)
        || (item.status === 'CANCELED' && values.statusCanceled)) {
        filteredItems.push(item);
      }
    });
    return filteredItems;
  }
});

adminCatagenFilters.filter('searchPaymentType', function() {
  return function (items, values) {
    var filteredItems = [];
    angular.forEach(items, function (item) {
      if(!values.typeCredit && !values.typeDebit) {
        filteredItems.push(item);
      } else if ((item.type == 'CREDIT' && values.typeCredit)
        || (item.type == 'DEBIT' && values.typeDebit)) {
        filteredItems.push(item);
      }
    });
    return filteredItems;
  }
});

adminCatagenFilters.filter('bt', function() {
    return function (items, field, value, range) {
        var filteredItems = [];
        angular.forEach(items, function (item) {
            var newItem = field.split(".").reduce(function(o, x) {
                if(o !== undefined && x !== undefined && o[x] !== undefined)
                {
                    return o[x];
                }
            }, item);

            if ((!value || !range)
                || (newItem >= parseInt(value, 10)-parseInt(range, 10) && newItem <= parseInt(value, 10)+parseInt(range, 10))) {
                filteredItems.push(item);
            }
        });
        return filteredItems;
    };
});

adminCatagenFilters.filter('btdate', function() {
  return function (items, field, value, range) {
    var filteredItems = [];
    angular.forEach(items, function (item) {
        var newItem = field.split(".").reduce(function(o, x) {
            return o[x];
        }, item);

        var originalDate = Date.parse(new Date(newItem));
        var referanceDate = Date.parse(new Date(value));
        var rangeInMilliseconds = range*24*3600*1000;
        if ((!value || !range)
          || (parseInt(originalDate, 10) > parseInt(referanceDate, 10)-parseInt(rangeInMilliseconds, 10)
          && parseInt(originalDate, 10) < parseInt(referanceDate, 10)+parseInt(rangeInMilliseconds, 10)+(24*3600*1000))) {
            filteredItems.push(item);
        }
    });
    return filteredItems;
  }
});

adminCatagenFilters.filter('orderStatus',[ 'NSConstants', function(NSConstants) {
  return function (item) {
    const orderStatuses = {};
    NSConstants.orderStatus.translation.fr.forEach((ele) => orderStatuses[ele.code] = ele.code)
    const arrayOfTranslationWrited = [
      orderStatuses.PAYMENT_PENDING,
      orderStatuses.PAYMENT_RECEIPT_PENDING,
      orderStatuses.PAYMENT_CONFIRMATION_PENDING,
      orderStatuses.PAYMENT_FAILED,
      orderStatuses.PAID,
      orderStatuses.PROCESSING,
      orderStatuses.PROCESSED,
      orderStatuses.BILLED,
      orderStatuses.DELIVERY_PROGRESS,
      orderStatuses.DELIVERY_PARTIAL_PROGRESS,
      orderStatuses.FINISHED,
      orderStatuses.CANCELED,
      orderStatuses.ASK_CANCEL,
      orderStatuses.RETURNED
    ];
    if(arrayOfTranslationWrited.includes(item)){
      return `order.status.${item}`;
    }
    //translation is undefined
    return item;
  }
}]);

adminCatagenFilters.filter('paymentType', function() {
  return function (item) {
    //this function return a translation code of the translation file : "order.json"
    //the returned value need the be translated
    const arrayOfTranslationWrited = ["DEBIT", "CREDIT"];
    if(arrayOfTranslationWrited.includes(item)){
      return `order.paymentType.${item}`;
    }
    //translation is undefined (not writed)
    return item;
  }
});

adminCatagenFilters.filter('paymentStatus', function() {
  return function (item) {
    //this function return a translation code of the translation file : "order.json"
    //the returned value need the be translated
    const arrayOfTranslationWrited = ["DONE", "TODO", "FAILED", "CANCELED"];
    if(arrayOfTranslationWrited.includes(item)){
      return `order.paymentStatus.${item}`;
    }
    //translation is undefined (not writed)
    return item;
  }
});

adminCatagenFilters.filter('paymentMode', function() {
  //this function return a translation code of the translation file : "order.json"
  //the returned value need the be translated
  return function (item) {
    if (item == "CB") {
      return "order.paymentMode.CB";
    } else if (item == "CHEQUE") {
      return "order.paymentMode.CHEQUE";
    } else if (item == "TRANSFER") {
      return "order.paymentMode.TRANSFER";
    } else if (item == "CASH") {
      return "order.paymentMode.CASH";
    }
    return item;
  }
});

adminCatagenFilters.filter('checked', function() {
  return function(input) {
      //return input ? '<span class="label label-success">Visible</span>' : '<span class="label label-danger">Invisible</span>';
      return input ? '<span class="icon green"><i class="ico-check-large"></i></span>' :
          '<span class="icon red"><i class="ico-close-large"></i></span>';
  };
});

adminCatagenFilters.filter('image', function() {
  return function(input, size) {
    if ( angular.isDefined(input) ) {
        return input.replace("/real/", "/"+size+"/");
    } else {
        return null;
    }
  };
});

adminCatagenFilters.filter('slugNoId', function() {
  return function(input) {
    var arrayInput = input.split("-");
    arrayInput.pop();
    return arrayInput.join(" ");
  };
});

adminCatagenFilters.filter('logInsertDate', function() {
  return function(input) {

    var date = new Date(input);
    date.setHours(0,0,0,0);
    var today = new Date();
    today.setHours(0,0,0,0);

    var redLog = "<span class=\"icon red\">"
               + "    <i class=\"fa fa-warning\"></i>"
               + "</span>";

    var greenLog = "<span class=\"icon green\">"
                 + "    <i class=\"glyphicon glyphicon-ok-circle\"></i>"
                 + "</span>";

    return ( date.getTime() - today.getTime() == 0) ? greenLog : redLog;
  };
});

adminCatagenFilters.filter('toSlug', function() {
  return function(input) {

    return input.toString().toLowerCase()
      .replace(/\s+/g, '-')        // Replace spaces with -
      .replace(/[^\w\-]+/g, '')   // Remove all non-word chars
      .replace(/\-\-+/g, '-')      // Replace multiple - with single -
      .replace(/^-+/, '')          // Trim - from start of text
      .replace(/-+$/, '');         // Trim - from end of text
  };
});

adminCatagenFilters.filter('ouiNon', function() {
  return function(input) {
    return input ? 'Oui' : 'Non';
  };
});

// filtre cutome pour les groupements de CMSs/Statiques/Medias
adminCatagenFilters.filter('filterListGeneral', function() {
  return function(models, value) {
    // si c'est un object, on trie par la clé "group" à la racine de l'object
    if(typeof models === 'object') {    
      return models.filter(model => model && (model.group === value || (value === "general" && (model.group === '' || model.group === null || model.group === 'general'))));
      // si c'est un string, on tri directement par le string
    } else if(typeof models === 'string') {     
      return models.filter(model => model && (model === value || (value === "general" && (model === '' || model === null || model === 'general'))));
    }
  }
});
