'use strict';
var _ = require('norman-client-tp').lodash;
var npOutlineBottomDropSupport = ['$q', '$timeout', '$document', '$log', 'jQuery', 'npDragHelper', 'npUiCatalog', 'npPageMetadata', 'npOutlineHelper', 'npGrid',
	function ($q, $timeout, $document, $log, jQuery, npDragHelper, npUiCatalog, npPageMetadata, npOutlineHelper, npGrid) {
		return {
			restrict: 'A',
			scope: {
				nodes: '='
			},
			link: function (scope, element) {
				var _dragEnterCount = 0; // we need to keep a counter since enter is called again whenever we hover over a child element of the drop target

				element.addClass('np-outline-bottom-drop-support');
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


				var getLastNode = function () {
					var lastNode, nodeMap = {};
					var fnFindLastNode = function (node) {
						nodeMap[node.nodeId] = node;
						var nodeElementScope = npOutlineHelper.getNodeElement(node).scope();
						if (nodeElementScope && !nodeElementScope.collapsed && (!_.isEmpty(node.children))) {
							_.each(node.children, fnFindLastNode);
						} else if (node.type === 'group') {
							lastNode = nodeMap[node.parentNodeId];
						} else {
							lastNode = node;
						}
					};
					if (!_.isEmpty(scope.nodes)) {
						_.each(scope.nodes, fnFindLastNode);
					}
					return lastNode;
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
					var dragData,
						node;
					if ((dragData = npDragHelper.getDragData()) && (node = getLastNode())) {
						var bControlIsFromSameAggregation = npOutlineHelper.checkControlIsFromSameAggregation(node.data.controlMd, dragData.catalogControlName, dragData.catalogId),
							aggregation = npOutlineHelper.getAggregationForControl(node.data.controlMd, dragData.catalogControlName, dragData.catalogId);
						if (bControlIsFromSameAggregation) {
							// The control is from the same aggregation, so it's not a children but a brother
							oEvent.preventDefault();
							addCopyEffect(oEvent);
							node.showDrop = true;
							scope.$apply();
							$log.debug('show drop for bro');
						} else if (aggregation) {
							// The control will go in one of our aggregation, it's a children
							oEvent.preventDefault();
							addCopyEffect(oEvent);
							node.showDrop = true;
							scope.$apply();
							$log.debug('show drop for kid');
						} else if ((!_.isEmpty(node.data.controlMd)) && npOutlineHelper.willAcceptControlInSubHierarchy(node.data.controlMd, dragData.catalogControlName, dragData.catalogId)) {
							// Control will go in a sub aggregation hierarchy
							oEvent.preventDefault();
							addCopyEffect(oEvent);
							node.showDrop = true;
							scope.$apply();
							$log.debug('show drop for grand kid');
						}
					}
				};

				/**
				 * Listener for the on dragEnter event
				 * @param oEvent
				 */
				var onEnter = function (oEvent) {
					_dragEnterCount++;
					checkIfWeAcceptTheDrag(oEvent);
				};


				/**
				 * Listener for the dragLeave event
				 * @param oEvent
				 */
				var onLeave = function (oEvent) {
					_dragEnterCount--;
					if (_dragEnterCount === 0) {
						var node;
						if (node = getLastNode()) {
							node.showDrop = false;
							scope.$apply();
						}
						addNoneEffect(oEvent);
					}
				};

				/**
				 * Listener for the drop event
				 */
				var onDrop = function () {
					_dragEnterCount = 0;
					var node,
						dragData = npDragHelper.getDragData();
					if (node = getLastNode()) {
						node.showDrop = false;
						if (node.data && node.data.controlMd) {
							var aggregation, hierarchy;
							// Checking if dropped control is from same aggregation
							if (npOutlineHelper.checkControlIsFromSameAggregation(node.data.controlMd, dragData.catalogControlName, dragData.catalogId)) {
								npPageMetadata.addControl({
									newCtrlCatalogName: dragData.catalogControlName,
									catalogId: dragData.catalogId,
									parentId: node.data.controlMd.parentControlId,
									groupId: node.data.controlMd.parentGroupId, // Group Id = aggregation name
									index: (node.data.controlMd.parentGroupIndex + 1) // Increment the group index so it will be after this sibling
								}, {
									selectAddedControls: true,
									skipCanvasUpdate: false
								});
								$log.debug(node.nodeId + ' drag onDrop added has a sibling');
							} else if (aggregation = npOutlineHelper.getAggregationForControl(node.data.controlMd, dragData.catalogControlName, dragData.catalogId)) {
								var index = _.isEmpty(node.data.children) ? 0 : node.data.children.length;
								npPageMetadata.addControl({
									newCtrlCatalogName: dragData.catalogControlName,
									catalogId: dragData.catalogId,
									parentId: node.data.controlMd.controlId,
									groupId: aggregation.name, // Group Id = aggregation name
									index: index
								}, {
									selectAddedControls: true,
									skipCanvasUpdate: false
								});
								$log.debug(node.nodeId + ' drag onDrop added has a child');
							} else if ((hierarchy = npOutlineHelper.getAggregationsHierarchyToControl(node.data.controlMd, dragData.catalogControlName, dragData.catalogId))) {
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
											$log.error('npOutlineBottomDropSupport directive: could not add multiple control in hierarchy');
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
											var nodeToSelect = fnCheckIfNodeIsAddedControl(node.data);
											npGrid.setSelectedElements([nodeToSelect]);
										}
									});
								};
								fnAddNextControlInHierarchy(node.data.controlMd.controlId);
							}
						}
						scope.$apply();
						npDragHelper.endDrag();
					}
				};
				// Listening to event
				element.on('dragenter', onEnter);
				element.on('drop', onDrop);
				element.on('dragleave', onLeave);
				// Destroy
				scope.$on('$destroy', function () {
					element.off('dragenter', onEnter);
					element.off('drop', onDrop);
					element.off('dragleave', onLeave);
				});
			}
		};
	}
];

module.exports = npOutlineBottomDropSupport;
