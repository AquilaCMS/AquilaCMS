/* Directives */

const adminCatagenDirectives = angular.module('adminCatagenDirectives', []);

adminCatagenDirectives.directive("nsAttribute", function ()
{
    return {
        restrict: "E",
        scope: {
            product: "=",
            form: "=",
            init: "="
        },
        templateUrl: "views/templates/nsAttribute.html",
        controller: [
            "$scope",
            "Trademark",
            "Supplier",
            "$filter",
            function ($scope, Trademark, Supplier)
            {
                $scope.supplier = {};
                $scope.trademarkList = Trademark.query();
                $scope.supplierList = Supplier.query();
                $scope.updateSupplierField = function ()
                {
                    $scope.supplier = Supplier.get(
                        {
                            id: $scope.product.supplier_ref
                        },
                        function (resp)
                        {
                            $scope.product.supplier_ref = resp._id;
                        }
                    );
                };
                $scope.$watch("init", function (newValue, oldValue)
                {
                    if(newValue != oldValue)
                    {
                        if(angular.isDefined($scope.product.supplier_ref))
                        {
                            $scope.supplier = Supplier.get(
                                {
                                    id: $scope.product.supplier_ref
                                },
                                function (resp)
                                {
                                    $scope.product.supplier_ref = resp._id;
                                }
                            );
                        }
                    }
                });
            }
        ]
    };
});

// Il faut donner un nom à l'élément pour que cette directive fonctionne correctement
adminCatagenDirectives.directive("nsDatepicker", function ()
{
    return {
        restrict: "E",
        templateUrl: "views/templates/nsDatepicker.html",
        require: "ngModel",
        scope: {
            ngDisabled: "=?",
            ngModel: "=",
            ngRequired: "=?"
        },
        link: function (scope, element, attrs, ngModel)
        {
            //On donne un id (censé être unique) à l'élément datepicker
            $("input", element).attr("id", "datepicker_" + attrs.name);
            ngModel.$render = function ()
            {
                if(ngModel.$modelValue)
                {
                    scope.myDate = moment(new Date(ngModel.$modelValue)).format("DD/MM/YY");
                }
            };
            scope.onDateChange = function (){
                if(scope.myDate && moment(scope.myDate, "DD/MM/YYYY").isValid() ){
                    if(scope.myDate !== ""){
                        var dateElement = $("#datepicker_" + attrs.name, element);
                        ngModel.$setViewValue(dateElement.datepicker("getDate"));
                        dateElement.datepicker("refresh");
                        $("#datepicker_" + attrs.name, element).removeClass(
                            "invalid"
                        );
                    }else{
                        dateElement.datepicker("refresh");
                    }
                }else{
                    if(scope.myDate === ""){
                        var dateElement = $("#datepicker_" + attrs.name, element);
                        ngModel.$setViewValue(dateElement.datepicker("getDate"));
                        dateElement.datepicker("refresh");
                        $("#datepicker_" + attrs.name, element).removeClass(
                            "invalid"
                        );
                    }else{
                        if(attrs.empty == 'true'){
                            var dateElement = $("#datepicker_" + attrs.name, element);
                            ngModel.$setViewValue("");
                            dateElement.datepicker("refresh");
                        }else{
                            $("#datepicker_" + attrs.name, element).addClass("invalid");
                        }
                    }
                }
            };
            if(attrs.required)
            {
                scope.ngRequired = true;
            }
            if(attrs.disabled)
            {
                scope.ngDisabled = true;
            }

            $("#datepicker_" + attrs.name, element).datepicker({
                changeMonth: true,
                changeYear: true,
                showWeek: true,
                firstDay: 1,
                showOtherMonths: true,
                selectOtherMonths: true,
                showButtonPanel: true,
                onSelect: function (dateText)
                {
                    scope.myDate = dateText
                    scope.$apply(function () {
                        ngModel.$setViewValue(
                            moment(dateText, "DD/MM/YYYY").toDate()
                        );
                    });
                }
            });
        }
    };
});

adminCatagenDirectives.directive("nsSwitch", [
    "$translate", function ($translate)
    {
        return {
            restrict: "E",
            templateUrl: "views/templates/nsSwitch.html",
            require: "ngModel",
            scope: {
                isActive: "=?",
                onChangeSwitch: "=?"
            },
            link: function (scope, element, attrs, ngModel)
            {
                scope.switchName = attrs.name;
                scope.disableSwitch = (attrs.disableSwitch === "true") || false;

                setTimeout(function(){
                    $translate("ns.switch.yes").then(function (yes) {
                        scope.yes_value = attrs.yesValue || yes;
                    });
                    $translate("ns.switch.no").then(function (no) {
                        scope.no_value = attrs.noValue || no;
                    });
                }, 10);

                ngModel.$render = function ()
                {
                    if(ngModel.$modelValue === true || ngModel.$modelValue === "true")
                    {
                        scope.switchValue = true;
                    }
                    else
                    {
                        scope.switchValue = false;
                    }
                };
                scope.onSwitchChange = function (newVal)
                {
                    if(typeof scope.onChangeSwitch === "function") {
                        scope.onChangeSwitch(newVal);
                    }
                    ngModel.$setViewValue(newVal);
                };
                if(scope.isActive !== undefined)
                {
                    scope.switchValue = scope.isActive;
                    scope.onSwitchChange(scope.isActive);
                }
            }
        }
    }
]);

adminCatagenDirectives.directive("nsTinymce", function ($timeout) {
    return {
        restrict: "E",
        scope: {
            text: "=",
            lang: "=",
            mail: "=",
            shortcode: "="
        },
        templateUrl: "views/templates/nsTinymce.html",
        controller: [
            "$scope","$rootScope", "$filter", "$modal","$http","toastService","$translate",
            function ($scope, $rootScope, $filter, $modal, $http, toastService, $translate) {
                    let toolbarOption = "customAddShortcode";
                    if($scope.mail){
                        toolbarOption = "customAddMailVar";
                    }
                    if($scope.shortcode === false){
                        toolbarOption = "";
                    }
                    $scope.tinymceOptions = {
                        withConfig :{ 'auto_focus':false },
                        extended_valid_elements: "*[*]",//allow empty <a>-tag
                        valid_children: "+a[a|area|article|aside|b|blockquote|body|br|button|canvas|caption|cite|code|col|datalist|dd|div|dl|dt|em|fieldset|figcaption|figure|footer|form|h1|h2|h3|h4|h5|h6|head|header|hr|html|i|img|input|label|legend|li|link|main|map|menu|meta|nav|ol|option|output|p|pre|progress|section|select|span|strong|style|summary|sup|table|tbody|td|textarea|tfoot|th|thead|title|tr|ul|video],+area[a|area|article|aside|b|blockquote|body|br|button|canvas|caption|cite|code|col|datalist|dd|div|dl|dt|em|fieldset|figcaption|figure|footer|form|h1|h2|h3|h4|h5|h6|head|header|hr|html|i|img|input|label|legend|li|link|main|map|menu|meta|nav|ol|option|output|p|pre|progress|section|select|span|strong|style|summary|sup|table|tbody|td|textarea|tfoot|th|thead|title|tr|ul|video],+article[a|area|article|aside|b|blockquote|body|br|button|canvas|caption|cite|code|col|datalist|dd|div|dl|dt|em|fieldset|figcaption|figure|footer|form|h1|h2|h3|h4|h5|h6|head|header|hr|html|i|img|input|label|legend|li|link|main|map|menu|meta|nav|ol|option|output|p|pre|progress|section|select|span|strong|style|summary|sup|table|tbody|td|textarea|tfoot|th|thead|title|tr|ul|video],+aside[a|area|article|aside|b|blockquote|body|br|button|canvas|caption|cite|code|col|datalist|dd|div|dl|dt|em|fieldset|figcaption|figure|footer|form|h1|h2|h3|h4|h5|h6|head|header|hr|html|i|img|input|label|legend|li|link|main|map|menu|meta|nav|ol|option|output|p|pre|progress|section|select|span|strong|style|summary|sup|table|tbody|td|textarea|tfoot|th|thead|title|tr|ul|video],+blockquote[a|area|article|aside|b|blockquote|body|br|button|canvas|caption|cite|code|col|datalist|dd|div|dl|dt|em|fieldset|figcaption|figure|footer|form|h1|h2|h3|h4|h5|h6|head|header|hr|html|i|img|input|label|legend|li|link|main|map|menu|meta|nav|ol|option|output|p|pre|progress|section|select|span|strong|style|summary|sup|table|tbody|td|textarea|tfoot|th|thead|title|tr|ul|video],+body[a|area|article|aside|b|blockquote|body|br|button|canvas|caption|cite|code|col|datalist|dd|div|dl|dt|em|fieldset|figcaption|figure|footer|form|h1|h2|h3|h4|h5|h6|head|header|hr|html|i|img|input|label|legend|li|link|main|map|menu|meta|nav|ol|option|output|p|pre|progress|section|select|span|strong|style|summary|sup|table|tbody|td|textarea|tfoot|th|thead|title|tr|ul|video],+button[a|area|article|aside|b|blockquote|body|br|button|canvas|caption|cite|code|col|datalist|dd|div|dl|dt|em|fieldset|figcaption|figure|footer|form|h1|h2|h3|h4|h5|h6|head|header|hr|html|i|img|input|label|legend|li|link|main|map|menu|meta|nav|ol|option|output|p|pre|progress|section|select|span|strong|style|summary|sup|table|tbody|td|textarea|tfoot|th|thead|title|tr|ul|video],+canvas[a|area|article|aside|b|blockquote|body|br|button|canvas|caption|cite|code|col|datalist|dd|div|dl|dt|em|fieldset|figcaption|figure|footer|form|h1|h2|h3|h4|h5|h6|head|header|hr|html|i|img|input|label|legend|li|link|main|map|menu|meta|nav|ol|option|output|p|pre|progress|section|select|span|strong|style|summary|sup|table|tbody|td|textarea|tfoot|th|thead|title|tr|ul|video],+caption[a|area|article|aside|b|blockquote|body|br|button|canvas|caption|cite|code|col|datalist|dd|div|dl|dt|em|fieldset|figcaption|figure|footer|form|h1|h2|h3|h4|h5|h6|head|header|hr|html|i|img|input|label|legend|li|link|main|map|menu|meta|nav|ol|option|output|p|pre|progress|section|select|span|strong|style|summary|sup|table|tbody|td|textarea|tfoot|th|thead|title|tr|ul|video],+cite[a|area|article|aside|b|blockquote|body|br|button|canvas|caption|cite|code|col|datalist|dd|div|dl|dt|em|fieldset|figcaption|figure|footer|form|h1|h2|h3|h4|h5|h6|head|header|hr|html|i|img|input|label|legend|li|link|main|map|menu|meta|nav|ol|option|output|p|pre|progress|section|select|span|strong|style|summary|sup|table|tbody|td|textarea|tfoot|th|thead|title|tr|ul|video],+col[a|area|article|aside|b|blockquote|body|br|button|canvas|caption|cite|code|col|datalist|dd|div|dl|dt|em|fieldset|figcaption|figure|footer|form|h1|h2|h3|h4|h5|h6|head|header|hr|html|i|img|input|label|legend|li|link|main|map|menu|meta|nav|ol|option|output|p|pre|progress|section|select|span|strong|style|summary|sup|table|tbody|td|textarea|tfoot|th|thead|title|tr|ul|video],+datalist[a|area|article|aside|b|blockquote|body|br|button|canvas|caption|cite|code|col|datalist|dd|div|dl|dt|em|fieldset|figcaption|figure|footer|form|h1|h2|h3|h4|h5|h6|head|header|hr|html|i|img|input|label|legend|li|link|main|map|menu|meta|nav|ol|option|output|p|pre|progress|section|select|span|strong|style|summary|sup|table|tbody|td|textarea|tfoot|th|thead|title|tr|ul|video],+dd[a|area|article|aside|b|blockquote|body|br|button|canvas|caption|cite|code|col|datalist|dd|div|dl|dt|em|fieldset|figcaption|figure|footer|form|h1|h2|h3|h4|h5|h6|head|header|hr|html|i|img|input|label|legend|li|link|main|map|menu|meta|nav|ol|option|output|p|pre|progress|section|select|span|strong|style|summary|sup|table|tbody|td|textarea|tfoot|th|thead|title|tr|ul|video],+div[a|area|article|aside|b|blockquote|body|br|button|canvas|caption|cite|code|col|datalist|dd|div|dl|dt|em|fieldset|figcaption|figure|footer|form|h1|h2|h3|h4|h5|h6|head|header|hr|html|i|img|input|label|legend|li|link|main|map|menu|meta|nav|ol|option|output|p|pre|progress|section|select|span|strong|style|summary|sup|table|tbody|td|textarea|tfoot|th|thead|title|tr|ul|video],+dl[a|area|article|aside|b|blockquote|body|br|button|canvas|caption|cite|code|col|datalist|dd|div|dl|dt|em|fieldset|figcaption|figure|footer|form|h1|h2|h3|h4|h5|h6|head|header|hr|html|i|img|input|label|legend|li|link|main|map|menu|meta|nav|ol|option|output|p|pre|progress|section|select|span|strong|style|summary|sup|table|tbody|td|textarea|tfoot|th|thead|title|tr|ul|video],+dt[a|area|article|aside|b|blockquote|body|br|button|canvas|caption|cite|code|col|datalist|dd|div|dl|dt|em|fieldset|figcaption|figure|footer|form|h1|h2|h3|h4|h5|h6|head|header|hr|html|i|img|input|label|legend|li|link|main|map|menu|meta|nav|ol|option|output|p|pre|progress|section|select|span|strong|style|summary|sup|table|tbody|td|textarea|tfoot|th|thead|title|tr|ul|video],+em[a|area|article|aside|b|blockquote|body|br|button|canvas|caption|cite|code|col|datalist|dd|div|dl|dt|em|fieldset|figcaption|figure|footer|form|h1|h2|h3|h4|h5|h6|head|header|hr|html|i|img|input|label|legend|li|link|main|map|menu|meta|nav|ol|option|output|p|pre|progress|section|select|span|strong|style|summary|sup|table|tbody|td|textarea|tfoot|th|thead|title|tr|ul|video],+fieldset[a|area|article|aside|b|blockquote|body|br|button|canvas|caption|cite|code|col|datalist|dd|div|dl|dt|em|fieldset|figcaption|figure|footer|form|h1|h2|h3|h4|h5|h6|head|header|hr|html|i|img|input|label|legend|li|link|main|map|menu|meta|nav|ol|option|output|p|pre|progress|section|select|span|strong|style|summary|sup|table|tbody|td|textarea|tfoot|th|thead|title|tr|ul|video],+figcaption[a|area|article|aside|b|blockquote|body|br|button|canvas|caption|cite|code|col|datalist|dd|div|dl|dt|em|fieldset|figcaption|figure|footer|form|h1|h2|h3|h4|h5|h6|head|header|hr|html|i|img|input|label|legend|li|link|main|map|menu|meta|nav|ol|option|output|p|pre|progress|section|select|span|strong|style|summary|sup|table|tbody|td|textarea|tfoot|th|thead|title|tr|ul|video],+figure[a|area|article|aside|b|blockquote|body|br|button|canvas|caption|cite|code|col|datalist|dd|div|dl|dt|em|fieldset|figcaption|figure|footer|form|h1|h2|h3|h4|h5|h6|head|header|hr|html|i|img|input|label|legend|li|link|main|map|menu|meta|nav|ol|option|output|p|pre|progress|section|select|span|strong|style|summary|sup|table|tbody|td|textarea|tfoot|th|thead|title|tr|ul|video],+footer[a|area|article|aside|b|blockquote|body|br|button|canvas|caption|cite|code|col|datalist|dd|div|dl|dt|em|fieldset|figcaption|figure|footer|form|h1|h2|h3|h4|h5|h6|head|header|hr|html|i|img|input|label|legend|li|link|main|map|menu|meta|nav|ol|option|output|p|pre|progress|section|select|span|strong|style|summary|sup|table|tbody|td|textarea|tfoot|th|thead|title|tr|ul|video],+form[a|area|article|aside|b|blockquote|body|br|button|canvas|caption|cite|code|col|datalist|dd|div|dl|dt|em|fieldset|figcaption|figure|footer|form|h1|h2|h3|h4|h5|h6|head|header|hr|html|i|img|input|label|legend|li|link|main|map|menu|meta|nav|ol|option|output|p|pre|progress|section|select|span|strong|style|summary|sup|table|tbody|td|textarea|tfoot|th|thead|title|tr|ul|video],+h1[a|area|article|aside|b|blockquote|body|br|button|canvas|caption|cite|code|col|datalist|dd|div|dl|dt|em|fieldset|figcaption|figure|footer|form|h1|h2|h3|h4|h5|h6|head|header|hr|html|i|img|input|label|legend|li|link|main|map|menu|meta|nav|ol|option|output|p|pre|progress|section|select|span|strong|style|summary|sup|table|tbody|td|textarea|tfoot|th|thead|title|tr|ul|video],+h2[a|area|article|aside|b|blockquote|body|br|button|canvas|caption|cite|code|col|datalist|dd|div|dl|dt|em|fieldset|figcaption|figure|footer|form|h1|h2|h3|h4|h5|h6|head|header|hr|html|i|img|input|label|legend|li|link|main|map|menu|meta|nav|ol|option|output|p|pre|progress|section|select|span|strong|style|summary|sup|table|tbody|td|textarea|tfoot|th|thead|title|tr|ul|video],+h3[a|area|article|aside|b|blockquote|body|br|button|canvas|caption|cite|code|col|datalist|dd|div|dl|dt|em|fieldset|figcaption|figure|footer|form|h1|h2|h3|h4|h5|h6|head|header|hr|html|i|img|input|label|legend|li|link|main|map|menu|meta|nav|ol|option|output|p|pre|progress|section|select|span|strong|style|summary|sup|table|tbody|td|textarea|tfoot|th|thead|title|tr|ul|video],+h4[a|area|article|aside|b|blockquote|body|br|button|canvas|caption|cite|code|col|datalist|dd|div|dl|dt|em|fieldset|figcaption|figure|footer|form|h1|h2|h3|h4|h5|h6|head|header|hr|html|i|img|input|label|legend|li|link|main|map|menu|meta|nav|ol|option|output|p|pre|progress|section|select|span|strong|style|summary|sup|table|tbody|td|textarea|tfoot|th|thead|title|tr|ul|video],+h5[a|area|article|aside|b|blockquote|body|br|button|canvas|caption|cite|code|col|datalist|dd|div|dl|dt|em|fieldset|figcaption|figure|footer|form|h1|h2|h3|h4|h5|h6|head|header|hr|html|i|img|input|label|legend|li|link|main|map|menu|meta|nav|ol|option|output|p|pre|progress|section|select|span|strong|style|summary|sup|table|tbody|td|textarea|tfoot|th|thead|title|tr|ul|video],+h6[a|area|article|aside|b|blockquote|body|br|button|canvas|caption|cite|code|col|datalist|dd|div|dl|dt|em|fieldset|figcaption|figure|footer|form|h1|h2|h3|h4|h5|h6|head|header|hr|html|i|img|input|label|legend|li|link|main|map|menu|meta|nav|ol|option|output|p|pre|progress|section|select|span|strong|style|summary|sup|table|tbody|td|textarea|tfoot|th|thead|title|tr|ul|video],+head[a|area|article|aside|b|blockquote|body|br|button|canvas|caption|cite|code|col|datalist|dd|div|dl|dt|em|fieldset|figcaption|figure|footer|form|h1|h2|h3|h4|h5|h6|head|header|hr|html|i|img|input|label|legend|li|link|main|map|menu|meta|nav|ol|option|output|p|pre|progress|section|select|span|strong|style|summary|sup|table|tbody|td|textarea|tfoot|th|thead|title|tr|ul|video],+header[a|area|article|aside|b|blockquote|body|br|button|canvas|caption|cite|code|col|datalist|dd|div|dl|dt|em|fieldset|figcaption|figure|footer|form|h1|h2|h3|h4|h5|h6|head|header|hr|html|i|img|input|label|legend|li|link|main|map|menu|meta|nav|ol|option|output|p|pre|progress|section|select|span|strong|style|summary|sup|table|tbody|td|textarea|tfoot|th|thead|title|tr|ul|video],+html[a|area|article|aside|b|blockquote|body|br|button|canvas|caption|cite|code|col|datalist|dd|div|dl|dt|em|fieldset|figcaption|figure|footer|form|h1|h2|h3|h4|h5|h6|head|header|hr|html|i|img|input|label|legend|li|link|main|map|menu|meta|nav|ol|option|output|p|pre|progress|section|select|span|strong|style|summary|sup|table|tbody|td|textarea|tfoot|th|thead|title|tr|ul|video],+label[a|area|article|aside|b|blockquote|body|br|button|canvas|caption|cite|code|col|datalist|dd|div|dl|dt|em|fieldset|figcaption|figure|footer|form|h1|h2|h3|h4|h5|h6|head|header|hr|html|i|img|input|label|legend|li|link|main|map|menu|meta|nav|ol|option|output|p|pre|progress|section|select|span|strong|style|summary|sup|table|tbody|td|textarea|tfoot|th|thead|title|tr|ul|video],+legend[a|area|article|aside|b|blockquote|body|br|button|canvas|caption|cite|code|col|datalist|dd|div|dl|dt|em|fieldset|figcaption|figure|footer|form|h1|h2|h3|h4|h5|h6|head|header|hr|html|i|img|input|label|legend|li|link|main|map|menu|meta|nav|ol|option|output|p|pre|progress|section|select|span|strong|style|summary|sup|table|tbody|td|textarea|tfoot|th|thead|title|tr|ul|video],+li[a|area|article|aside|b|blockquote|body|br|button|canvas|caption|cite|code|col|datalist|dd|div|dl|dt|em|fieldset|figcaption|figure|footer|form|h1|h2|h3|h4|h5|h6|head|header|hr|html|i|img|input|label|legend|li|link|main|map|menu|meta|nav|ol|option|output|p|pre|progress|section|select|span|strong|style|summary|sup|table|tbody|td|textarea|tfoot|th|thead|title|tr|ul|video],+link[a|area|article|aside|b|blockquote|body|br|button|canvas|caption|cite|code|col|datalist|dd|div|dl|dt|em|fieldset|figcaption|figure|footer|form|h1|h2|h3|h4|h5|h6|head|header|hr|html|i|img|input|label|legend|li|link|main|map|menu|meta|nav|ol|option|output|p|pre|progress|section|select|span|strong|style|summary|sup|table|tbody|td|textarea|tfoot|th|thead|title|tr|ul|video],+main[a|area|article|aside|b|blockquote|body|br|button|canvas|caption|cite|code|col|datalist|dd|div|dl|dt|em|fieldset|figcaption|figure|footer|form|h1|h2|h3|h4|h5|h6|head|header|hr|html|i|img|input|label|legend|li|link|main|map|menu|meta|nav|ol|option|output|p|pre|progress|section|select|span|strong|style|summary|sup|table|tbody|td|textarea|tfoot|th|thead|title|tr|ul|video],+map[a|area|article|aside|b|blockquote|body|br|button|canvas|caption|cite|code|col|datalist|dd|div|dl|dt|em|fieldset|figcaption|figure|footer|form|h1|h2|h3|h4|h5|h6|head|header|hr|html|i|img|input|label|legend|li|link|main|map|menu|meta|nav|ol|option|output|p|pre|progress|section|select|span|strong|style|summary|sup|table|tbody|td|textarea|tfoot|th|thead|title|tr|ul|video],+menu[a|area|article|aside|b|blockquote|body|br|button|canvas|caption|cite|code|col|datalist|dd|div|dl|dt|em|fieldset|figcaption|figure|footer|form|h1|h2|h3|h4|h5|h6|head|header|hr|html|i|img|input|label|legend|li|link|main|map|menu|meta|nav|ol|option|output|p|pre|progress|section|select|span|strong|style|summary|sup|table|tbody|td|textarea|tfoot|th|thead|title|tr|ul|video],+nav[a|area|article|aside|b|blockquote|body|br|button|canvas|caption|cite|code|col|datalist|dd|div|dl|dt|em|fieldset|figcaption|figure|footer|form|h1|h2|h3|h4|h5|h6|head|header|hr|html|i|img|input|label|legend|li|link|main|map|menu|meta|nav|ol|option|output|p|pre|progress|section|select|span|strong|style|summary|sup|table|tbody|td|textarea|tfoot|th|thead|title|tr|ul|video],+ol[a|area|article|aside|b|blockquote|body|br|button|canvas|caption|cite|code|col|datalist|dd|div|dl|dt|em|fieldset|figcaption|figure|footer|form|h1|h2|h3|h4|h5|h6|head|header|hr|html|i|img|input|label|legend|li|link|main|map|menu|meta|nav|ol|option|output|p|pre|progress|section|select|span|strong|style|summary|sup|table|tbody|td|textarea|tfoot|th|thead|title|tr|ul|video],+option[a|area|article|aside|b|blockquote|body|br|button|canvas|caption|cite|code|col|datalist|dd|div|dl|dt|em|fieldset|figcaption|figure|footer|form|h1|h2|h3|h4|h5|h6|head|header|hr|html|i|img|input|label|legend|li|link|main|map|menu|meta|nav|ol|option|output|p|pre|progress|section|select|span|strong|style|summary|sup|table|tbody|td|textarea|tfoot|th|thead|title|tr|ul|video],+output[a|area|article|aside|b|blockquote|body|br|button|canvas|caption|cite|code|col|datalist|dd|div|dl|dt|em|fieldset|figcaption|figure|footer|form|h1|h2|h3|h4|h5|h6|head|header|hr|html|i|img|input|label|legend|li|link|main|map|menu|meta|nav|ol|option|output|p|pre|progress|section|select|span|strong|style|summary|sup|table|tbody|td|textarea|tfoot|th|thead|title|tr|ul|video],+p[a|area|article|aside|b|blockquote|body|br|button|canvas|caption|cite|code|col|datalist|dd|div|dl|dt|em|fieldset|figcaption|figure|footer|form|h1|h2|h3|h4|h5|h6|head|header|hr|html|i|img|input|label|legend|li|link|main|map|menu|meta|nav|ol|option|output|p|pre|progress|section|select|span|strong|style|summary|sup|table|tbody|td|textarea|tfoot|th|thead|title|tr|ul|video],+pre[a|area|article|aside|b|blockquote|body|br|button|canvas|caption|cite|code|col|datalist|dd|div|dl|dt|em|fieldset|figcaption|figure|footer|form|h1|h2|h3|h4|h5|h6|head|header|hr|html|i|img|input|label|legend|li|link|main|map|menu|meta|nav|ol|option|output|p|pre|progress|section|select|span|strong|style|summary|sup|table|tbody|td|textarea|tfoot|th|thead|title|tr|ul|video],+section[a|area|article|aside|b|blockquote|body|br|button|canvas|caption|cite|code|col|datalist|dd|div|dl|dt|em|fieldset|figcaption|figure|footer|form|h1|h2|h3|h4|h5|h6|head|header|hr|html|i|img|input|label|legend|li|link|main|map|menu|meta|nav|ol|option|output|p|pre|progress|section|select|span|strong|style|summary|sup|table|tbody|td|textarea|tfoot|th|thead|title|tr|ul|video],+span[a|area|article|aside|b|blockquote|body|br|button|canvas|caption|cite|code|col|datalist|dd|div|dl|dt|em|fieldset|figcaption|figure|footer|form|h1|h2|h3|h4|h5|h6|head|header|hr|html|i|img|input|label|legend|li|link|main|map|menu|meta|nav|ol|option|output|p|pre|progress|section|select|span|strong|style|summary|sup|table|tbody|td|textarea|tfoot|th|thead|title|tr|ul|video],+strong[a|area|article|aside|b|blockquote|body|br|button|canvas|caption|cite|code|col|datalist|dd|div|dl|dt|em|fieldset|figcaption|figure|footer|form|h1|h2|h3|h4|h5|h6|head|header|hr|html|i|img|input|label|legend|li|link|main|map|menu|meta|nav|ol|option|output|p|pre|progress|section|select|span|strong|style|summary|sup|table|tbody|td|textarea|tfoot|th|thead|title|tr|ul|video],+summary[a|area|article|aside|b|blockquote|body|br|button|canvas|caption|cite|code|col|datalist|dd|div|dl|dt|em|fieldset|figcaption|figure|footer|form|h1|h2|h3|h4|h5|h6|head|header|hr|html|i|img|input|label|legend|li|link|main|map|menu|meta|nav|ol|option|output|p|pre|progress|section|select|span|strong|style|summary|sup|table|tbody|td|textarea|tfoot|th|thead|title|tr|ul|video],+sup[a|area|article|aside|b|blockquote|body|br|button|canvas|caption|cite|code|col|datalist|dd|div|dl|dt|em|fieldset|figcaption|figure|footer|form|h1|h2|h3|h4|h5|h6|head|header|hr|html|i|img|input|label|legend|li|link|main|map|menu|meta|nav|ol|option|output|p|pre|progress|section|select|span|strong|style|summary|sup|table|tbody|td|textarea|tfoot|th|thead|title|tr|ul|video],+title[a|area|article|aside|b|blockquote|body|br|button|canvas|caption|cite|code|col|datalist|dd|div|dl|dt|em|fieldset|figcaption|figure|footer|form|h1|h2|h3|h4|h5|h6|head|header|hr|html|i|img|input|label|legend|li|link|main|map|menu|meta|nav|ol|option|output|p|pre|progress|section|select|span|strong|style|summary|sup|table|tbody|td|textarea|tfoot|th|thead|title|tr|ul|video],+ul[a|area|article|aside|b|blockquote|body|br|button|canvas|caption|cite|code|col|datalist|dd|div|dl|dt|em|fieldset|figcaption|figure|footer|form|h1|h2|h3|h4|h5|h6|head|header|hr|html|i|img|input|label|legend|li|link|main|map|menu|meta|nav|ol|option|output|p|pre|progress|section|select|span|strong|style|summary|sup|table|tbody|td|textarea|tfoot|th|thead|title|tr|ul|video]",
                        entity_encoding: "raw",
                        branding: false,
                        height: "500",
                        convert_urls: false,
                        forced_root_block: false,
                        relative_urls: false,
                        selector: '#editor',
                        plugins: 'code, fullscreen, preview, link, autosave, codeeditor, autoresize',
                        valid_elements: "*[*]",
                        content_style : $rootScope.content_style,
                        toolbar: 'undo redo | bold italic underline forecolor fontsizeselect removeformat | alignleft aligncenter alignright | link customLink | ' + toolbarOption +' | customAddImg | fullscreen preview | codeeditor',
                        fontsize_formats: '8px 10px 12px 14px 16px, 20px',
                        codeeditor_font_size: 14,
                        menubar: false,
                        statusbar: false,
                        setup: function (editor) {
                            $scope.tinymceId = editor.id;
                            editor.ui.registry.addButton('customAddImg', {
                                icon: "gallery",
                                tooltip: 'Gallery',
                                onAction: function () {
                                    $scope.addImage();
                                }
                            });
                            editor.ui.registry.addButton('customLink', {
                                icon: "unlink",
                                tooltip: 'Add Page or Category link',
                                onAction: function () {
                                    $scope.addLink(tinymce.activeEditor.selection.getContent(), $scope.lang);
                                }
                            });
                            editor.ui.registry.addButton('customAddShortcode', {
                                icon: "code-sample",
                                tooltip: 'Add Shortcode',
                                onAction: function () {
                                    $scope.addShortcode();
                                }
                            });
                            editor.ui.registry.addButton('customAddMailVar', {
                                icon: "template",
                                tooltip: 'Add mail variables',
                                onAction: function () {
                                    $scope.addMailVar($scope.mail);
                                }
                            });
                        }
                    };

                $scope.addMailVar = function (code) {
                    if (code === 'none') {
                        toastService.toast('danger', $translate.instant("global.emailType"));
                    }else{
                        const modalInstance = $modal.open({
                            backdrop: 'static',
                            templateUrl: 'views/modals/add-mailvar-tinymce.html',
                            controller: ['$scope', '$modalInstance', '$rootScope', 'MailTypeGet','toastService',
                                function ($scope, $modalInstance, $rootScope, MailTypeGet, toastService) {
                                    $scope.mailType = [];
                                    MailTypeGet.query({ code }, function (mailType) {
                                        $scope.mailType = mailType;
                                    });
                                    $scope.lang = $rootScope.adminLang;
                                    $scope.selected = false;
                                    $scope.mailTypeSelected = {};
    
                                    $scope.selectVariable = function (variable) {
                                        $scope.selected = true;
                                        $scope.variableSelected = variable;
                                    }
    
                                    $scope.addMailVariable = function(variable){
                                        $modalInstance.close(variable);
                                    }
    
                                    $scope.cancel = function () {
                                        $modalInstance.dismiss('cancel');
                                    };
                                }],
                            resolve: {
                            }
                        });
    
                        modalInstance.result.then(function (variable) {
                            variable = '{{' + variable + '}}';
                            if ($scope.tinymceId) {
                                tinyMCE.get($scope.tinymceId).selection.setContent(variable);
                                $scope.text = tinyMCE.get($scope.tinymceId).getContent();
                            } else {
                                tinyMCE.activeEditor.selection.setContent(variable);
                            }
                        });
                    }
                };

                $scope.addShortcode = function () {
                    const modalInstance = $modal.open({
                        backdrop: 'static',
                        closeByEscape: true,
                        templateUrl: 'views/modals/add-shortcode-tinymce.html',
                        controller: ['$scope', '$modalInstance', '$http', '$rootScope',
                            function ($scope, $modalInstance, $http, $rootScope) {
                                $scope.shortcodes = [];
                                $scope.lang = $rootScope.adminLang;
                                $scope.selected = false;
                                $scope.shortcodeSelected = {};
                                $scope.tag = {};
                                $scope.search = '';

                                $scope.selectShortcode = function(shortCode){
                                    $scope.selected = true;
                                    $scope.shortcodeSelected = shortCode;
                                }

                                $scope.back = function(){
                                    $scope.selected = false;
                                    $scope.shortcodeSelected = {};
                                    $scope.tag = {};
                                }

                                $scope.getString = function (shortcode, tag){
                                    let string = "<" + shortcode.tag;
                                    Object.keys(tag).forEach(key => {
                                        if (tag[key]) {
                                            string += " " + key + "='" + tag[key] + "'"
                                        }
                                    });
                                    string += "></" + shortcode.tag + ">";
                                    return string;
                                }

                                $scope.addTag = function(shortcode,tag){
                                    let string = "<" + shortcode.tag;
                                    Object.keys(tag).forEach(key => {
                                        if(tag[key]){
                                            string += " " + key + "='" + tag[key].replace(/[',",<,>]/g, "") + "'"
                                        }
                                    });
                                    string += "></" + shortcode.tag + ">";
                                    $modalInstance.close({ string });
                                }

                                $scope.sortShortCodes = function(string){
                                    for (const i in $scope.shortcodes) {
                                        if (string === '' || ($scope.shortcodes[i].translation && $scope.shortcodes[i].translation[$scope.lang].name.toLowerCase().includes(string.toLowerCase())) || ($scope.shortcodes[i].translation && $scope.shortcodes[i].tag.toLowerCase().includes(string.toLowerCase())) ) {                                            $scope.shortcodes[i].sort = true;
                                        }else{
                                            $scope.shortcodes[i].sort = false;
                                        }
                                    }
                                    
                                }

                                $http({ url: `/v2/shortcodes`, method: 'GET' }).then((response) => {
                                    $scope.shortcodes = response.data;
                                    $scope.sortShortCodes($scope.search);
                                }, function errorCallback(response) {
                                    console.log(response);
                                });

                                $scope.cancel = function () {
                                    $modalInstance.dismiss('cancel');
                                };

                            }],
                        resolve: {
                        }
                    });

                    modalInstance.result.then(function (response) {
                        if ($scope.tinymceId) {
                            tinyMCE.get($scope.tinymceId).selection.setContent(response.string);
                            $scope.text = tinyMCE.get($scope.tinymceId).getContent();
                        } else {
                            tinyMCE.activeEditor.selection.setContent(response.string);
                        }
                    });
                };

                $scope.addImage = function () {
                    const modalInstance = $modal.open({
                        backdrop: 'static',
                        templateUrl: 'views/modals/add-image-tinymce.html',
                        controller: ['$scope', '$location', '$modalInstance', "MediaApiV2","toastService",
                            function ($scope, $location, $modalInstance, MediaApiV2, toastService) {
                            $scope.link = "-";
                            $scope.nbItemsPerPage = 20;
                            $scope.maxSize = 5;
                            $scope.totalMedias = 0;
                            $scope.groups = [];
                            $scope.local = {
                                insertDBMediaUpload: true,
                                search: ""
                            };
                            $scope.media = {};

                                $scope.generateFilter = function () {
                                    const filter = {};
                                    if ($scope.currentTab === 'general') {
                                        filter.$or = [{ group: null }, { group: "" }, { group: "general" }]
                                    } else {
                                        filter.group = $scope.currentTab
                                    }
                                    if ($scope.local.search !== "") {
                                        filter.name = { $regex: $scope.local.search, $options: 'gim' }
                                        delete filter.$or;
                                        delete filter.group;
                                    } else {
                                        delete filter.name
                                    }
                                    return filter;
                                }

                                $scope.init = function () {
                                    MediaApiV2.getGroupsImg({}, function (groups) {
                                        $scope.groups = groups;
                                        $scope.currentTab = $scope.groups[0];

                                        MediaApiV2.list({ PostBody: { filter: $scope.generateFilter(), structure: '*', limit: $scope.nbItemsPerPage, page: 1 } }, function ({ datas, count }) {
                                            $scope.list = datas;
                                            $scope.totalMedias = count;
                                        });
                                    });
                                };

                                $scope.init();

                                $scope.onPageChange = function (page) {
                                    $scope.page = page;
                                    MediaApiV2.list({ PostBody: { filter: $scope.generateFilter(), structure: '*', limit: $scope.nbItemsPerPage, page } }, function ({ datas, count }) {
                                        $scope.list = datas;
                                        $scope.totalMedias = count;
                                    });
                                }

                                $scope.changeTab = function (group) {
                                    $scope.currentTab = group;
                                    $scope.onPageChange(1);
                                    $scope.imageSelected = null;
                                    $scope.imageId = null;
                                }

                                $scope.mediaDetails = (media) => {
                                    $location.path('/medias/' + media._id)
                                }
                                $scope.isPicture = function (media) {
                                    if (media.link.match(new RegExp("jpg|jpeg|png|gif|svg", 'i'))) {
                                        return true
                                    }
                                    return false
                                }

                            $scope.selectImage = function (image) {
                                $scope.imageId = image._id;
                                $scope.imageSelected = image.link;
                                $scope.media = image
                            };

                            $scope.cancel = function () {
                                $modalInstance.dismiss('cancel');
                            };
                            
                            $scope.generate = function (url) {
                                $modalInstance.close(url);
                            };


                        }],
                        resolve: {
                        }
                    });
                    modalInstance.result.then(function (url) {
                        let tag = '<img src="' + url + '"/>'
                        const stringSizeQual = url.split('/')[url.split('/').length - 3]
                        if(stringSizeQual) {
                            const size = stringSizeQual.split('-')[0]
                            if(size && size.toLowerCase() !== 'max') {
                                tag = '<img src="' + url + '" width="' + size.split("x")[0] + '" height="' + size.split("x")[1] + '"/>'
                            }
                        }
                        if ($scope.tinymceId) {
                            tinyMCE.get($scope.tinymceId).selection.setContent(tag);
                                $scope.text = tinyMCE.get($scope.tinymceId).getContent();
                        } else {
                            tinyMCE.activeEditor.selection.setContent(tag);
                        }
                    });
                };

                $scope.addLink = function (textSelected, lang) {
                    const modalInstance = $modal.open({
                        backdrop: 'static',
                        templateUrl: 'views/modals/add-link-tinymce.html',
                        controller: ['$scope', '$modalInstance', 'StaticV2','CategoryV2','textSelected',
                            function ($scope, $modalInstance, StaticV2, CategoryV2, textSelected) {
                                $scope.lang = lang;
                                $scope.selected = {};

                                StaticV2.list({ PostBody: { filter: {}, structure: '*', limit: 0 } }, function (staticsList) {
                                    $scope.pages = {};
                                    $scope.pages = staticsList.datas;
                                    if ($scope.pages[0]) {
                                        $scope.selected.pageSelelected = $scope.pages[0].translation[lang].slug;
                                    }
                                    if (!$scope.group) {
                                        $scope.group = staticsList.datas.getAndSortGroups()[0];
                                    }
                                });
                                CategoryV2.list({ PostBody: { populate: ["children"], structure: '*', limit: 0 } }, function (response) {
                                    $scope.categories = {};
                                    $scope.categories = response.datas;
                                    if ($scope.categories[0]) {
                                        $scope.selected.categorySelelected = $scope.categories[0].translation[$scope.lang].slug;
                                    }
                                });

                                $scope.types = [
                                    {id:'page', name:'Page'},
                                    {id:'cat', name:'Catégorie'}
                                ];
                                $scope.name = textSelected;
                                $scope.typeSelected = 'page';

                                $scope.getOptGroup = function (group) {
                                    if (!group) {
                                        group = $scope.group;
                                    }
                                    return group;
                                }

                                $scope.exist = function (item) {
                                    if (item.translation && item.translation[$scope.lang] && item.translation[$scope.lang].title && item.translation[$scope.lang].slug) {
                                        return true;
                                    }
                                    return false;
                                }

                                $scope.ok = function (slug, name, cat) {
                                    if(!name){
                                        name = slug;
                                    }
                                    if(cat){
                                        $scope.categories.forEach(element => {
                                            if (element.translation[lang].slug === slug && element.action === "catalog") {
                                                slug = 'c/' + slug;
                                            }
                                        });
                                    }
                                    $modalInstance.close({slug,name});
                                };

                                $scope.cancel = function () {
                                    $modalInstance.dismiss('cancel');
                                };

                            }],
                        resolve: {
                            textSelected: function () {
                                return textSelected;
                            }
                        }
                    });

                    modalInstance.result.then(function (response) {
                        if ($scope.tinymceId) {
                            tinyMCE.get($scope.tinymceId).selection.setContent('<a href="' + response.slug + '">' + response.name + '</a>');
                            $scope.text = tinyMCE.get($scope.tinymceId).getContent();
                        } else {
                            tinyMCE.activeEditor.selection.setContent('<a href="' + response.slug + '">' + response.name + '</a>');
                        }
                    });
                };
            }
        ]
    };
});
adminCatagenDirectives.directive("nsFileDrop", function ()
{
    return {
        restrict: "AE",
        replace: true,
        templateUrl: "views/templates/nsFileDrop.html"
    };
});

adminCatagenDirectives.directive("nsReturnButton", function ()
{
    return {
        restrict: "E",
        scope: {
            returnPath: "@",
            form: "=",
            isSelected: "="
        },
        templateUrl: "views/templates/nsReturnButton.html",
        controller: [
            "$scope",
            "$location",
            "$translate",
            function ($scope, $location, $translate)
            {
                $scope.return = function ()
                {
                    if($scope.isSelected === true){
                        let response = confirm($translate.instant("confirm.fileAttachedNotSaved"));
                        if (!response) { return }
                    }
                    if($scope.form.$dirty)
                    {
                        if(
                            confirm($translate.instant("confirm.changesNotSaved"))
                        )
                        {
                            $location.path($scope.returnPath);
                        }
                    }
                    else
                    {
                        $location.path($scope.returnPath);
                    }
                };

                $scope.$watch("form.$submitted", function (newValue)
                {

                    if(newValue)
                    {
                        $scope.form.$setPristine();
                    }
                });
            }
        ]
    };
});

adminCatagenDirectives.directive("nsButtons", function ()
{
    return {
        restrict: "E",
        transclude: true,
        scope: {
            returnPath: "@?",
            hideReturn: "=",
            form: "=?",
            remove: "&remove",
            saveAndQuit: "&saveAndQuit",
            hideSaveAndQuit: "=",
            hideSave: "=",
            disableSave: "=?",
            isEditMode: "=",
            hideRemove: "=", //Si on est en Edit Mode mais qu'on ne veut pas la suppresion pour autant (par exemple sur un ou plusieurs éléments)
            onLoad: "&?",
            isSelected: "=",
            additionnalButtons: "=?",
            moreButtons: "=?"
        },
        templateUrl: "views/templates/nsButtons.html",
        link: function (scope)
        {
            scope.statechangeMoreButtons = false;
            scope.changeMoreButtons = function(){
                scope.statechangeMoreButtons  = !scope.statechangeMoreButtons;
            }
            if(scope.onLoad)
            {
                scope.onLoad();
            }
            scope.checkMoreButtons = function(){
                if(scope.isEditMode && scope.moreButtons){
                    for(let a of scope.moreButtons){
                        if(a.isDisplayed != null){
                            if(a.isDisplayed == false){
                                return false;
                            }
                        }
                    }
                    return true;
                }
            }
        }
        
    };
});

adminCatagenDirectives.directive("nsCmsBlocks", function ()
{
    return {
        restrict: "E",
        scope: {
            product: "=",
            form: "="
        },
        templateUrl: "views/templates/nsCmsBlocks.html"
    };
});

adminCatagenDirectives.directive("nsBox", function ()
{
    return {
        restrict: "E",
        transclude: true,
        scope: {
            translateValues: "=",
            title: "@",
            stick: "@",
            titleIcon: "@?",
            closeHref: "@?",
            closeClick: "&?",
            addHref: "@?",
            addClick: "&?",
            editHref: "@?",
            editClick: "&?",
            newHref: "@?",
            newClick: "&?",
            massClick: "&?"
        },
        templateUrl: "views/templates/nsBox.html",
        link: function (scope, element, attrs)
        {
            $("ns-box")
                .parent()
                .parent()
                .addClass("boxShrink");
            scope.hasAdd = attrs.addHref || attrs.addClick;
            scope.hasClose = attrs.closeHref || attrs.closeClick;
            scope.hasNew = attrs.newHref || attrs.newClick;
            scope.hasMassClick = attrs.massClick;
            scope.hasEdit = attrs.editHref || attrs.editClick;

            let type;
            let translation;
            let translationValues;

            scope.hideAdvice = function(type){
                let filter = window.localStorage.getItem("help");
                if(!filter){
                    filter = [type];
                }else{
                    filter = filter.split(',');
                    filter.push(type);
                }
                window.localStorage.setItem("help", filter);
                scope.help = false;
            }

            showAdvice = function(type, translation, translationValues){
                if (window.localStorage.getItem("help") && window.localStorage.getItem("help").split(",").includes(type)) {
                    scope.help = false;
                } else {
                    scope.help = true;
                    scope.type = type;
                    scope.translation = translation;
                    scope.translationValues = translationValues;
                }
            }

            switch (window.location.hash) {
                case "#/staticPage":
                    type = "staticPage";
                    translation = "ns.help.staticPage";
                    translationValues = "{url:'https://www.aquila-cms.com/medias/tutorial_aquila_fr_pages.pdf'}";
                    showAdvice(type, translation, translationValues);
                    break;
                case "#/themes":
                    type = "themes";
                    translation = "ns.help.themes";
                    translationValues = "{url:'https://www.aquila-cms.com/medias/tutorial_aquila_fr_themes.pdf'}";
                    showAdvice(type, translation, translationValues);
                    break;
                case "#/products":
                    type = "products";
                    translation = "ns.help.products";
                    translationValues = "{url:'https://www.aquila-cms.com/medias/tutorial_aquila_fr_produits.pdf'}";
                    showAdvice(type, translation, translationValues);
                    break;
                case "#/shipments":
                    type = "shipments";
                    translation = "ns.help.shipments";
                    translationValues = "{url:'https://www.aquila-cms.com/medias/tutorial_aquila_fr_transporteurs.pdf'}";
                    showAdvice(type, translation, translationValues);
                    break;
                case "#/cmsBlocks":
                    type = "cmsBlocks";
                    translation = "ns.help.cmsBlocks";
                    translationValues = "{url:'https://www.aquila-cms.com/medias/tutorial_aquila_fr_block_cms.pdf'}";
                    showAdvice(type, translation, translationValues);
                    break;
                case "#/site/articles":
                    type = "articles";
                    translation = "ns.help.articles";
                    translationValues = "{url:'https://www.aquila-cms.com/medias/tutorial_aquila_fr_blog.pdf'}";
                    showAdvice(type, translation, translationValues);
                    break;
                case "#/contacts":
                    type = "contacts";
                    translation = "ns.help.contacts";
                    translationValues = "{url:'https://www.aquila-cms.com/medias/tutorial_aquila_fr_contact.pdf'}";
                    showAdvice(type, translation, translationValues);
                    break;
                case "#/component/gallery":
                    type = "gallery";
                    translation = "ns.help.gallery";
                    translationValues = "{url:'https://www.aquila-cms.com/medias/tutorial_aquila_fr_galerie.pdf'}";
                    showAdvice(type, translation, translationValues);
                    break;
                case "#/medias":
                    type = "medias";
                    translation = "ns.help.medias";
                    translationValues = "{url:'https://www.aquila-cms.com/medias/tutorial_aquila_fr_medias.pdf'}";
                    showAdvice(type, translation, translationValues);
                    break;
                case "#/trademarks":
                    type = "trademarks";
                    translation = "ns.help.trademarks";
                    showAdvice(type, translation, translationValues);
                    break;
                case "#/suppliers":
                    type = "suppliers";
                    translation = "ns.help.suppliers";
                    showAdvice(type, translation, translationValues);
                    break;
                case "#/families":
                    type = "families";
                    translation = "ns.help.families";
                    showAdvice(type, translation, translationValues);
                    break;
                default:
                    break;
            }
        }
    };
});
adminCatagenDirectives.directive("numericbinding", function ()
{
    return {
        restrict: "A",
        require: "ngModel",
        scope: {
            model: "=ngModel"
        },
        link: function (scope, element, attrs, ngModelCtrl)
        {
            if(scope.model && typeof scope.model == "string")
            {
                scope.model = parseInt(scope.model);
            }
        }
    };
});
adminCatagenDirectives.directive("restrictInput", function ()
{
    return {
        restrict: 'A',
        require: 'ngModel',
        link: function(scope, element, attr, ctrl) {
          ctrl.$parsers.unshift(function(viewValue) {
            var options = scope.$eval(attr.restrictInput);
            var reg = new RegExp(options.regex);
            if (reg.test(viewValue)) { //if valid view value, return it
              return viewValue;
            } else { //if not valid view value, use the model value (or empty string if that's also invalid)
              var overrideValue = (reg.test(ctrl.$modelValue) ? ctrl.$modelValue : '');
              element.val(overrideValue);
              return overrideValue;
            }
          });
        }
      };
});
adminCatagenDirectives.directive("nsAttributes", function ($compile)
{
    return {
        template: "<label for='{{ att.translation[lang].name }}' class='col-sm-2 control-label'>{{ att.translation[lang].name }}</label>",
        restrict: "E",
        link: function (scope, element, attrs)
        {
            var el;
            scope.selectColor = function (colorString) {
                scope.att.translation[scope.lang].value = colorString
            }

            /* scope.$watch('att.type', function(newValue, oldValue, elScope) { */
                el = angular.element("<span/>");
                scope.optionColor = {
                    format: "hexString",
                    required: false,
                    allowEmpty: true
                }
                switch(scope.att.type)
                {
                    case "date":
                        el.append("<div class='col-sm-10'><ns-datepicker name='value' ng-model='att.translation[lang].value'></ns-datepicker></div>");
                        break;
                    case "textfield":
                        el.append("<div class='col-sm-10'><input class='form-control' type='text' ng-model='att.translation[lang].value'/></div>");
                        break;
                    case "number":
                        if(scope.att.param == "Non") {
                            el.append("<div class='col-sm-10'><input class='form-control' numericbinding type='number' ng-model='att.translation[lang].value'/></div>");
                        } else if (scope.att.param == "Oui") {
                            el.append("<div class='col-sm-10'><input class='form-control' numericbinding type='number' ng-model='att.translation[lang].value'/><span>La valeur entrée dans ce champ sera la valeur par défaut lors de la séléction par l'utilisateur</span></div>");
                        }
                        break;
                    case "textarea":
                        el.append("<div class='col-sm-10'><div class='tinyeditor-small'><ns-tinymce lang='lang' text='att.translation[lang].value'></ns-tinymce></div></div>");
                        break;
                    case "bool":
                        el.append("<div class='col-sm-10'><label><ns-switch name='{{att.code}}' ng-model='att.translation[lang].value'></ns-switch></div>");
                        break;
                    case "list":
                        el.append("<div class='col-sm-10'>" +
                            "    <select class='form-control' ng-model='att.translation[lang].value'>" +
                            "        <option value='' disabled>Choix dans la liste déroulante</option>" +
                            "        <option ng-repeat='value in att.translation[lang].values' value='{{value}}'>{{value}}</option>" +
                            "    </select>" +
                            "</div>");
                        break;
                    case "multiselect":
                        el.append("<div class='col-sm-10'>" +
                            "    <select class='form-control' ng-model='att.translation[lang].value' size='10' multiple>" +
                            "        <option value='' disabled>Choix dans la liste</option>" +
                            "        <option ng-repeat='value in att.translation[lang].values' value='{{value}}'>{{value}}</option>" +
                            "    </select>" +
                            "</div>");
                        break;
                    case "interval":
                        el.append("<div class='col-sm-10'>" +
                            "    <span class='col-sm-offset-1 col-sm-2'>Minimum</span>" +
                            "    <div class='col-sm-1'>" +
                            "        <input name='min' class='form-control' numericbinding type='number' max='{{att.translation[lang].max}}' ng-model='att.translation[lang].min' />" +
                            "    </div>" +
                            "    <span class='col-sm-offset-1 col-sm-2'>Maximum</span>" +
                            "    <div class='col-sm-1'>" +
                            "        <input name='max' class='form-control' numericbinding type='number' min='{{att.translation[lang].min}}' ng-model='att.translation[lang].max' />" +
                            "    </div>" +
                            "</div>");
                        break;
                    case "doc/pdf":
                        el.append(
                            "<div class='col-sm-2' style='margin-top: 3px;'><input readonly type='text' class='form-control' ng-model='att.translation[lang].value'></div><div class='col-sm-2'><a target='_blank' href='{{ att.translation[lang].value }}' class='btn btn-info' ng-show='att.translation[lang].value != null'>Afficher le PDF</a></div>" +
                            "<div class=\"col-sm-5\"><ns-upload-files lang=\"lang\" style-prop=\"{height: '35px', margin: '0px 0px 12px 0px'}\" accepttype=\"application/pdf\" multiple=\"false\" code=\"att.id\" type=\"attribute\" id=\"product._id\" entity=\"att.translation[lang]\"></ns-upload-files></div>" +
                            "<div class=\"col-sm-1\"><button type=\"button\" class=\"btn btn-danger\" ng-click=\"removeImage(att.translation[lang].value); att.translation[lang].value = null\" style=\"min-width: 10px; float: right;\"><i class=\"fa fa-trash\"/></div>");
                        break;
                    case "image":
                        el.append(
                            '<div class="col-sm-2" style="margin-top: 3px;"><input readonly type="text" class="form-control" ng-model="att.translation[lang].value"></div><div class="col-sm-2"><a title="Image" data-trigger="hover" data-placement="bottom" data-html="true" data-toggle="popover" data-content="<img src=\'{{ att.translation[lang].value }}\' width=\'250\' height=\'200\'>" class="btn btn-info" ng-show="att.translation[lang].value != null">Afficher l\'image</a></div>' +
                            '<div class="col-sm-5"><ns-upload-files lang="lang" style-prop="{height: \'35px\', margin: \'0px 0px 12px 0px\'}" accepttype="image/*" multiple="false" code="att.id" type="attribute" id="product._id" entity="att.translation[lang]"></ns-upload-files></div>' +
                            '<div class="col-sm-1"><button type="button" class="btn btn-danger" ng-click="removeImage(att.translation[lang].value); att.translation[lang].value = null" style="min-width: 10px; float: right;"><i class="fa fa-trash"/></div>'
                        );
                        break;
                    case "video":
                        el.append(
                            '<div class="col-sm-2" style="margin-top: 3px;"><input readonly type="text" class="form-control" ng-model="att.translation[lang].value"></div><div class="col-sm-2 popVideo"><a title="Vidéo" data-placement="bottom" data-html="true" data-toggle="popover" data-content="<video width=\'800\' controls><source src=\'{{ att.translation[lang].value }}\'>Votre navigateur ne supporte pas les vidéos HTML5.</video>" class="btn btn-info" ng-show="att.translation[lang].value != null">Afficher la vidéo</a></div>' +
                            '<div class="col-sm-5"><ns-upload-files lang="lang" style-prop="{height: \'35px\', margin: \'0px 0px 12px 0px\'}" accepttype="video/*" multiple="false" code="att.id" type="attribute" id="product._id" entity="att.translation[lang]"></ns-upload-files></div>' +
                            '<div class="col-sm-1"><button type="button" class="btn btn-danger" ng-click="removeImage(att.translation[lang].value); att.translation[lang].value = null" style="min-width: 10px; float: right;"><i class="fa fa-trash"/></div>');
                        break;
                    case "color":
                        el.append("<div class=\"col-sm-10\" style=\"display: flex\">"+
                                "<color-picker ng-model=\"att.translation[lang].value\" options=\"optionColor\"></color-picker>"+
                                "<button style=\"height: 20px; padding: 0 5px;\" ng-click=\"att.translation[lang].value = ''\" type=\"button\"><i class=\"fa fa-times\"/></button>"+
                            "</div>"
                        );
                        break;
                    case "listcolor":
                        el.append("<div class='col-sm-10'>" +
                            "    <ul style='list-style: none;padding: 5px;'>" +
                            "    <li style='width: 90px; display: inline-block; margin-right: 10px;padding: 2px; border-radius: 5px;{{value === att.translation[lang].value ? \"border: 2px solid #576fa1;\": \"\"}}' ng-click='selectColor(value)' ng-repeat='value in att.translation[lang].values'>"+
                            "       <p style='box-sizing: border-box; text-align: center; cursor: pointer; border-radius: 5px; padding: 5px; background-color: {{value}};'>{{value}}</p>"+
                            "    </li>" +
                            "    </ul>" +
                            "</div>");
                        break;
                }
                $compile(el)(scope);
                element.append(el);
                
            /* }) */
        }
    };
});

adminCatagenDirectives.directive("nsOptions", function ($compile)
{
    return {
        template: "",
        restrict: "E",
        link: function (scope, element, attrs)
        {
            var el = angular.element("<span/>");
            switch(scope.line.type)
            {
                case "Texte Court":
                    el.append(
                        "<input class='form-control' type='text' ng-model='value[line.name]'/>"
                    );
                    break;
                case "Nombre":
                    el.append(
                        "<input class='form-control' numericbinding type='number' ng-model='value[line.name]'/>"
                    );
                    break;
                case "Texte Long":
                    el.append(
                        "<textarea ng-model='value[line.name]' rows='3' style=' font-size: 14px; width: 100%;'></textarea>"
                    );
                    break;
                case "Image":
                    scope.lineIndex = attrs.index;
                    el.append(
                        '<div class="col-sm-4"><input readonly type="text" class="form-control" ng-model="value[line.name]"></div><div class="col-sm-1"><a title="Image" data-trigger="hover" data-placement="top" data-html="true" data-toggle="popover" data-content="<img src=\'{{ value[line.name] }}\' width=\'250\' height=\'200\'>" class="btn btn-info" ng-show="value[line.name] != null">Afficher</a></div>' +
                        '<div class="col-sm-6"><ns-upload-files style-prop="{height: \'35px\', margin: \'0px 0px 15px 0px\'}" accepttype="image/*" multiple="false" code="opt.code" type="option" id="opt._id" entity="{value: value, lineIndex: lineIndex, line: line.name, values: opt.values}"></ns-upload-files></div>' +
                        '<div class="col-sm-1"><button type="button" class="btn btn-danger" ng-click="value[line.name] = null" style="min-width: 10px; float: right;"><i class="fa fa-trash-o"/></div>'
                    );
                    break;
            }
            $compile(el)(scope);
            element.append(el);
        }
    };
});

adminCatagenDirectives.directive("toggle", function ()
{
    return {
        restrict: "A",
        link: function (scope, element, attrs)
        {
            if(attrs.toggle == "tooltip")
            {
                $(element).tooltip();
            }
            if(attrs.toggle == "popover")
            {
                $(element).popover();
            }
        }
    };
});
adminCatagenDirectives.directive("popoverNs", function ($compile, $timeout)
{
    return {
        restrict: "A",
        link: function (scope, el, attrs)
        {
            var content = attrs.content;
            var elm = angular.element("<div />");
            elm.append(attrs.content);
            $compile(elm)(scope);
            $timeout(function ()
            {
                el.removeAttr("popover-ns").attr("data-content", elm.html());
                el.popover();
            }, 100);
        }
    };
});

adminCatagenDirectives.directive("nsStatusLabel", function ()
{
    return {
        restrict: "E",
        templateUrl: "views/templates/nsStatusLabel.html",
        scope: {
            type: "@",
            status: "=",
            name: "@"
        },
        controller: [
            "$scope",
            "$filter",
            "$rootScope",
            "NSConstants",
            function ($scope, $filter, $rootScope, NSConstants)
            {
                const orderStatuses = {};
                NSConstants.orderStatus.translation.fr.forEach((ele) => orderStatuses[ele.code] = ele.code)
                $scope.statusObj = {};
                if($scope.type === "order")
                {
                    
                    $scope.statusObj.isSuccess =
                        $scope.status === orderStatuses.PAID ||
                        $scope.status === orderStatuses.PROCESSED ||
                        $scope.status === orderStatuses.BILLED ||
                        $scope.status === orderStatuses.FINISHED;
                    $scope.statusObj.isWarning =
                        $scope.status === orderStatuses.PAYMENT_PENDING ||
                        $scope.status === orderStatuses.PAYMENT_CONFIRMATION_PENDING ||
                        $scope.status === orderStatuses.PROCESSING ||
                        $scope.status === orderStatuses.ASK_CANCEL ||
                        $scope.status === orderStatuses.DELIVERY_PARTIAL_PROGRESS;
                    $scope.statusObj.isDanger =
                        $scope.status === orderStatuses.CANCELED ||
                        $scope.status === orderStatuses.PAYMENT_FAILED ||
                        $scope.status === orderStatuses.RETURNED;
                    $scope.statusObj.isBlue =
                        $scope.status === orderStatuses.DELIVERY_PROGRESS;
                    $scope.statusObj.isYellow =
                        $scope.status === orderStatuses.PAYMENT_RECEIPT_PENDING;
                    $scope.statusObj.name = $filter("orderStatus")($scope.status);
                }
                else if($scope.type === "paymentStatus")
                {
                    $scope.statusObj.isSuccess =
                        $scope.status === "DONE";
                    $scope.statusObj.isWarning =
                        $scope.status === "TODO";
                    $scope.statusObj.isDanger =
                        $scope.status === "CANCELED" ||
                        $scope.status === "FAILED";
                    $scope.statusObj.name = $filter("paymentStatus")($scope.status);
                }
                else if($scope.type === "paymentType")
                {
                    $scope.statusObj.isSuccess =
                        $scope.status === "CREDIT";
                    $scope.statusObj.isDanger =
                        $scope.status === "DEBIT";
                    $scope.statusObj.name = $filter("paymentType")($scope.status);
                }
                else if($scope.type === "picto")
                {
                    $scope.statusObj.isSuccess = $scope.status === true;
                    $scope.statusObj.isWarning = false;
                    $scope.statusObj.isDanger = $scope.status === false;
                    $scope.statusObj.name = $scope.status
                        ? "global.visible"
                        : "global.nonVisible";
                }
                else if ($scope.type === "category") {
                    $scope.statusObj.isSuccess = $scope.status === true;
                    $scope.statusObj.isWarning = false;
                    $scope.statusObj.isDanger = $scope.status === false;
                    $scope.statusObj.name = $scope.status
                        ? "global.visible"
                        : "global.nonVisible";
                }else if($scope.type === "custom"){
                    // the name is the translation
                    if($scope.name){
                        $scope.statusObj.name = $scope.name;
                    }
                    $scope.statusObj.isSuccess = true; // default
                    $scope.statusObj.isWarning = false;
                    $scope.statusObj.isDanger = false;
                    switch($scope.status){
                        case "success":
                            /*its is the default*/
                            break;
                        case "warning":
                            $scope.statusObj.isSuccess = false;
                            $scope.statusObj.isWarning = true;
                            break;
                        case "danger":
                            $scope.statusObj.isSuccess = false;
                            $scope.statusObj.isDanger = true;
                            break;
                    }
                }
            }
        ]
    };
});

adminCatagenDirectives.directive("nsTimeInput", function ()
{
    return {
        restrict: "E",
        require: "ngModel",
        scope: {
            stepMinutes: "=?"
        },
        templateUrl: "views/templates/nsTimeInput.html",
        link: function (scope, element, attrs, ngModel)
        {
            ngModel.$render = function ()
            {
                if(ngModel.$modelValue)
                {
                    var time = ngModel.$modelValue.split("h");
                    scope.time.hours = time[0];
                    scope.time.minutes = time[1];
                }
            };

            scope.time = {
                hours: "",
                minutes: ""
            };

            var allHours = [];
            for(var i = 0; i < 24; i++)
            {
                allHours.push(i + "");
            }
            var allMinutes = [];
            for(var i = 0; i < 59; i = i + scope.stepMinutes)
            {
                if(i < 10)
                {
                    allMinutes.push("0" + i);
                }
                else
                {
                    allMinutes.push(i + "");
                }
            }
            scope.allHours = allHours;
            scope.allMinutes = allMinutes;

            scope.onTimeChange = function ()
            {
                if(scope.time.hours && scope.time.minutes)
                {
                    ngModel.$setViewValue(
                        scope.time.hours + "h" + scope.time.minutes
                    );
                }
                else
                {
                    ngModel.$setViewValue(null);
                }
            };
        },
        controller: [
            "$scope", function ($scope)
            {
            }
        ]
    };
});

adminCatagenDirectives
    .constant("nsDataTableConfig", {
        tables: {}
    })
    .controller("nsDataTableCtrl", [
        "$scope",
        "$filter",
        "$translate",
        function ($scope, $filter, $translate)
        {
            $scope.sort = {
                type: $scope.config.columns[0].field,
                reverse: true
            };

            $scope.filter = {};

            $scope.itemsPerPage = $scope.config.pagination.itemsPerPage || 12;
            $scope.maxSize = $scope.config.pagination.maxSize || 5;
            $scope.columns = $scope.config.columns;

            if($scope.config.pagination.serverPaging)
            {
                $scope.onPageChange = function (page)
                {
                    $scope.config.sourceData
                        .read(
                            page,
                            $scope.itemsPerPage,
                            $scope.filter,
                            $scope.sort
                        )
                        .then(function (result)
                        {
                            $scope.items =
                                result[$scope.config.sourceData.dataField];
                            $scope.totalItems =
                                result[$scope.config.sourceData.totalField];
                            $scope.currentPage = page;
                        });
                };
                $scope.onPageChange(1);
            }
            else
            {
                var allItems;
                $scope.config.sourceData.read().then(function (items)
                {
                    allItems = items;
                    $scope.totalItems = items.length;
                    $scope.onPageChange(1);
                });
                $scope.onPageChange = function (page)
                {
                    $scope.currentPage = page;
                    executeSort();
                    $scope.items = allItems.slice(
                        (page - 1) * $scope.itemsPerPage,
                        page * $scope.itemsPerPage
                    );
                };

                function executeSort()
                {
                    if(!$scope.config.pagination.serverPaging)
                    {
                        if(!$scope.sort.reverse)
                        {
                            allItems.sort(function (item1, item2)
                            {
                                var a = item1[$scope.sort.type];
                                var b = item2[$scope.sort.type];
                                if(a > b)
                                {
                                    return -1;
                                }
                                if(a < b)
                                {
                                    return 1;
                                }
                                return 0;
                            });
                        }
                        else
                        {
                            allItems.sort(function (item1, item2)
                            {
                                var a = item1[$scope.sort.type];
                                var b = item2[$scope.sort.type];
                                if(a > b)
                                {
                                    return 1;
                                }
                                if(a < b)
                                {
                                    return -1;
                                }
                                return 0;
                            });
                        }
                    }
                }
            }

            $scope.checkFormat = function (value, column)
            {
                if(column.format === "image")
                {
                    return column.format;
                }
                else if(column.format !== undefined)
                {
                    return "custom_format";
                }
                else if(value === true || value === false)
                {
                    return "bool";
                }
                else if(angular.isDate(value))
                {
                    return "date";
                }
                else
                {
                    return null;
                }
            };

            $scope.executeFormat = function (value, formatName)
            {
                return $filter(formatName)([value]);
            };

            $scope.hasEdit = $scope.config.edit !== undefined;

            $scope.hasRemove = $scope.config.remove !== undefined;

            $scope.hasActions = $scope.hasEdit || $scope.hasRemove;

            $scope.removeElmt = function (element)
            {
                if(
                    confirm($translate.instant("confirm.deleteElement"))
                )
                {
                    $scope.config.remove(element).then(function ()
                    {
                        $scope.items.splice($scope.items.indexOf(element), 1);
                        if(allItems !== undefined)
                        {
                            allItems.splice(allItems.indexOf(element), 1);
                            $scope.onPageChange($scope.currentPage);
                            $scope.totalItems--;
                        }
                    });
                }
            };

            this.addColumns = function (columns)
            {
            };

            this.removeColumns = function (columns)
            {
            };
        }
    ])
    .directive("nsDataTable", [
        "nsDataTableConfig",
        function (nsDataTableConfig)
        {
            return {
                restrict: "E",
                controller: "nsDataTableCtrl",
                scope: {
                    config: "="
                },
                templateUrl: "views/templates/nsDataTable.html",
                link: function (scope, elmt, attrs, controller)
                {
                    if(attrs.id)
                    {
                        nsDataTableConfig.tables[attrs.id] = controller;
                    }
                }
            };
        }
    ]);

adminCatagenDirectives.directive("nsDrag", [
    "$rootScope",
    function ($rootScope)
    {
        return {
            restrict: "A",
            link: function (scope, element, attrs)
            {
                attrs.$set("draggable", "true");
                scope.dragData = scope[attrs["nsDrag"]];
                element.bind("dragstart", function (evt)
                {
                    $rootScope.draggedElement = scope.dragData;
                    element.addClass("dragging");

                    if(evt.dataTransfer)
                    {
                        evt.dataTransfer.setData("id", evt.target.id);
                        evt.dataTransfer.effectAllowed = "move";
                    }
                    else
                    {
                        evt.originalEvent.dataTransfer.setData(
                            "id",
                            evt.target.id
                        );
                        evt.originalEvent.dataTransfer.effectAllowed = "move";
                    }
                });
                element.bind("dragend", function ()
                {
                    element.removeClass("dragging");
                });
            }
        };
    }
]);

adminCatagenDirectives.directive("noFloat", function ()
{
    return {
        restrict: "A",
        link: function (scope, elm, attrs, ctrl)
        {
            elm.on("keydown", function (event)
            {
                if([110, 190, 188].indexOf(event.which) > -1)
                {
                    event.preventDefault();
                    return false;
                }
                else
                {
                    return true;
                }
            });
        }
    };
});

adminCatagenDirectives.directive("nsDrop", [
    "$rootScope",
    function ($rootScope)
    {
        return {
            restrict: "A",
            link: function (scope, element, attrs)
            {
                scope.dropData = scope[attrs["nsDrop"]];
                scope.dropStyle = attrs["dropstyle"];
                element.bind("dragenter", function (evt)
                {
                    evt.preventDefault();
                    element.addClass(scope.dropStyle);
                });
                element.bind("dragleave", function (evt)
                {
                    element.removeClass(scope.dropStyle);
                });
                element.bind("dragover", function (evt)
                {
                    evt.preventDefault();
                });
                element.bind("drop", function (evt)
                {
                    evt.preventDefault();
                    element.removeClass(scope.dropStyle);
                    $rootScope.$broadcast(
                        "dropEvent",
                        $rootScope.draggedElement,
                        scope.dropData
                    );
                });
            }
        };
    }
]);

adminCatagenDirectives.directive("nsRules", [
    function ()
    {
        return {
            restrict: "E",
            scope: {
                rule: "=",
                type: "@",
                typePromo: "=",
                condType: "@"
            },
            templateUrl: "views/templates/nsRules.html",
            controller: [
                "$scope", function ($scope)
                {
                    $scope.rule.owner_type = $scope.type;
                }
            ]
        };
    }
]);

adminCatagenDirectives.directive("nsRule", [
    function ()
    {
        return {
            restrict: "E",
            templateUrl: "views/templates/nsRule.html",
            scope: {
                rule: "=",
                typePromo: "=",
                removable: "=",
                removeFromParent: "&",
                isCart: "=",
                condType: "="
            },
            replace: true,
            controller: function ($scope, AttributesV2, FamilyV2, $modal, $element, $rootScope, SuppliersV2, TrademarksV2, PictoApi)
            {
                var langs = [];

                $scope.families = {};
                $scope.values = {};
                $scope.suppliers = []
                $scope.compare = [
                    {value: "contains", translate: "ns.contains"},
                    {value: "ncontains", translate: "ns.ncontains"},
                    {value: "eq", translate: "ns.eq"},
                    {value: "neq", translate: "ns.neq"},
                    {value: "startswith", translate: "ns.startswith"},
                    {value: "endswith", translate: "ns.endswith"},
                    {value: "gte", translate: "ns.gte"},
                    {value: "gt", translate: "ns.gt"},
                    {value: "lte", translate: "ns.lte"},
                    {value: "lt", translate: "ns.lt"}
                ];

                $scope.operatorValidForCondition = function(operator, condition) {
                    // ['number', 'date', 'bool'].indexOf(condition.type) !== -1
                    if (condition === 'number') {
                        if (['contains', 'ncontains', 'startswith', 'endswith'].indexOf(operator) !== -1) {
                            return false;
                        }
                    } else if (condition === 'bool') {
                        if (['contains', 'ncontains', 'startswith', 'endswith', 'gte', 'gt', 'lte', 'lt'].indexOf(operator) !== -1) {
                            return false;
                        }
                    }
                    return true;
                }

                $scope.getAttributes = function ()
                {
                    // on recup les univers
                    $scope.attributesClassed = [];
                    SuppliersV2.list({PostBody: {filter: {}, limit: 0, structure: '*'}}, function(response) {
                        $scope.values.supplier_ref = response.datas;
                    })
                    TrademarksV2.list({PostBody: {filter: {}, limit: 0, structure: '*'}}, function(response) {
                        $scope.values['trademark.name'] = response.datas.map(tm => tm.name);
                    })
                    PictoApi.list({PostBody: {filter: {}, limit: 0}}, function (response) {
                        $scope.attributesClassed.push(
                        {
                            value: "pictos.code",
                            type: "select",
                            params: {
                                values: response.datas.map(data => data.code),
                                type: 'pictos'
                            },
                            name: 'pictos_code'
                        })

                    })
                    AttributesV2.list({PostBody: {filter: {usedInRules: true}, structure: '*', limit: 0}}, function (response)
                    {
                        response.datas.map(function (element)
                        {
                            var type = (function (type)
                            {
                                switch(type)
                                {
                                    case "textfield":
                                        return "text";
                                    case "date":
                                        return "date";
                                    case "number":
                                        return "number";
                                    case "bool":
                                        return "bool";
                                    case "list":
                                        return "select";
                                    case "multiselect":
                                        return "multiselect";
                                    case "interval":
                                        return "number";
                                    default:
                                        return "text";
                                }
                            })(element.type);
                            for(var i = 0, leni = langs.length; i < leni; i++){
                                    let values = [];
                                    //we put only value of the correct languages
                                    const langKey = langs[i].code;
                                    if(element.translation[langKey]){
                                        values = element.translation[langKey].values;
                                    }
                                    $scope.attributesClassed.push(
                                        {
                                            value: "attr.translation." + langs[i].code + "." + element.code,
                                            type: type,
                                            params: {
                                                values: values,
                                                lang: langs[i].name,
                                                attr: element.code
                                            },
                                            name: 'attr.translation'
                                        }
                                    );
                                }
                        });

                        for(var i = 0, leni = langs.length; i < leni; i++)
                        {
                            $scope.attributesClassed.push(
                                {
                                    value: "translation." + langs[i].code + ".name",
                                    type: "text",
                                    params: {
                                        lang: langs[i].name
                                    },
                                    name: "translation_name"
                                },
                                {
                                    value: "translation." + langs[i].code + ".slug",
                                    type: "text",
                                    params: {
                                        lang: langs[i].name
                                    },
                                    name: "translation_slug"
                                }
                            );
                        }

                        $scope.attributesClassed.push(
                            {
                                value: "code",
                                type: "text",
                                params: {},
                                name: 'code'
                            },
                            {
                                value: "qty",
                                type: "number",
                                params: {},
                                name: 'qty'
                            },
                            {
                                value: "createdAt",
                                type: "date",
                                params: {},
                                name: 'createdAt'
                            },
                            {
                                value: "_visible",
                                type: "bool",
                                params: {},
                                name: 'visible'
                            },
                            {
                                value: "active",
                                type: "bool",
                                params: {},
                                name: 'active'
                            },
                            {
                                value: "price.et.normal",
                                type: "number",
                                params: {},
                                name: 'price_et_normal'
                            },
                            {
                                value: "price.ati.normal",
                                type: "number",
                                params: {},
                                name: "price_ati_normal"
                            },
                            {
                                value: "price.et.special",
                                type: "number",
                                params: {},
                                name: "price_et_special"
                            },
                            {
                                value: "price.ati.special",
                                type: "number",
                                params: {},
                                name: 'price_ati_special'
                            },
                            {
                                value: "type",
                                type: "text",
                                params: {},
                                name: 'type'
                            },
                            {
                                value: "is_new",
                                type: "bool",
                                params: {},
                                name: 'is_new'
                            },
                            {
                                value: "family",
                                type: "select",
                                params: {
                                    type: "family"
                                },
                                name: 'family'
                            },
                            {
                                value: "subfamily",
                                type: "select",
                                params: {
                                    type: "subfamily"
                                },
                                name: 'subfamily'
                            },
                            {
                                value: "universe",
                                type: "select",
                                params: {
                                    type: "universe"
                                },
                                name: 'universe'
                            },
                            {
                                value: "_id",
                                type: "text",
                                params: {},
                                name: '_id'
                            },
                            {
                                value: "trademark.name",
                                type: "select",
                                params: {},
                                name: 'trademark'
                            },
                            {
                                value: "supplier_ref",
                                type: "select",
                                params: {},
                                name: 'supplier_ref'
                            },
                            {
                                value: "client._id",
                                type: "text",
                                params: {},
                                name: "client__id"
                            },
                            {
                                value: "client.type",
                                type: "text",
                                params: {},
                                name: "client_type"
                            },
                            {
                                value: "categorie.code",
                                type: "text",
                                params: {},
                                name: 'categorie_code'
                            }
                        );
                        if($scope.typePromo === "1") {
                            $scope.attributesClassed.push(
                                {
                                    value: "panier.priceTotal.et",
                                    type: "number",
                                    params: {},
                                    name: "panier_priceTotal_et"
                                },
                                {
                                    value: "panier.priceTotal.ati",
                                    type: "number",
                                    params: {},
                                    name: "panier_priceTotal_ati"
                                }
                            )
                        }
                        AttributesV2.list({PostBody: {filter: {_type: 'users', usedInRules: true}, structure: '*', limit: 0}}, function (response)
                        {
                            response.datas.map(function (element) {
                                var type = (function (type)
                                {
                                    switch(type)
                                    {
                                        case "textfield":
                                            return "text";
                                        case "date":
                                            return "date";
                                        case "number":
                                            return "number";
                                        case "bool":
                                            return "bool";
                                        case "list":
                                            return "select";
                                        case "multiselect":
                                            return "multiselect";
                                        case "interval":
                                            return "number";
                                        default:
                                            return "text";
                                    }
                                })(element.type);
                                for(var i = 0, leni = langs.length; i < leni; i++)
                                {
                                    let values = [];
                                    for(var j = 0; j < Object.keys(element.translation).length; j++) {
                                        const langKey = Object.keys(element.translation)[j]
                                        values = values.concat(element.translation[langKey].values)
                                    }
                                    $scope.attributesClassed.push(
                                        {
                                            value: "client.attr.translation." + langs[i].code + "." + element.code,
                                            type: type,
                                            params: {
                                                values: values,
                                                lang: langs[i].name,
                                                attr: element.code
                                            },
                                            name: "client_attr_translation"
                                        }
                                    );
                                }
                            })
                        });

                        for(var i = 0, leni = langs.length; i < leni; i++)
                        {
                            $scope.attributesClassed.push(
                                {
                                    value: "categorie.translation." + langs[i].code + ".slug",
                                    type: "text",
                                    params: {
                                        lang: langs[i].name
                                    },
                                    name: "categorie_translation_slug"
                                }
                            );
                        }
                        if($scope.rule.conditions){
                            const conditionsLength = $scope.rule.conditions.length;
                            for(var i = 0; i < conditionsLength; i++) {
                                $scope.select($scope.rule.conditions[i].target, i, $scope.rule.conditions[i], true);
                            }
                        }
                    });
                };

                langs = $rootScope.languages;
                $scope.getAttributes();

                function newCondition()
                {
                    $scope.rule.conditions.push({});
                }

                function newRule()
                {
                    var _newRule = {conditions: [{}]};
                    if($scope.rule.other_rules === undefined)
                    {
                        $scope.rule.other_rules = [];
                    }

                    if($scope.rule.owner_type.endsWith("Action") && ($scope.rule.effects === undefined || $scope.rule.effects.length === 0))
                    {
                        _newRule.effects = [{}];
                    }

                    $scope.rule.other_rules.push(_newRule);
                }

                $scope.open = function ()
                {
                    if($scope.condType)
                    {
                        if($scope.condType === "simple")
                        {
                            newCondition();
                            if($scope.rule.owner_type.endsWith("Action") && ($scope.rule.effects === undefined || $scope.rule.effects.length === 0))
                            {
                                $scope.rule.effects = [{}];
                            }
                        }
                        else if($scope.condType === "multiple")
                        {
                            newRule();
                        }
                    }
                    else
                    {
                        $modal.open({
                            template: "<div style='text-align: center; padding: 20px;'>" +
                                "    <h2>Nouvelle condition</h2>" +
                                "    <p>Choisissez le type de condition à ajouter</p>" +
                                "    <div class='row'>" +
                                "        <button type='button' class='btn btn-danger' ng-click='cancel()'>Annuler</button>" +
                                "        <button type='button' class='btn btn-info' ng-click='newCondition()'>Simple</button>" +
                                "        <button type='button' class='btn btn-info' ng-click='newRule()'>Multiple</button>" +
                                "    </div>" +
                                "</div>", // loads the template
                            scope: $scope,
                            backdrop: true, // setting backdrop allows us to close the modal window on clicking outside the modal window
                            windowClass: "modal", // windowClass - additional CSS class(es) to be added to a modal window template
                            controller: function ($scope, $modalInstance)
                            {
                                $scope.newCondition = function ()
                                {
                                    newCondition();
                                    $scope.cancel();
                                };

                                $scope.newRule = function ()
                                {
                                    newRule();
                                    $scope.cancel();
                                };

                                $scope.cancel = function ()
                                {
                                    $modalInstance.dismiss("cancel");
                                };
                            }
                        });
                    }
                };

                $scope.removeCondition = function (index, condition)
                {
                    if(index === undefined)
                    {
                        $scope.index = -1;
                    }
                    else
                    {
                        $scope.index = index;
                    }
                    $modal.open({
                        template: "<div style='text-align: center; padding: 20px;'>" +
                            "    <h2>Supprimer la condition</h2>" +
                            "    <p>Etes vous sur de vouloir supprimer cette condition ?</p>" +
                            "    <div class='row'>" +
                            "        <button type='button' class='btn btn-danger' ng-click='cancel()'>Non</button>" +
                            "        <button type='button' class='btn btn-info' ng-click='yes()'>Oui</button" +
                            "    </div>" +
                            "</div>", // loads the template
                        scope: $scope,
                        backdrop: true, // setting backdrop allows us to close the modal window on clicking outside the modal window
                        windowClass: "modal", // windowClass - additional CSS class(es) to be added to a modal window template
                        controller: function ($scope, $modalInstance)
                        {
                            $scope.yes = function ()
                            {
                                var oCondition = $scope.rule.conditions[$scope.index];
                                // Si la condition a supprimer contient "id_parent_other_rules" alors il se peut que des other_rule soient liés a cette condition
                                if(oCondition && oCondition.id_parent_other_rules && oCondition.id_parent_other_rules === condition.id_parent_other_rules)
                                {
                                    // On cherche les other_rules liées au id_parent_other_rules de la condition afin de les supprimer
                                    if($scope.rule.other_rules && $scope.rule.other_rules.length > 0)
                                    {
                                        $scope.rule.other_rules.forEach(function (rule, index)
                                        {
                                            // Les other_rules liés a la condition on pour owner_type l'id_parent_other_rules de la condition
                                            if(rule.owner_type && rule.owner_type === condition.id_parent_other_rules)
                                            {
                                                $scope.rule.other_rules.splice(index, 1);
                                            }
                                        });
                                    }
                                }
                                $scope.rule.conditions.splice($scope.index, 1);
                                $scope.cancel();
                            };
                            $scope.cancel = function ()
                            {
                                $modalInstance.dismiss("cancel");
                            };
                        }
                    });
                };

                $scope.removeEffect = function (index)
                {
                    if(index === undefined)
                    {
                        $scope.index = -1;
                    }
                    else
                    {
                        $scope.index = index;
                    }
                    $modal.open({
                        template: "<div style='text-align: center; padding: 20px;'>" +
                            "    <h2>Supprimer l'effet</h2>" +
                            "    <p>Etes vous sur de vouloir supprimer cet effet ?</p>" +
                            "    <div class='row'>" +
                            "        <button type='button' class='btn btn-danger' ng-click='cancel()'>Non</button>" +
                            "        <button type='button' class='btn btn-info' ng-click='yes()'>Oui</button" +
                            "    </div>" +
                            "</div>", // loads the template
                        scope: $scope,
                        backdrop: true, // setting backdrop allows us to close the modal window on clicking outside the modal window
                        windowClass: "modal", // windowClass - additional CSS class(es) to be added to a modal window template
                        controller: function ($scope, $modalInstance)
                        {
                            $scope.yes = function ()
                            {
                                $scope.rule.effects.splice($scope.index, 1);
                                $scope.cancel();
                            };
                            $scope.cancel = function ()
                            {
                                $modalInstance.dismiss("cancel");
                            };
                        }
                    });
                };

                $scope.removeOtherRule = function (index, other_rule)
                {
                    if(index === undefined)
                    {
                        $scope.index = -1;
                    }
                    else
                    {
                        $scope.index = index;
                    }
                    $modal.open({
                        template: "<div style='text-align: center; padding: 20px;'>" +
                            "    <h2>Supprimer la règle</h2>" +
                            "    <p>Etes vous sur de vouloir supprimer cette regle ? La ou les condition(s) fille(s) seront supprimée(s) aussi.</p>" +
                            "    <div class='row'>" +
                            "        <button type='button' class='btn btn-danger' ng-click='cancel()'>Non</button>" +
                            "        <button type='button' class='btn btn-info' ng-click='yes()'>Oui</button" +
                            "    </div>" +
                            "</div>", // loads the template
                        scope: $scope,
                        backdrop: true, // setting backdrop allows us to close the modal window on clicking outside the modal window
                        windowClass: "modal", // windowClass - additional CSS class(es) to be added to a modal window template
                        controller: function ($scope, $modalInstance)
                        {
                            $scope.yes = function ()
                            {
                                $scope.rule.other_rules.forEach(function (otherRule, index)
                                {
                                    if(other_rule.$$hashKey === otherRule.$$hashKey)
                                    {
                                        $scope.rule.other_rules.splice(index, 1);
                                    }
                                });
                                $scope.cancel();
                            };
                            $scope.cancel = function ()
                            {
                                $modalInstance.dismiss("cancel");
                            };
                        }
                    });
                };
                $scope.removeRule = function (index)
                {
                    $scope.removeFromParent(index);
                };
                $scope.cast = function (value)
                {
                    if(isNaN(value) === false)
                    {
                        value = Number(value);
                    }
                    return value;
                };
                /**
                 * Permet de savoir si une other_rules possède un owner_type commençant par parent_cart_
                 * @param {object} condition - une condition de type panier, on s'en servira pour afficher ses sous conditions (qui sont des other_rules)
                 * @param {object} other_rules - une other_rules d'une régle cf: voir schema models/rules.js
                 * @returns {boolean} - vrai si c'est une other_rules commençant par parent_cart_
                 */
                $scope.isCartOtherRules = function (condition)
                {
                    return function (other_rules)
                    {
                        if(other_rules && other_rules.owner_type && other_rules.owner_type === condition.id_parent_other_rules)
                        {
                            return true;
                        }
                        return false;
                    };
                };
                $scope.isNotCartOtherRules = function (other_rules = null)
                {
                    if(!other_rules || !other_rules.owner_type || !other_rules.owner_type.startsWith("parent_cart_"))
                    {
                        return true;
                    }
                    return false;
                };
                /**
                 * Permet de savoir si une condition contient des other_rules. Si c'est le cas on affichera l'other_rules directement
                 * sous la condition, on affichera les conditions suivante aprés cette other_rules
                 * @param {object} condition - une condition d'une régle cf: voir schema models/rules.js
                 * @returns {boolean} - vrai si c'est une condition contenant des sous conditions
                 */
                $scope.isCartRules = function (condition = null)
                {
                    if(condition instanceof Array)
                    {
                        console.log("condition", condition.length);
                    }
                    else if(condition && condition.id_parent_other_rules && condition.id_parent_other_rules.startsWith("parent_cart_"))
                    {
                        return true;
                    }
                    return false;
                };
                /**
                 * Permet de cacher les champs dispo dans le select en fonction de s'il est dans une condition panier ou non
                 */
                $scope.filterAttrClassedByOwnerType = function (rule)
                {
                    return function (field)
                    {
                        if(rule && rule.owner_type && rule.owner_type.startsWith("parent_cart_") && field.value.startsWith("panier.qte_min"))
                        {
                            return false;
                        }
                        return true;
                    };
                };
                $scope.select = function (target, index, condition, init)
                {
                    var attr = $scope.attributesClassed.find(function (element)
                    {
                        return element.value === target;
                    });
                    if(attr)
                    {
                        $scope.rule.conditions[index].type = attr.type === "multiselect" ? "select" : attr.type;
                        // Si on passe d'une condition 'panier.qte_min' a une condition qui n'est pas panier
                        // alors nous devons réinitialiser other_rules a []
                        var other_rules = $scope.rule.other_rules;
                        var indexToDelete = null;
                        var otherRulesFound = null;
                        if(other_rules)
                        {
                            otherRulesFound = other_rules.find(function (otherRule, idx)
                            {
                                if(otherRule.owner_type && otherRule.owner_type === condition.id_parent_other_rules)
                                {
                                    indexToDelete = idx;
                                    return true;
                                }
                                return false;
                            });
                        }
                        if(other_rules && otherRulesFound)
                        {
                            //On verifie que condition.id_parent_other_rules existe encore dans les cond.id_parent_other_rules des conditions
                            $scope.rule.conditions.forEach(function (cond)
                            {
                                if(!cond.target.startsWith("panier.qte_min") && cond.id_parent_other_rules === condition.id_parent_other_rules)
                                {
                                    delete cond.id_parent_other_rules;
                                    $scope.rule.other_rules.splice(indexToDelete, 1);
                                }
                            });
                        }

                        if((['family', 'subfamily', 'universe']).includes(attr.value)) {
                            FamilyV2.list({PostBody: {filter: {type: attr.value}, limit: 0, structure: '*', populate: {
                                path : 'parent',
                                populate : {
                                    path : 'parent'
                                }
                            }}}, function ({datas})
                            {
                                for(const data of datas) {
                                    if(data.parent) {
                                        data.name = data.parent.name + ' > ' + data.name
                                        if(data.parent.parent) {
                                            data.name = data.parent.parent.name + ' > ' + data.name
                                        }
                                    }
                                }
                                $scope.families[attr.value] = datas;
                            });
                        } else if(attr.type === "select" || attr.type === "multiselect")
                        {
                            if(attr.params.values && attr.params.values.length > 0)
                            {
                                if(attr.type === "multiselect")
                                {
                                    $scope.rule.conditions[index].attr = "multi";
                                }
                                $scope.values[attr.value] = attr.params.values;
                            }
                        }

                        if(!!init === false)
                        {
                            $scope.rule.conditions[index].value = undefined;

                            if(attr.type === "bool")
                            {
                                $scope.rule.conditions[index].value = false;
                            }
                        }
                    }
                };
            }
        };
    }
]);

adminCatagenDirectives.directive("nsUploadFiles", [
    function ()
    {
        return {
            restrict: "E",
            scope: {
                multiple: "=",
                type: "@",
                code: "=",
                id: "=",
                images: "=",
                entity: "=",
                showalt: '@',
                accepttype: '@',
                beforeFunction: '=',
                afterFunction: '=',
                onError: '&',
                styleProp: '=',
                lang: '=',
                isSelected: '=',
                uploadUrl: '=',
                isVariant: '=',
            },
            templateUrl: "views/templates/nsUploadFiles.html",
            controller: [
                "$scope", "Upload", "toastService",
                function ($scope, Upload, toastService)
                {
                    $scope.disableUpload = false;
                    $scope.idOptional = "";

                    $scope.$watch('files', function () {
                        $scope.disableUpload = true;
                        if ($scope.files && $scope.files.length) {
                            $scope.isSelected = true;
                            if (!$scope.multiple && $scope.files.length > 1) {
                                $scope.files.shift();
                            }

                            for (var i = 0; i < $scope.files.length; i++) {
                                $scope.files[i].default = false;
                                if ($scope.images) {
                                    if (i === 0 && $scope.images.length === 0) {
                                        $scope.files[i].default = true;
                                    }
                                }

                                $scope.files[i].extension = $scope.files[i].name.match(/\.[^/.]+$/);
                                $scope.files[i].nameModified = $scope.files[i].nameModified !== $scope.files[i].name.replace(/\.[^/.]+$/, "") && $scope.files[i].nameModified ? $scope.files[i].nameModified.replace(/[^A-Z0-9-]+/ig, "_") : $scope.files[i].name.replace(/\.[^/.]+$/, "").replace(/[^A-Z0-9-]+/ig, "_");
                                $scope.files[i].alt = $scope.files[i].alt !== "" ? $scope.files[i].alt : '';
                            }
                            $scope.upload($scope.files)
                        }
                            $scope.disableUpload = false;
                    });

                    $scope.upload = function (files) {
                        if($scope.isVariant) $scope.type = 'productsVariant'
                        $scope.disableUpload = true;
                        $scope.progress = [];
                        if (files && files.length) {
                            for (var i = 0; i < files.length; i++) {
                                var file = files[i];
                                if (!file.$error) {
                                    if(typeof $scope.beforeFunction === 'function') $scope.beforeFunction();
                                    if ($scope.type === "module"){
                                        $scope.up = Upload.upload({
                                            url: 'v2/modules/upload',
                                            method: 'POST',
                                            data: {
                                                file: file
                                            }
                                        });
                                    }
                                    else if ($scope.type === "theme"){
                                        $scope.up = Upload.upload({
                                            url: 'v2/themes/upload',
                                            method: 'POST',
                                            data: {
                                                file: file
                                            }
                                        });
                                    }
                                    else if ($scope.type === "document"){
                                        $scope.up = Upload.upload({
                                            url: '/v2/medias/download/documents',
                                            method: 'POST',
                                            data: {
                                                file: file
                                            }
                                        });
                                    }
                                    else if ($scope.type === "mediaMass"){
                                        $scope.up = Upload.upload({
                                            url: '/v2/medias/download/medias',
                                            method: 'POST',
                                            data: {
                                                file: file,
                                                insertDB: $scope.entity
                                            }
                                        });
                                    }
                                    else if ($scope.type === "genericFile"){
                                        if(!$scope.uploadUrl){
                                            throw ('Error use the parameter "upload-url" with "genericFile"');
                                        }else{
                                            $scope.up = Upload.upload({
                                                url: $scope.uploadUrl,
                                                method: 'POST',
                                                data: {
                                                    file: file
                                                }
                                            });
                                        }
                                    }
                                    else {
                                        if ($scope.entity) {
                                            delete $scope.entity.$promise;
                                            delete $scope.entity.$resolved;
                                        }
                                        $scope.up = Upload.upload({
                                            url: 'v2/medias/upload',
                                            method: 'POST',
                                            data: {
                                                type: $scope.type,
                                                file: Upload.rename(file, file.nameModified.replace(/[^A-Z0-9-]+/ig, "_")),
                                                alt: file.alt || '',
                                                extension: file.extension[0],
                                                default: (!$scope.images || $scope.images.length === 0) ? true : false,
                                                position: $scope.images && $scope.images.length > -1 ? $scope.images.length+1 : 0,
                                                code: $scope.code ? $scope.code : '',
                                                _id: $scope.id ? $scope.id : $scope.idOptional,
                                                entity: $scope.entity,
                                                lang: $scope.lang ? $scope.lang : ''
                                            }
                                        });
                                    }
                                    $scope.up.then(function (response) {
                                        var index = $scope.files.map(function (item) {
                                            return item.nameModified.replace(/[^A-Z0-9]+/ig, "_");
                                        }).indexOf(response.data.name);
                                        $scope.files.splice(index, 1);
                                        switch ($scope.type) {
                                            case 'productsVariant':
                                            case 'products': {
                                                $scope.images.push(response.data);
                                                if(typeof $scope.afterFunction === 'function') $scope.afterFunction({data: response.data});
                                                break;
                                            }
                                            case 'picto': {
                                                $scope.entity.filename = response.data.name;
                                                if(typeof $scope.afterFunction === 'function') $scope.afterFunction({data: response.data});
                                                break;
                                            }
                                            case 'trademark': {
                                                $scope.entity.logo = response.data.name;
                                                if(typeof $scope.afterFunction === 'function') $scope.afterFunction({data: response.data});
                                                break;
                                            }
                                            case 'language': {
                                                $scope.entity.img = response.data.path;
                                                if(typeof $scope.afterFunction === 'function') $scope.afterFunction({data: response.data});
                                                break;
                                            }
                                            case 'article': {
                                                $scope.entity.img = response.data.path;
                                                if(typeof $scope.afterFunction === 'function') $scope.afterFunction({data: response.data});
                                                break;
                                            }
                                            case 'media': {
                                                $scope.entity.link = response.data.path;
                                                $scope.entity._id = response.data.id;
                                                $scope.idOptional = response.data.id;
                                                if(typeof $scope.afterFunction === 'function') $scope.afterFunction({data: response.data});
                                                break;
                                            }
                                            case 'gallery': {
                                                $scope.entity = response.data;
                                                $scope.images.push(response.data);
                                                if(typeof $scope.afterFunction === 'function') $scope.afterFunction({data: response.data});
                                                break;
                                            }
                                            case 'slider': {
                                                $scope.images.push(response.data);
                                                if(typeof $scope.afterFunction === 'function') $scope.afterFunction({data: response.data});
                                                break;
                                            }
                                            case 'module': {
                                                if(typeof $scope.afterFunction === 'function') $scope.afterFunction({module: response.data});
                                                break;
                                            }
                                            case 'attribute': {
                                                $scope.entity.value = response.data.path;
                                                if(typeof $scope.afterFunction === 'function') $scope.afterFunction({data: response.data});
                                                break;
                                            }
                                            case 'option': {
                                                $scope.entity.value[$scope.entity.line] = response.data.path;
                                                if(typeof $scope.afterFunction === 'function') $scope.afterFunction({data: response.data});
                                                break;
                                            }
                                            default:
                                                if(typeof $scope.afterFunction === 'function') $scope.afterFunction({data: response.data});
                                                break;
                                        }
                                        $scope.disableUpload = false;
                                    }, function (err) {
                                        console.error(err);
                                        if (err && err.data && err.data.message) {
                                            toastService.toast('danger', err.data.message);
                                        }
                                        if(typeof $scope.onError === 'function') $scope.onError(err);
                                    }, function (evt) {
                                        $scope.disableUpload = true;
                                        $scope.progress[evt.config.data.file.$ngfBlobUrl] = parseInt(100.0 * evt.loaded / evt.total);
                                    }).finally(function() {
                                        $scope.disableUpload = false;
                                        $scope.progress = [];
                                    });
                                }
                            }
                            $scope.progress = [];
                        }
                        $scope.isSelected = false;
                    };
                }
            ]
        };
    }
]);

adminCatagenDirectives.directive('replaceComma', function () {
    return {
        require: 'ngModel',
        link: function (scope, element, attrs, ngModelCtrl) {
            scope.$watch(attrs.ngModel, function (newVal) {
                if (newVal !== undefined && newVal !== null) {
                    ngModelCtrl.$setViewValue(String(newVal).replace(/,/g, '.'));
                    element.val(String(newVal).replace(/,/g, '.'));
                }
            })

        }
    }
});

adminCatagenDirectives.directive('nsFormImageCache', function () {
    return {
        scope: false,
        templateUrl: "views/templates/nsFormImageCache.html",
        controller: ["$scope", "toastService", "$translate",
            function ($scope, toastService, $translate) {
            $scope.positions = [
                {
                    pos: "center",
                    id: "center"
                },
                {
                    pos: "top",
                    id: "top"
                },
                {
                    pos: "bottom",
                    id: "bottom"
                },
                {
                    pos: "left",
                    id: "left"
                },
                {
                    pos: "right",
                    id: "right"
                },
                {
                    pos: "top-left",
                    id: "topLeft"
                },
                {
                    pos: "top-right",
                    id: "topRight"
                },
                {
                    pos: "bottom-left",
                    id: "bottomLeft"
                },
                {
                    pos: "bottom-right",
                    id: "bottomRight"
                }
            ];
    
            $scope.getTranslation = function(pos){
                return `medias.modal.${pos}`;
            }
            $scope.info = {
                max: true,
                keepRatio: true,
                ratio: 1,
                relativeLink: true,
    
                crop:false,
                position:"center",
                background:false,
                height: "",
                width: "",
                quality: 80,
                r:255,
                g:255,
                b:255,
                alpha:1
            };
    
            $scope.generer = function () {
                let size = 'max'
                if(!$scope.info.max) {
                    size = $scope.info.width + "x" + $scope.info.height
                }
                
                const quality = $scope.info.quality;
                let filename = "";
                if ($scope.info.name !== undefined) {
                    filename = $scope.info.name
                } else {
                    filename = $scope.media.link.trim().replace(/^.*[\\\/]/, '')
                }
    
                let background  = '';
                let crop        = '';
                if (
                    (!$scope.info.height || !$scope.info.width || !quality)
                    || (
                        $scope.info.background
                        && (
                            ($scope.info.r === undefined || $scope.info.r < 0) || ($scope.info.g === undefined || $scope.info.g < 0) || ($scope.info.b === undefined || $scope.info.b < 0) ||
                            !($scope.info.alpha >= 0 && $scope.info.alpha <= 1))
                    )
                ) {
                    toastService.toast("warning", $translate.instant("medias.modal.enterAllValue"));
                } else {
                    if ($scope.info.background) {
                        if ($scope.info.alpha) {
                            if ($scope.info.alpha > 1) {
                                $scope.info.alpha = 1;
                            }
                        }
                        background = `-${$scope.info.r},${$scope.info.g},${$scope.info.b},${$scope.info.alpha}`;
                    }
                    if ($scope.info.crop) {
                        crop = `-crop-${$scope.info.position}`;
                    }
                    toastService.toast("success", $translate.instant("medias.modal.linkGenerated"));
                    $scope.link = `${!$scope.info.relativeLink ? window.location.origin : ''}/images/${$scope.media.type || 'medias'}/${size}-${quality}${crop}${background}/${$scope.media._id}/${filename}`;
                    return $scope.link;
                }
            };
    
            $scope.sizeChange = function (type, size) {
                if($scope.info.keepRatio) {
                    if(type === 'width') {
                        $scope.info.height = Math.round(size / $scope.info.ratio)
                    } else {
                        $scope.info.width = Math.round(size * $scope.info.ratio)
                    }
                }
            }
    
            $scope.getMeta = function (url) {
                const img = new Image();
                img.src = url;
                img.onload = function() { 
                    const that = this;
                    $scope.$apply(function () {
                        $scope.info.ratio = that.width / that.height;
                        $scope.info.width = that.width;
                        $scope.info.height = that.height;
                        $scope.info.name = $scope.media.link.trim().replace(/^.*[\\\/]/, '')
                    })
                }
            }

            $scope.$watch(function (scp) {return scp.media}, function(newValue, oldValue) {
                if (newValue?.link)  $scope.getMeta(newValue.link)
            });

        }]
    }
});