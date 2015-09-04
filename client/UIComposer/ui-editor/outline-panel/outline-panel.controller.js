'use strict';

var _ = require('norman-client-tp').lodash;

module.exports = ['$scope', '$rootScope', 'npPrototype', 'npUiCanvasAPI', 'npTreeModel', 'npOutlineHelper', 'npTreeSelect', 'npPageMetadata', 'npMessaging', 'npConstants', 'npKeyboarder', 'npPageMetadataEvents', 'npUiCatalog', 'npFloorplanHelper', 'npPageMetadataMoveControl',
	function ($scope, $rootScope, npPrototype, npUiCanvasAPI, npTreeModel, npOutlineHelper, npTreeSelect, npPageMetadata, npMessaging, npConstants, npKeyboarder, pageMdEvents, npUiCatalog, npFloorplanHelper, npPageMetadataMoveControl) {
		var that = this;

		that.nodes = [];

        that.lastNode = null;

        that.removeControl = function (node) {
            npPageMetadata.deleteControl(node.data.controlMd.controlId);
        };

		$scope.isDraggingOver = false;

		var refreshTree = function () {
			npTreeModel.refreshModel()
				.then(function (nodes) {
					_.each(nodes, function (node) {
						node.showDrop = false;
					});
					that.nodes = nodes;
					_.defer(function () {
						$scope.$broadcast('expandSelectedNodes');
					});
				});
		};

		/**
		 * @name getFloorplans
		 * @private
		 * @description determines valid Floorplans
		 * @returns {*} Promise resolved after all is successfully done
		 */
		function getFloorplans() {
			npMessaging.showBusyIndicator();
			return npFloorplanHelper.getValidFloorplans()
				.then(function (floorplans) {
					that.floorplans = floorplans;
				})
				.finally(npMessaging.hideBusyIndicator);
		}

		refreshTree();
		getFloorplans();

		/**
		 * Creates a new Page based on the selected compatible floorplan (e.g. ABSOLUTE, GRID)
		 * and updates the tree accordingly.
		 * @return {object} Promise object that resolves when updates are done.
		 */
		that.createPage = function (floorplan) {
			$rootScope.$broadcast('disableDataModeler', {value: true});
			npMessaging.showBusyIndicator();
			return npPageMetadata.flushUpdates()
				.then(function () {
					return npPrototype.createPage({floorplan: floorplan.floorplan, catalogId: floorplan.catalogId});
				})
				.catch(function (error) {
					npMessaging.showError('Error: failed to create new page', error);
				});
		};

		function onPageCreated() {
			return npUiCanvasAPI.reload()
				.then(npPrototype.getPages)
				.then(function (pages) {
					return npPageMetadata.setCurrentPageName(_.last(pages).name);
				});
		}

		that.deletePage = function (pageName) {
			return npPageMetadata.flushUpdates()
				.then(function () {
					return npPrototype.deletePage(pageName);
				})
				.catch(function (error) {
					npMessaging.showError('Error: failed to delete page', error);
				});
		};

		function onPageDeleted(event, deletedPageName) {
			return npPrototype.getPrototype()
				.then(function (appMetadata) {
					selectPreviousPage(appMetadata, deletedPageName);
				});
		}

		function selectPreviousPage(appMetadata, pageName) {
			var iPage = getPageIndex(pageName);
			if (_.size(appMetadata.pages)) {
				var iPageToBeSelected = Math.max(iPage - 1, 0);
				npPageMetadata.setCurrentPageName(appMetadata.pages[iPageToBeSelected].name);
			}
			else {
				$state.go('page-map-view', {
					currentProject: $state.params.currentProject
				});
			}
		}

		function getPageIndex(pageName) {
			return _.findIndex(that.nodes, function (node) {
				return node.data.name === pageName;
			});
		}

		/**
		 * @private
		 * @description Listen to property value changes to update the display name of their controls if the diff property of the control change.
		 */
		var controlPropertiesChangedListener = function (event, pageMd, propertyChanges) {
			_.each(propertyChanges, function (propertyChange) {
				var controlMd = propertyChange.controlMd;
				var diffName = npUiCatalog.getControlDiffName(controlMd.catalogControlName, controlMd.catalogId);
				var diffProperty = _.find(propertyChange.properties, {name: diffName});
				if (diffProperty) {
					var diffNameValue = diffProperty.value;
					var node = findNodeByControlId(that.nodes, controlMd.controlId);
					if (node) {
						if (diffNameValue) {
							diffNameValue = diffNameValue ? ' ' + diffNameValue : '';
						}
						node.displayName = npUiCatalog.getControlDisplayName(controlMd.catalogControlName, controlMd.catalogId) + diffNameValue;
					}
				}
			});
		};

		$scope.$on('pageCreated', onPageCreated);
		$scope.$on('pageDeleted', onPageDeleted);
		$scope.$on('gridRefreshed', refreshTree);
		$scope.$on('npGrid/elementsMoved', $scope.$broadcast.bind($scope, 'expandSelectedNodes'));
		pageMdEvents.listen(pageMdEvents.events.controlPropertiesChanged, controlPropertiesChangedListener);

		var keyboardListeners = [],
			selectNode = function (which, event) {
				event.preventDefault();
				if (which === 'next') {
					npTreeSelect.selectNextNode();
				}
				else {
					npTreeSelect.selectPreviousNode();
				}
			};

		$scope.$on('ui-composer/afterEnter', function () {
			keyboardListeners.push(npKeyboarder.on(npConstants.keymap.ArrowUp, selectNode.bind(this, 'previous')));
			keyboardListeners.push(npKeyboarder.on(npConstants.keymap.ArrowLeft, selectNode.bind(this, 'previous')));
			keyboardListeners.push(npKeyboarder.on(npConstants.keymap.ArrowDown, selectNode.bind(this, 'next')));
			keyboardListeners.push(npKeyboarder.on(npConstants.keymap.ArrowRight, selectNode.bind(this, 'next')));
		});

		$scope.$on('ui-composer/beforeExit', function () {
			_.forEach(keyboardListeners, function (listener) {
				npKeyboarder.off(listener);
			});
		});

		/**
		 * @name findNodeByControlId
		 * @description Find tree nodes by controlId.
		 *
		 * @param {TreeNode[]} nodes The nodes to start searching on. Will search nodes and all their child nodes.
		 * @param {object[]} controlId The controlId to find the node.
		 * @returns {TreeNode[]}
		 */
		var findNodeByControlId = function (nodes, controlId) {
			var foundNode = null;
			_.forEach(nodes, function (node) {
				if (node.data.controlMd && node.data.controlMd.controlId === controlId) {
					foundNode = node;
				}
				else if (!_.isEmpty(node.children)) {
					foundNode = findNodeByControlId(node.children, controlId);
				}
				return !foundNode;
			});
			return foundNode;
		};

		var hasChild = function (node) {
			return npOutlineHelper.hasChild(node);
		};


		that.hasChild = hasChild;

		that.checkIfNodeIsDeletable = function (node, index) {
			// This is not working as the value is not there
			if (!_.isEmpty(node.data.floorplan)) {
				return (node.data.floorplan !== 'ListReport');
			}
			// Workaround
			if (index === 0) {
				return false;
			}
			return true;
		};

		that.canBeReordered = function (node) {
			return ((node.level !== 0) && ((node.type === 'group') || (!_.isEmpty(node.data.controlMd) && npOutlineHelper.aggregationNameWillAcceptNewControl(node.data.controlMd.parentGroupId, node.data.controlMd.getParentMd()))));
		};

		// Drag and Drop event from tree
		$scope.treeOptions = {
			accept: function (sourceNodeScope, destNodesScope, destIndex) {
				if (_.isUndefined(destNodesScope.$modelValue[destIndex])) {
					return false;
				}
				var destControl = destNodesScope.$modelValue[destIndex].data;
				var sourceControl = sourceNodeScope.$modelValue.data;
				// Check if source and dest are from same aggregation and that parent can accept
				if ((!_.isUndefined(destControl.controlMd)) && destControl.controlMd.parentGroupId === sourceControl.controlMd.parentGroupId && destControl.controlMd.parentControlId === sourceControl.controlMd.parentControlId) {
					var parentControlMd = destControl.controlMd.getParentMd();
					return npOutlineHelper.aggregationNameWillAcceptNewControl(sourceControl.controlMd.parentGroupId, parentControlMd);
				}
				return false;
			},
			dropped: function (event) {
				var movedControl = event.source.nodeScope.$modelValue.data.controlMd;
				var newIndex = event.dest.index;
				var controlDef = npPageMetadataMoveControl.createMoveDefinition(movedControl);
				if (controlDef.index !== newIndex) {
					controlDef.index = newIndex;
					npPageMetadata.moveControl(controlDef);
				}
			},
			dragStart: function (event) {
				event.elements.dragging.css('position', 'absolute').addClass('np-e-outline-drag-image');
				event.elements.placeholder.css('height', '2px').addClass('np-e-outline-placeholder');
			},
			beforeDrag: function (sourceNodeScope) {
				var node = sourceNodeScope.$modelValue;
				return (node.level !== 0) && ((node.type !== 'group') || (!_.isEmpty(node.data.controlMd) && npOutlineHelper.aggregationNameWillAcceptNewControl(node.data.controlMd.parentGroupId, node.data.controlMd.getParentMd())));
			}
		};
	}
];
