'use strict';

var _ = require('norman-client-tp').lodash;

var npCanvasElementDelete = ['$log', 'npGrid', 'npConstants', 'npKeyboarder', 'npPageMetadata', 'npPrototype', 'npMessaging',
	function ($log, npGrid, npConstants, npKeyboarder, npPageMetadata, npPrototype, npMessaging) {
		return {
			restrict: 'A',
			link: function (scope) {
				var l1, l2;
				var deleteElements = function () {
					var selectedElements = npGrid.getSelectedElements(),
						elementsToDelete = _.filter(selectedElements, function (element) {
							return element.canDeleteElement();
						});
					if (_.size(elementsToDelete) > 0) {
						var pagesToDelete = _.filter(elementsToDelete, function (element) {
								return element.isPageElement();
							}),
							controlsToDelete = _.difference(elementsToDelete, pagesToDelete);

						if (_.size(controlsToDelete) > 0) {
							var controlIdsToDelete = _.chain(controlsToDelete)
								.pluck('controlMd')
								.pluck('controlId')
								.value();
							npPageMetadata.deleteControl(controlIdsToDelete);
						}
						if (_.size(pagesToDelete) > 0) {
							npPrototype.getPages().then(function (pages) {
								_.each(pagesToDelete, function (pageToDelete) {
									var protoPage = _.find(pages, function (page) {
										return (page.name === pageToDelete.name);
									});
									// We don't delete ListReport floorplan
									if ((!_.isEmpty(protoPage)) && protoPage.floorplan === 'ListReport') {
										var index = pagesToDelete.indexOf(pageToDelete);
										pagesToDelete.splice(index, 1);
									}
								});
								if (pagesToDelete.length > 0) {
									return npPageMetadata.flushUpdates()
										.then(function () {
											if (_.size(pagesToDelete) > 1) {
												$log.error('Warning: Do not support multiple Page deletions! Deleting Page:' + pagesToDelete[0].displayName);
											}
											return npPrototype.deletePage(pagesToDelete[0].name);
										})
										.catch(function (error) {
											npMessaging.showError('Error: failed to delete page', error);
										});
								}
							});
						}
					}
				};


				function onBeforeExit() {
					npKeyboarder.off(l1);
					npKeyboarder.off(l2);
				}

				function onAfterEnter() {
					l1 = npKeyboarder.on(npConstants.keymap.Delete, deleteElements);
					l2 = npKeyboarder.on(npConstants.keymap.Backspace, deleteElements);
				}

				scope.$on('ui-composer/afterEnter', onAfterEnter);
				scope.$on('ui-composer/beforeExit', onBeforeExit);
			}
		};
	}
];

module.exports = npCanvasElementDelete;
