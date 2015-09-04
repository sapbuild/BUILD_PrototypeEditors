'use strict';
(function () {

    var expect = chai.expect,
        triggerKeyEvent = window.triggerKeyEvent;

    describe('Directive: np-canvas-element-delete', function () {
        var elem, scope, $rootScope, $document, $q,
            npGridMock, npPageMetadataMock, npPrototypeMock, npMessagingMock;

        var canDeleteElement = function () {
            return true;
        };

        beforeEach(function () {
            npGridMock = {
                _selectedElements: [{
                    controlMd: {
                        controlId: 'control1'
                    },
                    canDeleteElement: canDeleteElement,
                    isPageElement: function () {
                        return false;
                    }
                }, {
                    controlMd: {
                        controlId: 'control2'
                    },
                    canDeleteElement: canDeleteElement,
                    isPageElement: function () {
                        return false;
                    }
                }, {
                    name: 'Page1',
                    controlMd: {
                        controlId: 'control3'
                    },
                    canDeleteElement: canDeleteElement,
                    isPageElement: function () {
                        return true;
                    }
                }],
                getSelectedElements: function () {
                    return this._selectedElements;
                }
            };

            npPageMetadataMock = {
                deleteControl: function () {
                },
                flushUpdates: function () {
                    return $q.when();
                }
            };

            npPrototypeMock = {
                getPages: function () {
                    var deferred = $q.defer();
                    deferred.resolve({pages:[{floorplan:'', name: 'Page1'}]});
                    return deferred.promise;
                },
                deletePage: function () {
                    return $q.when({
                    });
                }
            };
            npMessagingMock = {
                showError: function () {
                }
            };

            module('uiComposer.uiCanvas');
            module('uiComposer.uiEditor');
            module('uiComposer.services');

            module(function ($provide) {
                $provide.value('npGrid', npGridMock);
                $provide.value('npPageMetadata', npPageMetadataMock);
                $provide.value('npPrototype', npPrototypeMock);
                $provide.value('npMessaging', npMessagingMock);
            });

            inject(function (_$rootScope_, _$document_, _$q_, $compile, npKeyboarderHelper) {
                sinon.stub(npKeyboarderHelper, 'shouldPerformCustomOperation', function () {
                    return true;
                });
                $q = _$q_;
                $rootScope = _$rootScope_;
                $document = _$document_;
                elem = angular.element('<div np-canvas-element-delete></div>');
                scope = $rootScope.$new();
                elem = $compile(elem)(scope);
                scope.$digest();
            });
        });

        it('should get all selected elements and delete them when delete key is pressed', function () {
            var getSelectedElementsSpy = sinon.spy(npGridMock, 'getSelectedElements'),
                deleteControlSpy = sinon.spy(npPageMetadataMock, 'deleteControl');
            scope.$emit('ui-composer/afterEnter');
            triggerKeyEvent('Delete', 'keydown', $document[0]);
            expect(getSelectedElementsSpy.calledOnce).to.be.equal(true);
            expect(deleteControlSpy.calledOnce).to.be.equal(true);
            // first call, first args, first elem
            expect(deleteControlSpy.args[0][0][0]).to.be.equal(npGridMock._selectedElements[0].controlMd.controlId);
            expect(deleteControlSpy.args[0][0][1]).to.be.equal(npGridMock._selectedElements[1].controlMd.controlId);
        });

        it('should get all selected elements and delete them when backspace key is pressed', function () {
            var getSelectedElementsSpy = sinon.spy(npGridMock, 'getSelectedElements'),
                deleteControlSpy = sinon.spy(npPageMetadataMock, 'deleteControl');
            scope.$emit('ui-composer/afterEnter');
            triggerKeyEvent('Backspace', 'keydown', $document[0]);
            expect(getSelectedElementsSpy.calledOnce).to.be.equal(true);
            expect(deleteControlSpy.calledOnce).to.be.equal(true);
            // first call, first args, first elem
            expect(deleteControlSpy.args[0][0][0]).to.be.equal(npGridMock._selectedElements[0].controlMd.controlId);
            expect(deleteControlSpy.args[0][0][1]).to.be.equal(npGridMock._selectedElements[1].controlMd.controlId);
        });

        it('should get all selected pages and delete them when delete key is pressed', function () {
            var getSelectedElementsSpy = sinon.spy(npGridMock, 'getSelectedElements'),
                deletePageSpy = sinon.spy(npPrototypeMock, 'deletePage'),
                flushUpdatesSpy = sinon.spy(npPageMetadataMock, 'flushUpdates');
            scope.$emit('ui-composer/afterEnter');
            triggerKeyEvent('Delete', 'keydown', $document[0]);
            expect(getSelectedElementsSpy.calledOnce).to.be.equal(true);
            scope.$apply();
            expect(flushUpdatesSpy.called).to.be.ok;
            expect(deletePageSpy.calledAfter(flushUpdatesSpy)).to.be.ok;
        });

        it('should get all selected pages and delete them when backspace key is pressed', function () {
            var getSelectedElementsSpy = sinon.spy(npGridMock, 'getSelectedElements'),
                deletePageSpy = sinon.spy(npPrototypeMock, 'deletePage'),
                flushUpdatesSpy = sinon.spy(npPageMetadataMock, 'flushUpdates');
            scope.$emit('ui-composer/afterEnter');
            triggerKeyEvent('Backspace', 'keydown', $document[0]);
            expect(getSelectedElementsSpy.calledOnce).to.be.equal(true);
            scope.$apply();
            expect(flushUpdatesSpy.called).to.be.ok;
            expect(deletePageSpy.calledAfter(flushUpdatesSpy)).to.be.ok;
        });

        it('should remove keyboard listeners when scope is destroyed', inject(function (npKeyboarder) {
            scope.$emit('ui-composer/afterEnter');
            var keyboarderOffSpy = sinon.spy(npKeyboarder, 'off');
            scope.$emit('ui-composer/beforeExit');
            expect(keyboarderOffSpy.callCount).to.be.equal(2);
        }));
    });
})
();
