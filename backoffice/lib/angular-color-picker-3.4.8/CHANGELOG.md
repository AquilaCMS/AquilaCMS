# Changelog

This is a summary of the changes. For a full list of changes see https://github.com/ruhley/angular-color-picker/releases.

## v3.4.8

#### Breaking Changes
  * None

#### New Features
  * Feature #176 - Adding `dynamicHue`, `dynamicSaturation`, `dynamicLightness`, and `dynamicAlpha` options for the sliders

#### Bug Fixes
  * None

## v3.4.7

#### Breaking Changes
  * None

#### New Features
  * None

#### Bug Fixes
  * Fixing up clear and reset buttons for initial values that are not set when color picker is initialised

## v3.4.6

#### Breaking Changes
  * None

#### New Features
  * None

#### Bug Fixes
  * Bug #170 - Internal model not updating when changed programmatically

## v3.4.5

#### Breaking Changes
  * None

#### New Features
  * Call update function when closing popup
  * Rewrote some sections to reduce code duplication and file size by over 10%

#### Bug Fixes
  * Bug #146 - Sliders no longer lose position when going to black or white
  * Bug #173 - Unable to Use hexString Format with restrictToFormat
  * Bug #174 - Clicking on swatch when disabled still opens popup

## v3.4.4

#### Breaking Changes
  * None

#### New Features
  * None

#### Bug Fixes
    * Bug #169 - Initial colors could be wrong

## v3.4.3

#### Breaking Changes
  * None

#### New Features
  * None

#### Bug Fixes
  * Bug #167 - Cannot read property 'updateOn' of undefined `ngModelOptions`
  * Fixing up getterSetter = true setting internal ngModel to a function

## v3.4.2

#### Breaking Changes
  * None

#### New Features
  * Feature #160 - Support `ng-model-options="{getterSetter:true}"`
  * Feature #164 - Add `preserveInputFormat` option to control whether or not a valid input color of a different format should change to the configured format. For a visual explanation see https://github.com/ruhley/angular-color-picker/pull/164

#### Bug Fixes
  * Bug #161 - Format option is now case insensitive

## v3.4.1

#### Breaking Changes
  * None

#### New Features
  * None

#### Bug Fixes
  * Bug #159 - Fixing slider positioning in grid

## v3.4.0

#### Breaking Changes
  * None

#### New Features
  * Feature #158 - New option for `horizontal` sliders

#### Bug Fixes
  * None

## v3.3.0

#### Breaking Changes
  * `hex` and `hex8` formats are now returning the hex value without the hash `#` character.

#### New Features
  * Now supporting values with and without the `#` for both hex and hex8 formats.

#### Bug Fixes
  * None

## v3.2.1

#### Breaking Changes
  * None

#### New Features
  * None

#### Bug Fixes
  * Bug #153 Hue selector reset to 0 after closing picker and reopening
  * Bug #154 Conflict with angular animate

## v3.2.0

#### Breaking Changes
  * None

#### New Features
  * Feature #149 New `allowEmpty` option for validation

#### Bug Fixes
  * Bug #150 Field wasn't always being set to dirty
  * Bug #152 Improve slider background colors to be more accurate
  * Bug #149 Fix validation field being set to `undefined`

## v3.1.2

#### Breaking Changes
  * None

#### New Features
  * None

#### Bug Fixes
  * Bug #148 Color picker hue looks empty on IE

## v3.1.1

#### Breaking Changes
  * None

#### New Features
  * None

#### Bug Fixes
  * Bug #147 Switching from focus/blur to focusin/focusout for IE compatibility - https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/101237/

## v3.1.0

#### Breaking Changes
  * Changing `input_class` to camel case `inputClass` to match the other options

#### New Features
  * Feature #145 New `restrictToFormat` option

#### Bug Fixes
  * Bug #144 remove color string limit of 4 characters

## v3.0.1

#### Breaking Changes
  * None

#### New Features
  * None

#### Bug Fixes
  * Bug #142 Explicitly specify that saturation and lightness are percentages
  * Bug #143 Gradient shown below picker in Firefox

## v3.0.0

#### Breaking Changes
  * Removed the bootstrap `form-control` class from the input box. You can add it to all color pickers again using the `ColorPickerOptions` decorator.
  * The hue and saturation controls are now no longer hidden if the round option is changed.

#### New Features
  * New `input_class` option
  * The styles of all the controls now change when the values of other controls change
  * Optimised the css to be 1/4 of the file size
  * Added `raw` format option

#### Bug Fixes
  * #136 swatch color not matching picker color
  * #138 missing qoutes within template

## v2.7.1

#### Breaking Changes
  * None

#### New Features
  * None

#### Bug Fixes
  * Bug #127 add default lightness for round color picker

## v2.7.0

#### Breaking Changes
  * None

#### New Features
  * Feature #126 Add open/closed class
  * Feature #125 add show/hide control

#### Bug Fixes
  * None

## v2.6.2

#### Breaking Changes
  * None

#### New Features
  * None

#### Bug Fixes
  * Bug #124 remove some rounding that could interfere when translating between color types

## v2.6.1

#### Breaking Changes
  * None

#### New Features
  * None

#### Bug Fixes
  * Bug #123 Add type to buttons to not interfere with form submit buttons

## v2.6.0

#### Breaking Changes
  * None

#### New Features
  * New saturation and lightness options

#### Bug Fixes
  * Bug #120 - Set $touched on blur
  * Fixing up color calculation in the differences between square and round

## v2.5.0

#### Breaking Changes
  * None

#### New Features
  * Improvement #116 Allow access to $scope

#### Bug Fixes
  * None

## v2.4.8

#### Breaking Changes
  * None

#### New Features
  * None

#### Bug Fixes
  * Bug #115 - Touch events not getting proper position

## v2.4.7

#### Breaking Changes
  * None

#### New Features
  * Pressing escape will close the popup panel

#### Bug Fixes
  * Bug #113 - Tab focus opens panel, tab blur does not close it

## v2.4.6

#### Breaking Changes
  * None

#### New Features
  * None

#### Bug Fixes
  * Bug #109 - Properly remove event listeners on destroy

## v2.4.5

#### Breaking Changes
  * None

#### New Features
  * Added `id` and `name` to the options object

#### Bug Fixes
  * None

## v2.4.4

#### Breaking Changes
  * None

#### New Features
  * None

#### Bug Fixes
  * Bug - First change event was not firing if mouse drag

## v2.4.3

#### Breaking Changes
  * None

#### New Features
  * None

#### Bug Fixes
  * Bug #103 error creating options if none provided

## v2.4.2

#### Breaking Changes
  * None

#### New Features
  * None

#### Bug Fixes
  * Bug #102 non assign error if options was set in html

## v2.4.1

#### Breaking Changes
  * None

#### New Features
  * New `required` option

#### Bug Fixes
  * None

## v2.4.0

#### Breaking Changes
  * None

#### New Features
  * New `ColorPickerOptions` decorator

#### Bug Fixes
  * Add import for `tinycolor` for webpack

## v2.3.0

#### Breaking Changes
  * None

#### New Features
  * New `round` option to show a round color picker

#### Bug Fixes
  * None

## v2.2.0

#### Breaking Changes
  * None

#### New Features
  * New `hue` option to show or hide the hue selector
  * New `close`, `clear` and `reset` options to show extra buttons

#### Bug Fixes
  * Bug #82 Support touch events

## v2.1.6

#### Breaking Changes
  * None

#### New Features
  * None

#### Bug Fixes
  * Bug #92 Fire click would trigger onChange twice

## v2.1.5

#### Breaking Changes
  * None

#### New Features
  * None

#### Bug Fixes
  * Bug #91 setDirty being called on instantiation

## v2.1.4

#### Breaking Changes
  * None

#### New Features
  * New `placeholder` option

#### Bug Fixes
  * None

## v2.1.3

#### Breaking Changes
  * None

#### New Features
  * None

#### Bug Fixes
  * Don't presume a default color

## v2.1.2

#### Breaking Changes
  * None

#### New Features
  * None

#### Bug Fixes
  * Delaying init until directive link function, to fix a bug in complex multi color picker pages

## v2.1.1

#### Breaking Changes
  * None

#### New Features
  * None

#### Bug Fixes
  * #87 fixing onBlur and onClose
  * #88 Fixing hue updating when moving in grid on rgb and hex

## v2.1.0

#### Breaking Changes
  * Seperated the `api` into `api` and `eventApi`. This allows for shared event handling
    * `api` now has `open`, `close`, and `getElement`
    * `eventApi` now has `onOpen`, `onClose`, `onChange`, `onBlur`, and `onDestroy`

#### New Features
  * `api` has a new `getElement` function
  * `eventApi` functions now all have `api` and `color` passed in as the first arguments, and `event` if it is available

#### Bug Fixes
  * None

## v2.0.0

#### Breaking Changes

  * All the directive bindings are now passed in as an `options` object. The functionality has stayed the same and the names are the same but without `color-picker` at the front (e.g. `color-pick-swatch-pos` is now just `swatchPos`).

#### New Features
  * New `api` binding is available. It exposes `open` and `close` and can handle `onOpen`, `onClose`, `onChange`, `onBlur`, and `onDestroy` events.

#### Bug Fixes
  * None
