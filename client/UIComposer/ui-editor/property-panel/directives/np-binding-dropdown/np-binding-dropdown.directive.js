'use strict';
var _ = require('norman-client-tp').lodash;

module.exports = ['$rootScope', '$document', '$timeout', function ($rootScope, $document, $timeout) {
    return {
        restrict: 'E',
        templateUrl: 'resources/norman-prototype-editors-client/UIComposer/ui-editor/property-panel/directives/np-binding-dropdown/np-binding-dropdown.html',
        replace: true,
        require: 'ngModel',
        scope: {
            list: '=',
            listItemField: '@',
            npValue: '=',
            npPropertyName: '=',
            npIsSmartApp: '=',
            npPropertyIsBound: '=',
            npMainEntity: '=',
            onBlur: '&',
            onKeydown: '&'
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

            scope.unbind = false;
            scope.select.show = false;
            scope.select.instanceId = 'inst-' + _generateGuid();

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
                scope.displayMoreItems = false;
                scope.select.show = false;
                scope.$digest();
                unbindEvents();
            };


            /**
             * Parse provided index in order to form selected object
             */
            var parseSelected = function () {
                ngModelCtrl.$render = function () {
                    scope.select.selected = ngModelCtrl.$modelValue || '';
                    setFirstGroup();
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

            scope.changePropertyValue = function () {
                if (scope.changedProperty) {
                    scope.changedProperty = false;
                    scope.select.selected = undefined;
                    scope.onBlur();
                    setFirstGroup();
                }
            };

            var lastSelectedNavPropMap = {};

            scope.setMainObject = function (evt, mainObj, clicked, changeCurEnt) {
                evt.stopPropagation();
                var navProp;
                navProp = mainObj[0].navPropName;

                if (clicked) {
                    scope.currentObject = mainObj;
                    if (scope.currentProperty && scope.currentObject[0].entityName === scope.currentProperty.entityName) {
                        scope.currentProperty = _.find(scope.currentObject, function (prop) {
                            return prop.name === scope.currentProperty.name;
                        });
                    }
                }
                else {
                    if (scope.currentProperty && scope.currentProperty.entityName === mainObj[0].entityName) {
                        navProp = scope.currentProperty.navPropName;
                    }
                    else if (lastSelectedNavPropMap[mainObj[0].entityName]) {
                        navProp = lastSelectedNavPropMap[mainObj[0].entityName];
                    }
                    scope.currentObject = _.filter(mainObj, function (obj) {
                        return obj.navPropName === navProp;
                    });
                }
                scope.currentNavProp = navProp ? navProp : scope.currentObject[0].navPropName;
                lastSelectedNavPropMap[scope.currentObject[0].entityName] = scope.currentNavProp;
                if (changeCurEnt) {
                    scope.currentEntities = mainObj;
                }
            };

            scope.selectProperty = function (property) {
                scope.currentProperty = property;
                scope.currentPropertyRadio = property.entityName + property.name;
            };

            scope.multipleRelations = function (entity) {
                var relationName = entity[0].navPropName;
                var result = false;

                for (var ind = 0; ind < entity.length; ind++) {
                    if (entity[ind].navPropName !== relationName) {
                        result = true;
                        break;
                    }
                }

                return result;
            };

            scope.selectItem = function (index) {
                if (typeof index === 'number') {
                    scope.select.selected = scope.list[index];
                    scope.npPropertyIsBound = true;
                    ngModelCtrl.$setViewValue(scope.select.selected);
                    setFirstGroup();
                }
            };

            scope.addCustomValue = function (evt) {
                scope.onKeydown();
                if (evt.keyCode === 13) {
                    scope.changePropertyValue();
                }
                else {
                    scope.changedProperty = true;
                    scope.npPropertyIsBound = false;
                }
            };

            scope.openPopup = function (event) {
                $rootScope.$broadcast('dialog-open', {
                    elementId: 'npBindingModal' + scope.select.instanceId,
                    elem: [event.srcElement.parentElement]
                });
                setCurrentPopupSelection();
            };

            scope.unbindProp = function () {
                scope.select.selected = undefined;
                scope.npPropertyIsBound = false;
                scope.changedProperty = false;
                scope.npValue = '';

                // Need timeout to wait for scope to digest before calling onBlur()
                $timeout(function () {
                    scope.onBlur();
                    scope.$apply();
                    $timeout(setFocus, 0);
                }, 0);
            };

            var setFocus = function () {
                var input = document.querySelector('#property-input-' + scope.select.instanceId);
                if (input && input.focus) {
                    input.focus();
                }
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

            for (var i = 0; i < scope.list.length; i++) {
                if (scope.list[i].group) {
                    scope.list[i].index = i;
                }
            }

            var setCurrentPopupSelection = function () {
                var entity, navProp, property;

                if (scope.select.selected) {
                    entity = scope.select.selected.entityName;
                    navProp = scope.select.selected.navPropName;
                    property = scope.select.selected.name;
                }
                else {
                    entity = scope.list[0].entityName;
                    navProp = scope.list[0].navPropName;
                }

                scope.currentNavProp = navProp;
                scope.currentPropertyRadio = entity + property;
                scope.currentEntities = _.filter(scope.list, function (element) {
                    return element.entityName === entity;
                });
                scope.currentObject = _.filter(scope.list, function (element) {
                    return element.entityName === entity && element.navPropName === navProp;
                });
                scope.currentProperty = _.find(scope.list, function (element) {
                    return element.entityName === entity && element.navPropName === navProp && element.name === property;
                });
            };

            var setFirstGroup = function () {
                scope.items = angular.copy(scope.list);
                scope.moreItems = scope.items.filter(function (item) {
                    if (!scope.select.selected && !item.isEntity) {
                        return !item.isCurrentEntity;
                    }
                    return item.group !== scope.select.selected.group && !item.isEntity;
                });
                scope.items = scope.items.filter(function (item) {
                    if (!scope.select.selected) {
                        if (!scope.currentEntity && item.isCurrentEntity) {
                            scope.currentEntity = item.entityName;
                        }
                        return item.isCurrentEntity || item.isEntity;
                    }
                    return item.isEntity || item.group === scope.select.selected.group;
                });
                scope.displayMoreItems = false;
            };


            scope.isSameEntity = function (entities1, entities2) {
                var result = false;
                if (!_.isEmpty(entities1) && !_.isEmpty(entities2)) {
                    var entityName = entities1[0].entityName;
                    result = _.every(entities1, 'entityName', entityName) && _.every(entities2, 'entityName', entityName);
                }
                return result;
            };

            scope.toggleMoreItems = function (evt) {
                // $rootScope.$broadcast('dialog-open', 'bindMoreObjectsModal-' + scope.select.instanceId);
                evt.stopPropagation();
                scope.displayMoreItems = !scope.displayMoreItems;
            };

            scope.$on('$destroy', unbindEvents);

        }
    };
}];
