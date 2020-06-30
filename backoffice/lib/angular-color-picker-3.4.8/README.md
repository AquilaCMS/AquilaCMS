# Angular Color Picker

Vanilla AngularJS Color Picker Directive with no requirement on jQuery

[![Build Status](https://travis-ci.org/ruhley/angular-color-picker.svg?branch=master)](https://travis-ci.org/ruhley/angular-color-picker)
[![Code Climate](https://lima.codeclimate.com/github/ruhley/angular-color-picker/badges/gpa.svg)](https://lima.codeclimate.com/github/ruhley/angular-color-picker)

## Installation

#### Bower

```shell
bower install angularjs-color-picker --save
```

#### Npm
```shell
npm install angularjs-color-picker --save
```

#### Usage

* Include files

    * Bower

    ```html
    <link rel="stylesheet" href="bower_components/angular-color-picker/dist/angularjs-color-picker.min.css" />
    <!-- only include if you use bootstrap -->
    <link rel="stylesheet" href="bower_components/angular-color-picker/dist/themes/angularjs-color-picker-bootstrap.min.css" />

    <script src="bower_components/tinycolor/dist/tinycolor-min.js"></script>
    <script src="bower_components/angular-color-picker/dist/angularjs-color-picker.min.js"></script>
    ```

    * Node

    ```html
    <link rel="stylesheet" href="node_modules/angularjs-color-picker/dist/angularjs-color-picker.min.css" />
    <!-- only include if you use bootstrap -->
    <link rel="stylesheet" href="node_modules/angularjs-color-picker/dist/themes/angularjs-color-picker-bootstrap.min.css" />

    <script src="node_modules/tinycolor2/dist/tinycolor-min.js"></script>
    <script src="node_modules/angularjs-color-picker/dist/angularjs-color-picker.min.js"></script>
    ```


* Add the module to your app
```javascript
angular.module('app', ['color.picker']);
```

* Include in your view
```html
<color-picker ng-model="myColor"></color-picker>
```

## Options

HTML - Only ```ng-model``` is required. If supplying an api it must be a unique object per color picker. However the event api can be shared among color pickers.

```html
<color-picker
    ng-model="color"
    options="options"
    api="api"
    event-api="eventApi"
></color-picker>
```
Javascript

```js
$scope.color = '#FF0000';

// options - if a list is given then choose one of the items. The first item in the list will be the default
$scope.options = {
    // html attributes
    required: [false, true],
    disabled: [false, true],
    placeholder: '',
    inputClass: '',
    id: undefined,
    name: undefined,
    // validation
    restrictToFormat: [false, true],
    preserveInputFormat: [false, true],
    allowEmpty: [false, true],
    // color
    format: ['hsl', 'hsv', 'rgb', 'hex', 'hexString', 'hex8', 'hex8String', 'raw'],
    case: ['upper', 'lower'],
    // sliders
    hue: [true, false],
    saturation: [false, true],
    lightness: [false, true], // Note: In the square mode this is HSV and in round mode this is HSL
    alpha: [true, false],
    dynamicHue: [true, false],
    dynamicSaturation: [true, false],
    dynamicLightness: [true, false],
    dynamicAlpha: [true, false],
    // swatch
    swatch: [true, false],
    swatchPos: ['left', 'right'],
    swatchBootstrap: [true, false],
    swatchOnly: [true, false],
    // popup
    round: [false, true],
    pos: ['bottom left', 'bottom right', 'top left', 'top right'],
    inline: [false, true],
    horizontal: [false, true],
    // show/hide
    show: {
        swatch: [true, false],
        focus: [true, false],
    },
    hide: {
        blur: [true, false],
        escape: [true, false],
        click: [true, false],
    },
    // buttons
    close: {
        show: [false, true],
        label: 'Close',
        class: '',
    },
    clear: {
        show: [false, true],
        label: 'Clear',
        class: '',
    },
    reset: {
        show: [false, true],
        label: 'Reset',
        class: '',
    },
};

// exposed api functions
$scope.api.open();       // opens the popup
$scope.api.close();      // closes the popup
$scope.api.clear();      // removes value
$scope.api.reset();      // resets color value to original value
$scope.api.getElement(); // returns the wrapping <color-picker> element
$scope.api.getScope();   // returns the color picker $scope

// api event handlers
$scope.eventApi = {
    onChange:  function(api, color, $event) {},
    onBlur:    function(api, color, $event) {},
    onOpen:    function(api, color, $event) {},
    onClose:   function(api, color, $event) {},
    onClear:   function(api, color, $event) {},
    onReset:   function(api, color, $event) {},
    onDestroy: function(api, color) {},
};

// decorator - all variables in options can be globally overridden here
angular
    .module('app', ['color.picker'])
    .config(function($provide) {
        $provide.decorator('ColorPickerOptions', function($delegate) {
            var options = angular.copy($delegate);
            options.round = true;
            options.alpha = false;
            options.format = 'hex';
            return options;
        });
    });
```

## Requirements

* angularjs (v1.3 and higher)
* tinycolor.js (18.8 KB minified)

NO requirement for jQuery!

## Inspiration

Inspiration and code taken from projects like
* http://kaihenzler.github.io/angular-minicolors/
* http://mjolnic.github.io/bootstrap-colorpicker/
* https://github.com/buberdds/angular-bootstrap-colorpicker/
