'use strict';

var _ = require('norman-client-tp').lodash;

/**
 * The npGridPosition service helps retrieving grid elements at a certain position
 * @namespace npGridPosition
 */

var npGridPosition = ['npGrid', 'npPageMetadata', 'npPageMetadataHelper', 'npUiCatalog', 'npLayoutHelper', 'npUiCanvasAPI', 'npBindingHelper', 'npPageMetadataEvents',
    function (npGrid, npPageMetadata, npPageMetadataHelper, npUiCatalog, npLayoutHelper, npUiCanvasAPI, npBindingHelper, npPageMetadataEvents) {

        /**
         * @name getElementsAtPosition
         * @memberof npGridPosition
         * @description Get all grid elements (including child elements) at a certain position.
         * @param {number} x x-coordinate
         * @param {number} y y-coordinate
         * @param {boolean} [invertRootChildrenOrder]
         * @returns {GridElement[]} Array of grid elements at certain location. Elements further back in the array are at a deeper child level
         * (e.g. [topLevelElement, 1stLevelChild, 2ndLevelChild, ...].
         */
        var getElementsAtPosition = function (x, y, invertRootChildrenOrder) {
            var root = npGrid.getRootElement(),
                elementsAtPos = [],
                traverseDeep = function (elements, startFromRight) {
                    var fn = startFromRight ? _.forEachRight : _.forEach;
                    fn(elements, function (element) {
                        if (containsPoint(element, x, y)) {
                            elementsAtPos.push(element);
                        }
                        traverseDeep(element.children);
                    });
                };
            if (containsPoint(root, x, y)) {
                elementsAtPos.push(root);
            }
            traverseDeep(root.children, !!invertRootChildrenOrder);
            return elementsAtPos;
        };

        /**
         * @name containsPoint
         * @memberof npGridPosition
         * @description returns if the point x,y is into the element area if element is not dragged
         * @param {GridElement} element
         * @param {number} x coordinate
         * @param {number} y coordinate
         * @returns {boolean} containsPoint
         */
        var containsPoint = function (element, x, y) {
            if (!element || element.isDragged() || !element.style) {
                return false;
            }
            var top = _.parseInt(element.style.top),
                left = _.parseInt(element.style.left),
                bottom = top + _.parseInt(element.style.height),
                right = left + _.parseInt(element.style.width);

            return top <= y && bottom >= y && left <= x && right >= x;
        };


        var isChildOfDraggedElement = function (elem) {
            if (_.isEmpty(elem)) {
                return false;
            }
            if (elem.isDragged()) {
                return true;
            }
            return isChildOfDraggedElement(npGrid.getElement(elem.parentId));
        };

        /**
         * @name getSiblingAtPosition
         * @memberof npGridPosition
         * @description Get deepest grid element at a certain position which is a valid sibling of the passed element.
         * A valid sibling has a parent that accepts the passed element, or is contained in a group that accepts the passed element.
         * @param {Object} controlData
         * @param {number} x x-coordinate
         * @param {number} y y-coordinate
         * @returns {GridElement|undefined} sibling
         */
        var getSiblingAtPosition = function (controlData, x, y) {
            var elements = getElementsAtPosition(x, y);
            return _.findLast(elements, function (elem) {
                if (controlData.isBinding) {
                    return hasBindingAtPosition(controlData, elem.controlMd, x, y);
                }
                return isValidSibling(controlData, elem, x, y);
            });
        };

        var mainEntity;
        var setupMainEntity = function () {
            npPageMetadata.getMainEntity()
                .then(function (entityId) {
                    mainEntity = entityId;
                })
                .catch(function () {
                    mainEntity = undefined;
                });
        };

        npPageMetadataEvents.listen(npPageMetadataEvents.events.mainEntityChanged, setupMainEntity);
        npPageMetadataEvents.listen(npPageMetadataEvents.events.pageChanged, setupMainEntity);

        function hasBindingAtPosition(bindingData, targetMd, elementX, elementY) {
            var result = false;
            var editableProperty = npUiCanvasAPI.getEditablePropertyAtPosition(targetMd, elementX, elementY);
            var contextEntity = npBindingHelper.getContextEntity(targetMd, mainEntity);
            var compatiblePropertyPaths;

            if (contextEntity) {
                compatiblePropertyPaths = npBindingHelper.getPathsCompatibleWithControlProperty(targetMd, contextEntity._id, editableProperty, bindingData.entityId, bindingData.propertyId);
            }

            if (!_.isEmpty(compatiblePropertyPaths)) {
                // Found compatible bindings, so we can bind the property
                result = true;
            }
            else {
                var compatiblePaths = npBindingHelper.getPathsCompatibleWithParentGroup(targetMd, bindingData.entityName, mainEntity);
                var onlyParent = !bindingData.propertyId; // if we drop a property, check only if the parent can be bound, not an ancestor
                var ancestorAndGroup = npBindingHelper.getFirstBindableAncestorAndGroup(targetMd, onlyParent);
                if (ancestorAndGroup && !_.isEmpty(compatiblePaths)) {
                    // There is an ancestor group groupMd that can be bound and there are some possible bindings
                    var groupMd = ancestorAndGroup.ancestorGroupMd;
                    if (bindingData.propertyId && editableProperty) {
                        compatiblePropertyPaths = npBindingHelper.getPathsCompatibleWithControlProperty(targetMd, bindingData.entityId, editableProperty, bindingData.entityId, bindingData.propertyId);
                    }
                    if (!bindingData.propertyId || (!_.isEmpty(compatiblePropertyPaths) && !npPageMetadataHelper.isBound(groupMd))) {
                        // We want to bind the parent group and not a property (no propertyId in bindingData), and we found compatible bindings
                        // or
                        // We want to bind a property and we are on a compatible control property but we need to bind first the parent group that is not yet bound
                        result = true;
                    }
                }
            }
            return result;
        }

        var getStyleForBinding = function (sibling, dragData, elementX, elementY) {
            var style;
            if (dragData.propertyId) {
                var editableProperty = npUiCanvasAPI.getEditablePropertyAtPosition(sibling.controlMd, elementX, elementY);
                if (editableProperty) {
                    var lastSiblingStyle = editableProperty.domRef.getBoundingClientRect();
                    style = {
                        width: lastSiblingStyle.width + 'px',
                        height: lastSiblingStyle.height + 'px',
                        top: lastSiblingStyle.top + 'px',
                        left: lastSiblingStyle.left + 'px',
                        position: 'fixed'
                    };
                }
            }
            else {
                style = _.clone(sibling.style);
            }

            return style;
        };

        var isValidSibling = function (controlMd, possibleSibling) {
            if (isChildOfDraggedElement(possibleSibling)) {
                return false;
            }
            var possibleSiblingMd = possibleSibling.controlMd;
            var canBeContainedInDefaultGroupValue = canBeContainedInDefaultGroup(controlMd, possibleSiblingMd);
            if (npLayoutHelper.isAbsoluteLayout() && possibleSibling.isRootChild() && !canBeContainedInDefaultGroupValue) {
                return false;
            }
            var canBeSiblingsValue = canBeSiblings(controlMd, possibleSiblingMd);
            return (canBeContainedInDefaultGroupValue || canBeSiblingsValue);
        };

        var canBeSiblings = function (controlMd, possibleSiblingMd) {
            var siblingParentMd = possibleSiblingMd.getParentMd();
            return !!siblingParentMd && npPageMetadataHelper.canHaveSiblings(possibleSiblingMd) && npUiCatalog.isControlValidInAggregation(controlMd.catalogControlName,
                    controlMd.catalogId, siblingParentMd.catalogControlName, siblingParentMd.catalogId, possibleSiblingMd.parentGroupId);
        };

        var isMultiple = function (controlMd, groupId) {
            if (!groupId) {
                return false;
            }
            var catalogGroups = npUiCatalog.getControlAggregations(controlMd.catalogControlName, controlMd.catalogId),
                catalogGroup = _.find(catalogGroups, {name: groupId}) || {};
            return !!catalogGroup.multiple;
        };

        /**
         * @name canBeContainedInDefaultGroup
         * @private
         * @description returns the parent groups where the control can be contained. If default group is not multiple and it already has a child, it returns false
         * @param {Object} controlMd
         * @param {Object} possibleParentMd
         * @returns {boolean}
         */
        var canBeContainedInDefaultGroup = function (controlMd, possibleParentMd) {
            var groupId = npUiCatalog.getControlDefaultAggregation(possibleParentMd.catalogControlName, possibleParentMd.catalogId);
            if (!groupId) {
                return false;
            }
            var childrenCount = possibleParentMd.getChildrenMd(groupId).length;
            var multiple = isMultiple(possibleParentMd, groupId);
            return npUiCatalog.isControlValidInAggregation(controlMd.catalogControlName, controlMd.catalogId, possibleParentMd.catalogControlName,
                    possibleParentMd.catalogId, groupId) && (multiple || childrenCount === 0);
        };

        /**
         * @name getClosestElementsAtPosition
         * @memberof npGridPosition
         * @description Retrieve the parent element (and its children) that is closest to the user at a position
         * @returns {GridElement[]} Grid elements order is highest z-index first
         */
        var getClosestElementsAtPosition = function (x, y) {
            var candidates = [];
            var elementsAtPosition = getElementsAtPosition(x, y);
            var index = _.findIndex(elementsAtPosition, function (elem) {
                return elem.isRootChild();
            });
            if (index !== -1) {
                candidates.push(elementsAtPosition[index]);
                index++;
                for (index; index < elementsAtPosition.length; index++) {
                    if (elementsAtPosition[index].isRootChild()) {
                        break;
                    }
                    candidates.splice(0, 0, elementsAtPosition[index]);
                }
            }
            return candidates;
        };

        return {
            getElementsAtPosition: getElementsAtPosition,
            containsPoint: containsPoint,
            getSiblingAtPosition: getSiblingAtPosition,
            getClosestElementsAtPosition: getClosestElementsAtPosition,
            getStyleForBinding: getStyleForBinding
        };
    }
];

module.exports = npGridPosition;
