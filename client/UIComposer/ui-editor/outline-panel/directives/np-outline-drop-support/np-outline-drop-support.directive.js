'use strict';
var _ = require('norman-client-tp').lodash;
var npOutlineDropSupport = ['$q', '$timeout', '$document', '$log', 'jQuery', 'npDragHelper', 'npUiCatalog', 'npPageMetadata', 'npOutlineHelper', 'npGrid',
	function ($q, $timeout, $document, $log, jQuery, npDragHelper, npUiCatalog, npPageMetadata, npOutlineHelper, npGrid) {
		return {
			restrict: 'A',
			scope: {
				node: '='
			},
			link: function (scope, element) {
				var _dragEnterCount = 0, // we need to keep a counter since enter is called again whenever we hover over a child element of the drop target
					otherNodeShow,
					expandTimeout;

				element.addClass('np-outline-drop-support');
				/**
				 * Add the copy effect for visual feedback
				 * @param oEvent
				 */
				var addCopyEffect = function (oEvent) {
					oEvent.dataTransfer.dropEffect = 'copy';
				};
				/**
				 * Remove the visual feedback
				 * @param oEvent
				 */
				var addNoneEffect = function (oEvent) {
					oEvent.dataTransfer.dropEffect = 'none';
				};

				/**
				 * clean any applied styles
				 */
				var cleanStyles = function () {
					scope.node.showDrop = false;
					if (otherNodeShow) {
						otherNodeShow.showDrop = false;
						npOutlineHelper.getNodeElement(otherNodeShow).removeClass('accept-drop');
						otherNodeShow = null;
					}
					element.parent().removeClass('accept-drop');
					element.removeClass('np-outline-drop-support-refused');
				};

				/**
				 * In this we are checking if the dragged control can be accepted on this control
				 * We accept a control if
				 *  from same aggregation (brother)
				 *  go to one of our aggregation (children)
				 *  go to the parent aggregation, right after our (sibiling)
				 * @param oEvent
				 */
				var checkIfWeAcceptTheDrag = function (oEvent) {
					addNoneEffect(oEvent);
					otherNodeShow = null;
					var bIsAccepted = false, dragData = npDragHelper.getDragData(),
						bControlIsFromSameAggregation = npOutlineHelper.checkControlIsFromSameAggregation(scope.node.data.controlMd, dragData.catalogControlName, dragData.catalogId),
						aggregation = npOutlineHelper.getAggregationForControl(scope.node.data.controlMd, dragData.catalogControlName, dragData.catalogId), previousAggregationName, pagePromise;
					if (aggregation !== null) {
						// We have an aggregation for the dropped control so we now it will be push on a child node
						// We get the aggregation before the on. that will accept this control to display the green line
						previousAggregationName = npOutlineHelper.getAggregationNameBefore(scope.node.data.controlMd, aggregation.name);
						$log.debug('previousAggregationName ' + previousAggregationName);
					}
					if (scope.node.type === 'page') {
						// This control is a page. We have a special case here as a page is not a control
						// So we use the promise to get the root control of the page
						pagePromise = npOutlineHelper.getRootControlFromPage(scope.node.data.name).then(function (controlMd) {
							var aggregation = npOutlineHelper.getAggregationForControl(controlMd, dragData.catalogControlName, dragData.catalogId);
							if (aggregation) {
								oEvent.preventDefault();
								addCopyEffect(oEvent);
								bIsAccepted = true;
								if (previousAggregationName !== undefined) {
									$log.debug('previousAggregationName ' + previousAggregationName);
									scope.node.showDrop = false;
									var group = _.find(scope.node.children, function (child) {
										if (child.data.name === previousAggregationName) {
											return child;
										}
									});
									var lastNode = _.last(group.children);
									lastNode.showDrop = true;
									otherNodeShow = lastNode;
								} else {
									scope.node.showDrop = true;
								}
							}
						});
					}
					if (bControlIsFromSameAggregation) {
						// The control is from the same aggregation, so it's not a children but a brother
						oEvent.preventDefault();
						addCopyEffect(oEvent);
						bIsAccepted = true;
						// We are collapsed so we show the drop line
						if (scope.$parent.collapsed) {
							scope.node.showDrop = true;
						} else {
							// We are not collapsed so we need to show that the drop line after our parent dom element
							element.parent().addClass('accept-drop');
						}
						$log.debug(scope.node.nodeId + ' drag onEnter accept');
					} else if (aggregation) {
						// The control will go in one of our aggregation, it's a children
						oEvent.preventDefault();
						addCopyEffect(oEvent);
						bIsAccepted = true;
						if (previousAggregationName !== undefined) {
							$log.debug('previousAggregationName ' + previousAggregationName);
							scope.node.showDrop = false;
							var group = _.find(scope.node.children, function (child) {
								if (child.data.name === previousAggregationName) {
									return child;
								}
							});
							if (group.children.length > 0) {
								// We have the aggregation before the one for the control that have children
								// The green line will be display on the last one
								var lastNode = _.last(group.children);
								otherNodeShow = lastNode;
							} else {
								scope.node.showDrop = true;
							}
						} else {
							// No aggregation before so we show the green line
							scope.node.showDrop = true;
						}
						$log.debug(scope.node.nodeId + ' drag onEnter accept');
					} else if ((!_.isEmpty(scope.node.data.controlMd)) && npOutlineHelper.checkControlIsSibling(scope.node.data.controlMd, dragData.catalogControlName, dragData.catalogId)) {
						// Control will go in the aggregation right after us
						oEvent.preventDefault();
						addCopyEffect(oEvent);
						bIsAccepted = true;
						// We are collapsed so we show the drop line
						if (scope.$parent.collapsed) {
							scope.node.showDrop = true;
						} else {
							// We are not collapsed so we need to show that the drop line after our parent dom element
							element.parent().addClass('accept-drop');
						}
					} else if ((!_.isEmpty(scope.node.data.controlMd)) && scope.$parent.depth() > 1 && npOutlineHelper.willAcceptControlInSubHierarchy(scope.node.data.controlMd, dragData.catalogControlName, dragData.catalogId)) {
						// Control will go in a sub aggregation hierarchy
						oEvent.preventDefault();
						addCopyEffect(oEvent);
						bIsAccepted = true;
						scope.node.showDrop = true;
					}
					if (otherNodeShow !== null) {
						oEvent.preventDefault();
						addCopyEffect(oEvent);
						bIsAccepted = true;
						if (otherNodeShow) {
							// We are collapsed so we show the drop line
							if (scope.$parent.collapsed) {
								otherNodeShow.showDrop = true;
							} else {
								// We are not collapsed so we need to show that the drop line after our parent dom element
								npOutlineHelper.getNodeElement(otherNodeShow).addClass('accept-drop');
							}
						}
					}
					if (!pagePromise) {
						// If the promise for the page is used we don't want to apply the scope
						scope.$apply();
					}
					if (!bIsAccepted) {
						element.addClass('np-outline-drop-support-refused');
					}
				};

				var isExpandable = function () {
					return scope.node && scope.$parent && scope.$parent.collapsed && npOutlineHelper.hasChild(scope.node);
				};

				var expandNode = function () {
					if (isExpandable()) {
						scope.node.select();
					}
				};

				var setUpExpandTimeout = function () {
					if (!expandTimeout && isExpandable()) {
						expandTimeout = $timeout(expandNode, 800);
					}
				};

				var cancelExpandTimeout = function () {
					if (expandTimeout) {
						$timeout.cancel(expandTimeout);
						expandTimeout = null;
					}
				};

				/**
				 * Listener for the on dragEnter event
				 * @param oEvent
				 */
				var onEnter = function (oEvent) {
					$log.debug(scope.node.nodeId + ' drag onEnter');
					_dragEnterCount++;
					if (!_.isEmpty(npDragHelper.getDragData())) {
						checkIfWeAcceptTheDrag(oEvent);
					}
					$log.debug(scope.node.nodeId + 'showDrop:' + scope.node.showDrop);
				};

				var onHover = function (oEvent) {
					$log.debug(scope.node.nodeId + ' drag onHover');
					setUpExpandTimeout();
					if (!_.isEmpty(npDragHelper.getDragData())) {
						checkIfWeAcceptTheDrag(oEvent);
					}
				};

				/**
				 * Listener for the dragLeave event
				 * @param oEvent
				 */
				var onLeave = function (oEvent) {
					$log.debug(scope.node.nodeId + ' drag onLeave');
					_dragEnterCount--;
					cancelExpandTimeout();
					if (_dragEnterCount === 0) {
						cleanStyles();
						scope.$apply();
						addNoneEffect(oEvent);
					}
					$log.debug(scope.node.nodeId + 'showDrop:' + scope.node.showDrop);
				};

				/**
				 * Listener for the drop event
				 */
				var onDrop = function () {
					$log.debug(scope.node.nodeId + ' drag onDrop');
					_dragEnterCount = 0;
					cancelExpandTimeout();
					var dragData = npDragHelper.getDragData(), pagePromise;
					if (scope.node.data && scope.node.data.controlMd && (!_.isEmpty(dragData))) {
						var aggregation, hierarchy;
						// Checking if dropped control is from same aggregation
						if (npOutlineHelper.checkControlIsFromSameAggregation(scope.node.data.controlMd, dragData.catalogControlName, dragData.catalogId)) {
							npPageMetadata.addControl({
								newCtrlCatalogName: dragData.catalogControlName,
								catalogId: dragData.catalogId,
								parentId: scope.node.data.controlMd.parentControlId,
								groupId: scope.node.data.controlMd.parentGroupId, // Group Id = aggregation name
								index: (scope.node.data.controlMd.parentGroupIndex + 1) // Increment the group index so it will be after this sibling
							}, {
								selectAddedControls: true,
								skipCanvasUpdate: false
							});
							$log.debug(scope.node.nodeId + ' drag onDrop added has a sibling');
						} else if (aggregation = npOutlineHelper.getAggregationForControl(scope.node.data.controlMd, dragData.catalogControlName, dragData.catalogId)) {
							npPageMetadata.addControl({
								newCtrlCatalogName: dragData.catalogControlName,
								catalogId: dragData.catalogId,
								parentId: scope.node.data.controlMd.controlId,
								groupId: aggregation.name, // Group Id = aggregation name
								index: 0
							}, {
								selectAddedControls: true,
								skipCanvasUpdate: false
							});
							$log.debug(scope.node.nodeId + ' drag onDrop added has a child');
						} else if (npOutlineHelper.checkControlIsSibling(scope.node.data.controlMd, dragData.catalogControlName, dragData.catalogId)) {
							var parentMd = scope.node.data.controlMd.getParentMd();
							var siblingAggregation = npOutlineHelper.getAggregationForControl(parentMd, dragData.catalogControlName, dragData.catalogId);
							npPageMetadata.addControl({
								newCtrlCatalogName: dragData.catalogControlName,
								catalogId: dragData.catalogId,
								parentId: scope.node.data.controlMd.parentControlId,
								groupId: siblingAggregation.name, // Group Id = aggregation name
								index: 0
							}, {
								selectAddedControls: true,
								skipCanvasUpdate: false
							});
						} else if (scope.$parent.depth() > 1 && (hierarchy = npOutlineHelper.getAggregationsHierarchyToControl(scope.node.data.controlMd, dragData.catalogControlName, dragData.catalogId))) {
							var hierarchyIndex = 0, fnAddNextControlInHierarchy = function (parentId) {
								var isLastAdded, isLast = hierarchyIndex === (hierarchy.length - 1);
								if (!isLast) {
									isLastAdded = npOutlineHelper.checkIfAggregationAsDefaultValue(hierarchy[hierarchyIndex].control, dragData.catalogId, hierarchy[hierarchyIndex + 1].aggregation);

								} else {
									isLastAdded = true;
								}
								npPageMetadata.addControl({
									newCtrlCatalogName: hierarchy[hierarchyIndex].control,
									catalogId: dragData.catalogId,
									parentId: parentId,
									groupId: hierarchy[hierarchyIndex].aggregation, // Group Id = aggregation name
									index: 0
								}, {
									selectAddedControls: isLastAdded,
									skipCanvasUpdate: !isLastAdded
								}).then(function (result) {
									if (_.isEmpty(result)) {
										$log.error('npOutlineDropSupport directive: could not add multiple control in hierarchy');
										return $q.reject();
									}
									// Check if control aggregation has default content
									var control = result[0];
									if ((hierarchyIndex + 1 < hierarchy.length) && (!npOutlineHelper.checkIfAggregationAsDefaultValue(control.catalogControlName, control.catalogId, hierarchy[hierarchyIndex + 1].aggregation))) {
										hierarchyIndex++;
										fnAddNextControlInHierarchy(control.controlId);
									} else {
										// Select
										var fnCheckIfNodeIsAddedControl = function (n) {
											var returnedNode;
											if (n.controlMd.catalogControlName === dragData.catalogControlName) {
												returnedNode = n;
											} else {
												_.each(n.children, function (childNode) {
													var c;
													if (c = fnCheckIfNodeIsAddedControl(childNode)) {
														returnedNode = c;
													}
												});
											}
											return returnedNode;
										};
										var nodeToSelect = fnCheckIfNodeIsAddedControl(scope.node.data);
										npGrid.setSelectedElements([nodeToSelect]);
									}
								});
							};
							fnAddNextControlInHierarchy(scope.node.data.controlMd.controlId);
						}
					} else if (scope.node.type === 'page') {
						// Special case for page. Need to get the root control
						pagePromise = npOutlineHelper.getRootControlFromPage(scope.node.data.name).then(function (controlMd) {
							var aggregation = npOutlineHelper.getAggregationForControl(controlMd, dragData.catalogControlName, dragData.catalogId);
							if (aggregation) {
								npPageMetadata.addControl({
									newCtrlCatalogName: dragData.catalogControlName,
									catalogId: dragData.catalogId,
									parentId: controlMd.controlId,
									groupId: aggregation.name, // Group Id = aggregation name
									index: 0
								}, {
									selectAddedControls: true,
									skipCanvasUpdate: false
								});
							}
						});
					} else {
						$log.debug(scope.node.nodeId + ' drag onDrop could not add');
					}
					cleanStyles();
					npDragHelper.endDrag();
					if (!pagePromise) {
						scope.$apply();
					}
					$log.debug(scope.node.nodeId + 'showDrop:' + scope.node.showDrop);
				};
				// Listening to event
				element.on('dragenter', onEnter);
				element.on('dragover', onHover);
				element.on('drop', onDrop);
				element.on('dragleave', onLeave);
				// Destroy
				scope.$on('$destroy', function () {
					element.off('dragenter', onEnter);
					element.off('dragover', onHover);
					element.off('drop', onDrop);
					element.off('dragleave', onLeave);
				});
			}
		};
	}
];

module.exports = npOutlineDropSupport;
