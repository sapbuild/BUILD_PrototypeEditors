'use strict';

var _ = require('norman-client-tp').lodash;

var npCopyPaste = ['npGrid', 'npCanvasElementDrop', 'npKeyboarder', 'npConstants', 'npPageMetadata', 'npMessaging',
    function (npGrid, npCanvasElementDrop, npKeyboarder, npConstants, npPageMetadata, npMessaging) {
        var selectedElementsMd;
        return {
            restrict: 'A',

            link: function (scope) {
                var keyboardListeners = [];

                var copy = function () {
                    selectedElementsMd = npGrid.getSelectedElements().map(function (gridElement) {
                        return gridElement.controlMd;
                    });
                };

                var paste = function () {
                    var cloneControlDefs = [];
                    var targetMd = npGrid.getSelectedElements().pop().controlMd;

                    _.forEach(selectedElementsMd, function (controlMd) {
                        var dropData = npCanvasElementDrop.getDropData(controlMd, targetMd);
                        if (dropData) {
                            var controlDef = _.extend({controlMd: controlMd}, dropData);
                            cloneControlDefs.push(controlDef);
                        }
                    });

                    if (cloneControlDefs.length !== selectedElementsMd.length) {
                        npMessaging.showError('Cannot paste controls');
                    }
                    else {
                        npPageMetadata.addControlByCloning(cloneControlDefs, {targetPage: npPageMetadata.getCurrentPageName()})
                            .then(function (controlsMd) {
                                npGrid.setSelectedElements([npGrid.getElementForControlId(controlsMd[0].controlId)], false);
                                selectedElementsMd = [controlsMd[0]];
                            });
                    }
                };

                function onBeforeExit() {
                    _.forEach(keyboardListeners, function (listener) {
                        npKeyboarder.off(listener);
                    });
                }

                function onAfterEnter() {
                    keyboardListeners.push(npKeyboarder.on(npConstants.keymap.c, copy, [npConstants.modifierKeys.Meta], [npConstants.os.MacOS]));
                    keyboardListeners.push(npKeyboarder.on(npConstants.keymap.c, copy, [npConstants.modifierKeys.Control], [npConstants.os.Windows, npConstants.os.Linux]));
                    keyboardListeners.push(npKeyboarder.on(npConstants.keymap.v, paste, [npConstants.modifierKeys.Meta], [npConstants.os.MacOS]));
                    keyboardListeners.push(npKeyboarder.on(npConstants.keymap.v, paste, [npConstants.modifierKeys.Control], [npConstants.os.Windows, npConstants.os.Linux]));
                }

                scope.$on('ui-composer/afterEnter', onAfterEnter);
                scope.$on('ui-composer/beforeExit', onBeforeExit);
            }
        };
    }
];

module.exports = npCopyPaste;
