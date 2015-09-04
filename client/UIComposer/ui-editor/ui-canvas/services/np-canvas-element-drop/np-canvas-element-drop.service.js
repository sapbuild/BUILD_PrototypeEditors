'use strict';

var _ = require('norman-client-tp').lodash;

/**
 * The npCanvasElementDrop service is used to handle the drop of new controls in to the canvas or existing controls
 * within the canvas based on the drop position.
 * @module npCanvasElementDrop
 */

/**
 * @typedef {Object} DropData
 * @memberof npCanvasElementDrop
 * @description contains parentId, groupId, index
 * @param {string} parentId
 * @param {string} groupId
 * @param {int} [index]
 */
var npCanvasElementDrop = ['$window', '$rootScope', '$q', '$log', 'npGrid', 'npBindingHelper', 'npPageMetadata', 'npPageMetadataHelper', 'npUiCatalog', 'npFormFactor', 'npPageMetadataEvents', 'npLayoutHelper', 'npUiCanvasAPI',
    function ($window, $rootScope, $q, $log, npGrid, npBindingHelper, npPageMetadata, npPageMetadataHelper, npUiCatalog, npFormFactor, pageMdEvents, npLayoutHelper, npUiCanvasAPI) {

        var self = this;

        /**
         * @name getDropData
         * @description Returns the parentId, groupId, index where the controlMd can be dropped.
         * If targetMd accepts controlMd into his default aggregation, it will be the parentId.
         * Otherwise, it is assumed that the targetMd parent accepts controlMd.
         * Will return undefined if no group is found
         * @param {object} controlMd
         * @param {object} targetMd
         * @returns {DropData|undefined}
         */
        self.getDropData = function (controlMd, targetMd) {
            if (!targetMd) {
                return undefined;
            }
            var parentId = targetMd.controlId,
                groupId = npUiCatalog.getControlDefaultAggregation(targetMd.catalogControlName, targetMd.catalogId),
                index;

            // if it cannot be put into the default aggregation, try to put as sibling of the target
            if (_.isEmpty(groupId) || !npUiCatalog.isControlValidInAggregation(controlMd.catalogControlName, controlMd.catalogId, targetMd.catalogControlName, targetMd.catalogId, groupId)) {
                // TODO check if parent accepts controlMd
                parentId = targetMd.parentControlId;
                groupId = targetMd.parentGroupId;
                if (!npLayoutHelper.isAbsoluteLayout() || !targetMd.isRootChild()) {
                    index = targetMd.parentGroupIndex;
                }
            }
            // null means the control cannot be dropped anywhere
            if (_.isEmpty(groupId) || _.isEmpty(parentId)) {
                return undefined;
            }
            return {
                parentId: parentId,
                groupId: groupId,
                index: index
            };
        };

        var getMd = function (controlMd, targetMd, positionData) {
            positionData = positionData || {};
            var dropData = self.getDropData(controlMd, targetMd);
            // null means the control cannot be dropped anywhere
            if (_.isEmpty(dropData)) {
                $log.error('npCanvasElementDrop: cannot insert control into target', controlMd, targetMd, positionData);
                return undefined;
            }

            // case where the control should maintain its old index
            if (dropData.index === undefined && controlMd.parentControlId === dropData.parentId && controlMd.parentGroupId === dropData.groupId) {
                dropData.index = controlMd.parentGroupIndex;
            }
            return {
                controlId: controlMd.controlId,
                newCtrlCatalogName: controlMd.catalogControlName,
                catalogId: controlMd.catalogId,
                parentId: dropData.parentId,
                groupId: dropData.groupId,
                index: dropData.index,
                x: positionData.x,
                y: positionData.y,
                // TODO check if this can be done in 2 separate udpates. Currently needed for image drop only
                properties: controlMd.properties
            };
        };

        /**
         * @private
         * @description given a value, ensures it stays within boundaries of the canvas
         */
        var normalizeValue = function (value, canvasSize, elementSize) {
            elementSize = _.parseInt(elementSize);
            var minValue = 0;
            var maxValue = Math.max(minValue, canvasSize - elementSize);
            return Math.min(maxValue, Math.max(value, minValue));
        };

        /**
         * @private
         * @description Moves the element completely into canvas in case part of it is out of canvas bounds after dropping it
         */
        var moveToPosition = function (addedControl, position) {
            var gridElement = npGrid.getElementForControlId(addedControl.controlId);
            if (_.isEmpty(gridElement)) {
                return $q.reject('grid element not found for control', addedControl.controlId);
            }
            var currentFormFactor = npFormFactor.getCurrentFormFactor();

            position.x = normalizeValue(position.x, _.parseInt(currentFormFactor.width), _.parseInt(gridElement.style.width));
            position.y = normalizeValue(position.y, _.parseInt(currentFormFactor.height), _.parseInt(gridElement.style.height));

            return npPageMetadata.moveControl({
                controlId: gridElement.controlMd.controlId,
                parentId: gridElement.controlMd.parentControlId,
                groupId: gridElement.controlMd.parentGroupId,
                index: gridElement.controlMd.parentGroupIndex,
                x: position.x,
                y: position.y
            }, {
                combineWithPreviousOperation: true
            });
        };

        var _bindProperty = function (controlMd, propertyDef, combineWithPreviousOperation) {
            var options = combineWithPreviousOperation ? {combineWithPreviousOperation: combineWithPreviousOperation} : undefined;
            return npPageMetadata.changeProperty({
                controlId: controlMd.controlId,
                properties: [propertyDef]
            }, options);
        };

        var _bindEntity = function (parentControlMd, groupMd, compatiblePaths, autoBind) {
            var bindingData = {
                controlId: parentControlMd.controlId,
                groupId: groupMd.groupId,
                binding: compatiblePaths[0].binding,
                autoBind: !!autoBind
            };

            var isBound = npPageMetadataHelper.isBound(groupMd);
            if (isBound) {
                // Update the group binding
                return npPageMetadata.changeControlBinding(bindingData);
            }
            else {
                // always use the first item in the items collection as the template
                var templateIndex = (groupMd.groupId === 'items') ? 0 : parentControlMd.parentGroupIndex;
                bindingData.childToUseAsTemplateIndex = templateIndex;

                // Bind the group
                return npPageMetadata.bindControl(bindingData);
            }
        };

        var getPropertyDef = function (editableProperty, compatiblePropertyPaths) {
            var result;
            if (!_.isEmpty(compatiblePropertyPaths) && !_.isEmpty(editableProperty)) {
                result = {
                    name: editableProperty.name,
                    binding: compatiblePropertyPaths[0].binding
                };
            }
            return result;
        };

        /**
         * @name dropBindingAtControl
         * @description Handles the dropping of model entities or properties on the canvas based on provided drag data.
         * @param {object} dragData Object that can contain the following properties
         * @param {Object} targetMd
         */
        var dropBindingAtTarget = function (dragData, targetMd, positionData) {
            if (_.isEmpty(targetMd)) {
                return $q.reject('Control cannot be dropped here.');
            }
            return npPageMetadata.getMainEntity().then(function (mainEntity) {
                var editableProperty = npUiCanvasAPI.getEditablePropertyAtPosition(targetMd, positionData.x, positionData.y);
                var contextEntity = npBindingHelper.getContextEntity(targetMd, mainEntity);
                var compatiblePaths = npBindingHelper.getPathsCompatibleWithParentGroup(targetMd, dragData.entityName, mainEntity);
                var compatiblePropertyPaths, propertyDef;

                if (contextEntity) {
                    compatiblePropertyPaths = npBindingHelper.getPathsCompatibleWithControlProperty(targetMd, contextEntity._id, editableProperty, dragData.entityId, dragData.propertyId);
                }

                if (!_.isEmpty(compatiblePropertyPaths)) {
                    // Bind the dropped property on the property editableProperty (they are compatible)
                    propertyDef = getPropertyDef(editableProperty, compatiblePropertyPaths);
                    return _bindProperty(targetMd, propertyDef);
                }
                else if (!_.isEmpty(compatiblePaths)) {
                    // Found a binding from dragData.entityId to bind the parent group
                    var onlyParent = !dragData.propertyId; // if we drop a property, check only if the parent can be bound, not an ancestor
                    var ancestorAndGroup = npBindingHelper.getFirstBindableAncestorAndGroup(targetMd, onlyParent);
                    if (dragData.propertyId && editableProperty) {
                        compatiblePropertyPaths = npBindingHelper.getPathsCompatibleWithControlProperty(targetMd, dragData.entityId, editableProperty, dragData.entityId, dragData.propertyId);
                    }
                    if (ancestorAndGroup && !dragData.propertyId || (!_.isEmpty(compatiblePropertyPaths) && !npPageMetadataHelper.isBound(ancestorAndGroup.ancestorGroupMd))) {
                       // We dropped an entity on a control (no property dropped)
                        // or
                       // we dropped a property on a control property editableProperty and the property can be bound if
                       //   we first bind the parent group (but only if this group is not yet bound, to avoid changing too many things)
                        if (!_.isEmpty(compatiblePropertyPaths) && !npPageMetadataHelper.isBound(ancestorAndGroup.ancestorGroupMd)) {
                            // Can bind the property
                            propertyDef = getPropertyDef(editableProperty, compatiblePropertyPaths);
                        }
                        // autobind if no drop on a control property
                        var autoBind = !propertyDef;
                        var promise = _bindEntity(ancestorAndGroup.ancestorControlMd, ancestorAndGroup.ancestorGroupMd, compatiblePaths, autoBind);
                        if (propertyDef) {
                            promise = promise.then(function () {
                                return _bindProperty(targetMd, propertyDef, true);
                            });
                        }
                        return promise;
                    }
                }
            });
        };
        var waitForLayoutUpdated = function () {
            var deferred = $q.defer();
            var layoutReadyListener = $rootScope.$on('npGrid/layoutUpdated', function () {
                layoutReadyListener();
                deferred.resolve();
            });
            return deferred.promise;
        };

        var dropControlAtTarget = function (controlData, targetMd, position) {
            position = position || {};
            var md = getMd(controlData, targetMd);
            if (!md) {
                return $q.reject('Control cannot be dropped here.');
            }
            return npPageMetadata.addControl(md)
                .then(function (addedControls) {
                    if (_.isEmpty(position)) {
                        return addedControls;
                    }
                    return waitForLayoutUpdated()
                        .then(function () {
                            return moveToPosition(addedControls[0], position);
                        })
                        .then(function () {
                            $window.focus();
                            return addedControls;
                        });
                });
        };

        /**
         * @name dropAtTarget
         * @description Handles the dropping of elements on the canvas based on provided drag data.
         * @param {object} dragData Object that can contain the following properties
         * @param {Object} targetMd
         * @param {Object} positionData
         * ie. x: x mouse position, y: y mouse position
         */
        self.dropAtTarget = function (dragData, targetMd, positionData) {
            if (_.isEmpty(targetMd)) {
                return $q.reject('Control cannot be dropped here.');
            }
            if (dragData.isBinding) {
                return dropBindingAtTarget(dragData, targetMd, positionData);
            }
            return dropControlAtTarget(dragData, targetMd, positionData);
        };

        self.moveAtTarget = function (controlMd, targetMd, positionData) {
            if (_.isEmpty(targetMd)) {
                return $q.reject('Control cannot be moved here.');
            }
            var md = getMd(controlMd, targetMd, positionData);
            if (!md) {
                return $q.reject('Control cannot be moved here.');
            }
            return npPageMetadata.moveControl(md);
        };

        return self;
    }
];

module.exports = npCanvasElementDrop;
