'use strict';
var _ = require('norman-client-tp').lodash;

var npComponentLibraryItem = ['$log', 'npDragHelper', 'npImageHelper', '$document',
    function ($log, npDragHelper, npImageHelper, $document) {
        return {
            templateUrl: 'resources/norman-prototype-editors-client/UIComposer/ui-editor/library-panel/directives/np-component-library-item/np-component-library-item.html',
            restrict: 'E',
            scope: {
                displayName: '@',
                iconClass: '@',
                iconSrc: '@',
                type: '@'
            },
            link: function (scope, element, attrs) {
                var draggableClone = null, documentBody = angular.element($document[0].body);
                var supportedTypes = ['asset', 'control', 'binding'];
                var dragData;

                try {
                    // eval supports jsons with single quote
                    dragData = scope.$eval(attrs.dragData);
                }
                catch (err) {
                    $log.error('Error parsing drag data: ', err);
                }

                var onDragstart = function (oEvent) {
                    if (scope.type === 'asset') {
                        npImageHelper.getHotspotImageData(dragData.assetSrc)
                            .then(function (imageData) {
                                npDragHelper.startDrag(imageData, true);
                            });
                    }
                    else {
                        npDragHelper.startDrag(dragData);
                    }

                    // This is an ugly workaround to hide the drag clone as the HTML5 DnD is not able to do that properly.
                    draggableClone = event.srcElement.cloneNode(true);
                    draggableClone.style.position = 'absolute';
                    draggableClone.style.zIndex = -10;
                    draggableClone.style.width = '95%';
                    draggableClone.style.top = 0;
                    draggableClone.style.left = 0;
                    element.find('div').eq(0).append(angular.element(draggableClone));
                    oEvent.dataTransfer.setDragImage(draggableClone, 4, 4);
                    angular.element(oEvent.target).addClass('np-component-library-drag-bgd');
                    documentBody.on('dragover', onDragOver);
                    return true;
                };

                var onDragOver = function (event) {
                    event.dataTransfer.dropEffect = 'move';
                };
                var onDragend = function (event) {
                    angular.element(event.target).removeClass('np-component-library-drag-bgd');
                    angular.element(draggableClone).remove();
                    draggableClone = null;
                    documentBody.off('dragover', onDragOver);
                    npDragHelper.endDrag();
                };


                if (!_.isEmpty(dragData) && _.contains(supportedTypes, scope.type)) {
                    element.on('dragstart', onDragstart);
                    element.on('dragend', onDragend);
                }
                else {
                    $log.warn('not supported library item type', scope.type, dragData);
                }
            }
        };
    }
];

module.exports = npComponentLibraryItem;
