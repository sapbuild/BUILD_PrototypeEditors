'use strict';

// @ngInject
module.exports = function ($timeout, $log, jsPlumbService) {
    var templateUrl = 'resources/norman-prototype-editors-client/DataModeler/dataModelEditor/dataModelDesigner/directives/dmdItem.html';
    return {
        restrict: 'E',
        replace: true,
        scope: {
            item: '=',
            selectedItem: '=',
            updateItem: '&',
            selectItem: '&',
            removeItem: '&',
            dragItemStop: '&'
        },
        controller: ['$scope', function ($scope) {
            $scope.bAllowSelection = true;
            $scope.bedit = false;

            // ----------------------------- event API -----------------------------
            $scope.$on('ModelEditorService.modelChangeStart', function () {
                $scope.bAllowSelection = false;
            });
            $scope.$on('ModelEditorService.modelChanged', function () {
                $scope.bAllowSelection = true;
            });
            $scope.$on('ModelEditorService.propertyAdded', function () {
                $scope.bAllowSelection = true;
            });
            $scope.$on('ModelEditorService.relationAdded', function () {
                $scope.bAllowSelection = true;
            });

        }],
        link: function (scope, element) {

            var initialValue = '';

            element.on('click', function () {
                if (scope.bAllowSelection) {
                    scope.selectItem()(scope.item);
                    scope.$apply();
                }
                scope.bAllowSelection = true; // avoid locks = only skips 1 click max
            });

            // --------------------------- directive methods ----------------------

            scope.key = function ($event) {
                if ($event.keyCode === 13) {
                    scope.validateName();
                }
            };

            scope.validateName = function () {
                scope.bedit = false;
                var value = element[0].querySelectorAll('.editable-input')[0].value;

                if (value !== initialValue) {
                    scope.updateItem()(scope.item);
                }
            };

            scope.onEdit = function () {
                scope.bedit = true;
                $timeout(function () {
                    var input = element[0].querySelectorAll('.editable-input')[0];
                    input.focus();
                    input.setSelectionRange(input.value.length, input.value.length);
                    initialValue = input.value;
                }, 500);
            };

            scope.delete = function (event) {
                event.stopPropagation();
                jsPlumbService.instance.remove(element);
                scope.removeItem()(scope.item._id);
            };
        },
        templateUrl: templateUrl
    };
};

