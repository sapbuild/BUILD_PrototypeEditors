'use strict';

var _ = require('norman-client-tp').lodash;

var npOutlineHelper = ['$log', 'npUiCatalog', 'npPageMetadataHelper', 'npPageMetadata',
	function ($log, npUiCatalog, npPageMetadataHelper, npPageMetadata) {
		var self = {};
		/**
		 * Check if an aggregation can support adding a control to it
		 * @param aggregation
		 * @param controlMd
		 * @returns {boolean}
		 */
		self.aggregationWillAcceptNewControl = function (aggregation, controlMd) {
			return aggregation.multiple || controlMd.getChildrenMd(aggregation.name).length === 0;
		};

		/**
		 * Check if an aggregation can support adding a control to it
		 * @param aggregationName
		 * @param controlMd
		 * @returns {boolean}
		 */
		self.aggregationNameWillAcceptNewControl = function (aggregationName, controlMd) {
			var aggregations = npUiCatalog.getControlAggregations(controlMd.catalogControlName, controlMd.catalogId, true);
			var aggregation = _.find(aggregations, function (a) {
				return (a.name === aggregationName);
			});
			return self.aggregationWillAcceptNewControl(aggregation, controlMd);
		};

		/**
		 * Give the previous aggregation of the parent control if any
		 * @param receiverControlMd
		 * @param aggregationName
		 * @returns {undefined\Object}
		 */
		self.getAggregationBefore = function (receiverControlMd, aggregationName) {
			var previousAggregation = undefined;
			_.find(receiverControlMd.groups, function (group) {
				if (group.groupId === aggregationName) {
					return group;
				} else {
					previousAggregation = group;
				}
			});
			return previousAggregation;
		};
		/**
		 * Give the name of the previous aggregation of the parent control if any
		 * @param receiverControlMd
		 * @param aggregationName
		 * @returns {undefined\Object}
		 */
		self.getAggregationNameBefore = function (receiverControlMd, aggregationName) {
			return (self.getAggregationBefore(receiverControlMd, aggregationName) ? self.getAggregationBefore(receiverControlMd, aggregationName).groupId : undefined);
		};
		/**
		 * Return the aggregation object that fit the passed control name and catalog id for the receiver
		 * @param receiverControlMd
		 * @param controlName
		 * @param catalogId
		 * @returns {*}
		 */
		self.getAggregationForControl = function (receiverControlMd, controlName, catalogId) {
			if (receiverControlMd && receiverControlMd.catalogControlName && receiverControlMd.catalogId && controlName && catalogId) {
				var aggregations = npUiCatalog.getValidAggregationsForControl(receiverControlMd.catalogControlName, receiverControlMd.catalogId, controlName, catalogId);
				if (aggregations && aggregations.length > 0) {
					var aggregation = aggregations[0];
					if (self.aggregationWillAcceptNewControl(aggregation, receiverControlMd)) {
						return aggregation;
					}
				}
			}
			return null;
		};
		/**
		 *
		 * @param pageName
		 * @returns {*}
		 */
		self.getRootControlFromPage = function (pageName) {
			return npPageMetadata.getPageMetadata(pageName).then(function (pageMd) {
				return pageMd.controls[0];
			});
		};

		/**
		 * Indicates if the passed control name can be in same aggregation has the checked control
		 * @param checkedControlMd
		 * @param controlName
		 * @param catalogId
		 * @returns {*}
		 */
		self.checkControlIsFromSameAggregation = function (checkedControlMd, controlName, catalogId) {
			if (checkedControlMd && npPageMetadataHelper.canHaveSiblings(checkedControlMd)) {
				return npUiCatalog.isControlValidInAggregation(controlName, catalogId, checkedControlMd.getParentMd().catalogControlName, checkedControlMd.getParentMd().catalogId, checkedControlMd.parentGroupId);
			}
			return false;
		};

		/**
		 * Check if the control is a sibling that can go to the next aggregation of our parent
		 * @param checkedControlMd
		 * @param controlName
		 * @param catalogId
		 * @returns {boolean}
		 */
		self.checkControlIsSibling = function (checkedControlMd, controlName, catalogId) {
			if (checkedControlMd) {
				var parentMd = checkedControlMd.getParentMd();
				if (parentMd) {
					var aggregation = self.getAggregationForControl(parentMd, controlName, catalogId);
					if (aggregation) {
						var aggregationBefore = self.getAggregationBefore(parentMd, aggregation.name);
						if (aggregationBefore) {
							var lastChildren = _.last(aggregationBefore.children);
							if (lastChildren && lastChildren === checkedControlMd.controlId) {
								return self.aggregationWillAcceptNewControl(aggregation, parentMd);
							}
						}
					}
				}
			}
			return false;
		};

		/**
		 * Return the angular element for a given node
		 * @param node
		 * @returns {*}
		 */
		self.getNodeElement = function (node) {
			return self.getNodeElementById(node.nodeId);
		};

		/**
		 * Return the angular element for a given node id
		 * @param node
		 * @returns {*}
		 */
		self.getNodeElementById = function (nodeId) {
			var id = '[tree-node-id = \'' + nodeId + '\']';
			return angular.element(document.querySelector(id));
		};

		/**
		 * Return the aggregation and control Md for the control passes by going up the hierarchy
		 * @param checkedControlMd
		 * @param controlName
		 * @param catalogId
		 */
		self.getReceiverAggregationInHierarchy = function (checkedControlMd, controlName, catalogId) {
			var fnRecursiveCheckParent = function (checkedControlMd, controlName, catalogId) {
				var aggregation = self.getAggregationForControl(checkedControlMd, controlName, catalogId);
				if (aggregation === null && checkedControlMd.getParentMd() !== undefined) {
					return fnRecursiveCheckParent(checkedControlMd.getParentMd(), controlName, catalogId);
				}
				return aggregation ? {aggregation: aggregation, controlMd: checkedControlMd} : null;
			};
			return fnRecursiveCheckParent(checkedControlMd, controlName, catalogId);
		};

		/**
		 * Indicates if the control will be accepted in the hierarchy of the checked control
		 * @param checkedControlMd
		 * @param controlName
		 * @param catalogId
		 * @returns {boolean}
		 */
		self.aggregationHierarchyWillAcceptNewControl = function (checkedControlMd, controlName, catalogId) {
			return (self.getReceiverAggregationInHierarchy(checkedControlMd, controlName, catalogId) !== null);
		};

		/**
		 * Return a list of aggregations and controls that will be created to add the control to the checked one
		 * @param checkedControlMd
		 * @param controlName
		 * @param catalogId
		 * @returns {Array}
		 */
		self.getAggregationsHierarchyToControl = function (checkedControlMd, controlName, catalogId) {

			var finalHierarchy = [];
			var fnRecursiveCheckAggregation = function (receiverControlName, receiverCatalogId, addedControlName, addedCatalogId, hierarchy) {
				var aggregation, aggregations = npUiCatalog.getValidAggregationsForControl(receiverControlName, receiverCatalogId, addedControlName, addedCatalogId);
				if (aggregations.length > 0) {
					// We make sure that the first aggregation can accept
					if (_.isEmpty(hierarchy)) {
						if (!self.aggregationWillAcceptNewControl(aggregations[0], checkedControlMd)) {
							return false;
						}
					}
					aggregation = {aggregation: aggregations[0].name, control: addedControlName};
				}
				if (!aggregation) {
					_.each(npUiCatalog.getControlAggregations(receiverControlName, receiverCatalogId), function (passedAggregation) {
						var controls = npUiCatalog.getValidControlsForAggregation(passedAggregation.name, receiverControlName, receiverCatalogId);
						var control = _.find(controls, function (passedControl) {
							if (fnRecursiveCheckAggregation(passedControl.name, passedControl.catalogId, addedControlName, addedCatalogId, hierarchy)) {
								return passedControl;
							}
							return null;
						});
						if (control) {
							aggregation = {control: control.name, aggregation: passedAggregation.name};
						}
					});
				}
				if (aggregation) {
					hierarchy.push(aggregation);
					return true;
				}
				return false;
			};
			var accept = fnRecursiveCheckAggregation(checkedControlMd.catalogControlName, checkedControlMd.catalogId, controlName, catalogId, finalHierarchy);
			if (accept) {
				// Check if the aggregation of the checked control can accept the first control in the hierarchy
				finalHierarchy.reverse();
				var aggregation = npUiCatalog.getControlAggregations(checkedControlMd.catalogControlName, checkedControlMd.catalogId)[finalHierarchy[0].aggregation];
				if (self.aggregationWillAcceptNewControl(aggregation, checkedControlMd)) {
					return finalHierarchy;
				}
			}
			return null;
		};

		/**
		 * Check if aggregation of control has a default value
		 * @param catalogControlName
		 * @param catalogId
		 * @param aggregationName
		 * @returns {boolean}
		 */
		self.checkIfAggregationAsDefaultValue = function (catalogControlName, catalogId, aggregationName) {
			var controlAggregations = npUiCatalog.getControlAggregations(catalogControlName, catalogId, true);
			var controlAggregation = _.find(controlAggregations, function (a) {
				return (a.name === aggregationName);
			});
			return (!_.isEmpty(controlAggregation) && controlAggregation.hasOwnProperty('defaultValue'));
		};

		/**
		 * Indicates if the control can go in an down hierarchy of the checked control
		 * @param checkedControlMd
		 * @param controlName
		 * @param catalogId
		 * @returns {boolean}
		 */
		self.willAcceptControlInSubHierarchy = function (checkedControlMd, controlName, catalogId) {
			return !_.isEmpty(self.getAggregationsHierarchyToControl(checkedControlMd, controlName, catalogId));
		};

		/**
		 * Returns true if node has at least one real child, false otherwise
		 * @param node
		 * @returns {boolean}
		 */
		self.hasChild = function (node) {
			var child = false;
			if (node && node.children && node.children.length > 0) {
				_.forEach(node.children, function (descendant) {
					if (descendant.type !== 'group') {
						child = true;
					}
					else {
						child = self.hasChild(descendant);
					}
					return !child;
				});
			}
			return child;
		};

		return self;
	}];

module.exports = npOutlineHelper;