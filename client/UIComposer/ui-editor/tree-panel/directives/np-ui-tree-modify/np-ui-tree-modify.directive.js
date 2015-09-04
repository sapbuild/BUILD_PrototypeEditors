'use strict';

var npUiTreeModify = ['npKeyboarder', 'npConstants', 'npPrototype', 'npMessaging', '$rootScope',
    function (npKeyboarder, npConstants, npPrototype, npMessaging, $rootScope) {
        return {
            restrict: 'E',
            scope: {
                item: '='
            },
            templateUrl: 'resources/norman-prototype-editors-client/UIComposer/ui-editor/tree-panel/directives/np-ui-tree-modify/np-ui-tree-modify.html',
            link: function (scope, element) {
                var kl1, kl2;
                scope.editing = false;

                var inputElement = element[0].getElementsByClassName('np-e-tree-handle-page-input-js')[0];

                scope.editPageOnTree = function () {
                    inputElement.readOnly = false;
                    inputElement.select();
                    scope.editing = true;
                };

                scope.saveDisplayName = function () {
                    if (!scope.editing) {
                        return;
                    }
                    var inputValue = inputElement.value.trim();
                    if (inputValue.length > 0) {
                        npPrototype.setPageDisplayName(scope.item.data.name, inputValue)
                            .catch(function (error) {
                                npMessaging.showError('Error: failed to rename the page', error);
                            })
                            .finally(exitEditMode);
                    }
                    else {
                        exitEditMode();
                    }
                };

                var exitEditMode = function () {
                    if (!scope.editing) {
                        return;
                    }
                    scope.editing = false;
                    inputElement.readOnly = true;
                    npPrototype.getPageDisplayName(scope.item.data.name).then(function (displayName) {
                        inputElement.value = scope.item.displayName = displayName;
                        $rootScope.$broadcast('pageRenamed', scope.item.data.name, displayName);
                    });
                };

                function onBeforeExit() {
                    npKeyboarder.off(kl1);
                    npKeyboarder.off(kl2);
                }

                function onAfterEnter() {
                    kl1 = npKeyboarder.on(npConstants.keymap.Enter, scope.saveDisplayName);
                    kl2 = npKeyboarder.on(npConstants.keymap.Escape, exitEditMode);
                }

                scope.$on('ui-composer/afterEnter', onAfterEnter);
                scope.$on('ui-composer/beforeExit', onBeforeExit);

            }
        };
    }];
module.exports = npUiTreeModify;
