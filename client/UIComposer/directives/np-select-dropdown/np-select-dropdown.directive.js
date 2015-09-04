'use strict';

var _ = require('norman-client-tp').lodash;

/**
 * Select drop-down directive. Alternative for native select directive.
 *
 * @param {array} list - All items in form of an array that should be displayed in the drop-down list.
 *                       If the list contains simple elements like strings you don't need the listItemKey and listItemLabel value.
 * @param {string} listItemKey - The name of the key of the value in the list.
 * @param {string} listItemLabel - The name of the label of value in the list.
 * @param {string} ngModel - If list is an array of strings it would be an item of the list.
 *                           If list is an array of objects it would the key of a list item if the listItemKey is set. Otherwise an object of the list.
 *
 * For example for the the list [ { 'id' : 1, 'label' : 'Hansi' }, { 'id' : 2, 'label' : 'Holger' } ]
 * the listItemKey would be 'id' and the listItemLabel would be 'label'.
 */
module.exports = ['$document', function ($document) {
    return {
        restrict: 'E',
        templateUrl: 'resources/norman-prototype-editors-client/UIComposer/directives/np-select-dropdown/np-select-dropdown.html',
        replace: true,
        require: 'ngModel',
        scope: {
            list: '=',
            listItemKey: '@',
            listItemLabel: '@',
            listItemDefaultName: '@'
        },
        link: function (scope, element, attrs, ngModelCtrl) {

            var _generateGuid = function () {
                function s4() {
                    return Math.floor((1 + Math.random()) * 0x10000)
                        .toString(16)
                        .substring(1);
                }
                return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
                    s4() + '-' + s4() + s4() + s4();
            };

            scope.select = {};

            scope.select.show = false;
            scope.select.instanceId = 'inst-' + _generateGuid();

            scope.getItemLabel = function (value) {
                if (value && _.isObject(value) && scope.listItemLabel) {
                    return _.get(value, scope.listItemLabel);
                }
                return value;
            };

            var setSelected = function (selectedItem) {
                scope.select.selected = selectedItem;
                if (selectedItem) {
                    scope.select.selectedLabel = scope.getItemLabel(selectedItem);
                }
                else if (!selectedItem && scope.listItemDefaultName) {
                    scope.select.selectedLabel = scope.listItemDefaultName;
                }

            };

            /**
             * Check if clicked outside the currently active select box
             *
             * @param e
             * @returns {boolean}
             */
            var clickHandler = function (e) {
                var $element = angular.element(e.target);
                var targetId = $element.attr('id');
                if (scope.select.instanceId === targetId) {
                    return false;
                }
                scope.select.show = false;
                scope.$digest();
                unbindEvents();
            };


            /**
             * Parse provided index in order to form selected object
             */
            var parseSelected = function () {
                ngModelCtrl.$render = function () {
                    var selectedItem = ngModelCtrl.$modelValue;
                    if (selectedItem && scope.listItemKey) {
                        selectedItem = _.find(scope.list, function (item) {
                            return item[scope.listItemKey] === selectedItem;
                        });
                    }
                    setSelected(selectedItem || '');
                };
            };

            /**
             * Toggle drop-down list visibility
             *
             */

            scope.toggleList = function () {
                scope.select.show = !scope.select.show;
                if (scope.select.show) {
                    $document.bind('click', clickHandler);
                }
                else {
                    unbindEvents();
                }
            };

            /**
             * Select an item and run parent handler if provided

             */

            scope.selectItem = function (index) {
                var selectedValue = scope.list[index];
                setSelected(selectedValue);
                if (this.listItemKey) {
                    selectedValue = selectedValue[this.listItemKey];
                }
                ngModelCtrl.$setViewValue(selectedValue);
            };

            ngModelCtrl.$viewChangeListeners.push(function () {
                scope.$eval(attrs.ngChange);
            });

            /* init parse selected */
            parseSelected();

            /* watch if list is asynchronously loaded */

            scope.$watch('list.length', function (n, o) {
                if (n !== o) {
                    parseSelected();
                }
            });

            var unbindEvents = function () {
                $document.unbind('click', clickHandler);

            };

            scope.$on('$destroy', unbindEvents);

        }
    };
}];
