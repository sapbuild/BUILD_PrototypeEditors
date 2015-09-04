'use strict';
(function () {

    var expect = chai.expect,
        triggerKeyEvent = window.triggerKeyEvent;

    describe('Controller: page-map-view', function () {
        var createController, scope, $rootScope, $document, npKeyboarder;
        var $stickyStateMock, npFloorplanHelperMock, npPrototypeMock, npJsPlumbMock, npNavBarHelperMock, npPageMapLayoutMock, npMessagingMock, npPageMetadataMock, uiCommandManagerMock;

        var page1 = {
                displayName: 'Page 1',
                id: 'cfdbcd9b8412872c09db4ce3',
                name: 'S0',
                pageUrl: '/index.html#S0',
                thumbnailUrl: '/resources/thumbnail/S0.png'
            },
            page2 = {
                displayName: 'Page 2',
                id: 'cfdbcd9b8412872c09db4ce3',
                name: 'S1',
                pageUrl: '/index.html#S1',
                thumbnailUrl: '/resources/thumbnail/S1.png'
            };

        var result = {
            pages: [
                page1,
                page2
            ],
            navigations: {}
        };

        var state = {
            params: {
                currentProject: 123,
                currentScreen: 'S1'
            }
        };

        $stickyStateMock = {
            reset: sinon.stub()
        };

        beforeEach(module('pageMapView'));
        beforeEach(module('uiComposer.uiEditor'));
        beforeEach(module('uiComposer.services'));

        beforeEach(inject(function ($injector) {
            var $httpBackend = $injector.get('$httpBackend');
            var $q = $injector.get('$q');
            var $controller = $injector.get('$controller');
            var npKeyboarderHelper = $injector.get('npKeyboarderHelper');

            sinon.stub(npKeyboarderHelper, 'shouldPerformCustomOperation', function () {
                return true;
            });

            $document = $injector.get('$document');
            $rootScope = $injector.get('$rootScope');
            npKeyboarder = $injector.get('npKeyboarder');

            npFloorplanHelperMock = {
                getValidFloorplans: function () {
                    return $q.when();
                }
            };
            npPrototypeMock = {
                getPages: function () {
                    var deferred = $q.defer();
                    deferred.resolve(result.pages);
                    return deferred.promise;
                },
                getCurrentPage: function () {
                    return page1;
                },
                getPrototype: function () {
                    var deferred = $q.defer();
                    deferred.resolve(result);
                    return deferred.promise;
                },
                createPage: function () {
                    return $q.when(result);
                },
                flushUpdates: function () {
                    return $q.when({});
                },
                deletePage: function () {
                    return $q.when(page2);
                },
                getArtifactBaseUrl: function () {
                    return '/api/projects/' + state.params.currentProject + '/prototype/artifact/';
                },
                getNavigationToPage: function () {
                    return $q.when([]);
                }
            };
            npJsPlumbMock = {
                init: function () {
                    return;
                },
                reset: function () {
                    return;
                },
                repaintEverything: sinon.stub()
            };
            npNavBarHelperMock = {
                enableUpdateSaveStatus: function () {
                    return;
                },
                disableUpdateSaveStatus: function () {
                    return;
                },
                updateHeading: sinon.stub()
            };
            npPageMapLayoutMock = {
                getGridLayout: function () {

                },
                getConnectedPages: function () {
                    return {
                        edges: [],
                        unConnectedPages: [],
                        connectedPages: []
                    };
                },
                createLayout: function () {
                },
                createConnections: function () {
                }
            };
            npMessagingMock = {
                showError: sinon.stub(),
                showBusyIndicator: sinon.stub(),
                hideBusyIndicator: sinon.stub()
            };
            npPageMetadataMock = {
                flushUpdates: function () {
                    return $q.when();
                }
            };
            uiCommandManagerMock = {
                undo: sinon.stub(),
                redo: sinon.stub()
            };

            $httpBackend.when('GET', '/api/projects/123/prototype').respond({});

            createController = function () {
                scope = $rootScope.$new();
                scope.map = {currentProject: 123};
                scope.selectedPage = page2;
                scope.screens = result.pages;
                return $controller('PageMapCtrl', {
                    $scope: scope,
                    $state: state,
                    $stickyState: $stickyStateMock,
                    npJsPlumb: npJsPlumbMock,
                    npPrototype: npPrototypeMock,
                    npNavBarHelper: npNavBarHelperMock,
                    npPageMapLayout: npPageMapLayoutMock,
                    npMessaging: npMessagingMock,
                    npFloorplanHelper: npFloorplanHelperMock,
                    npPageMetadata: npPageMetadataMock,
                    uiCommandManager: uiCommandManagerMock
                });
            };
        }));

        it('create page service called on click of create page', function () {
            var createPage = sinon.spy(npPrototypeMock, 'createPage');
            var ctrl = createController();
            expect(createPage.called).to.be.equal(false);
            ctrl.createPage({target: {}}, {floorplan: 'absolute'});
            $rootScope.$apply();
            expect(createPage.called).to.be.equal(true);
        });

        describe('keyboard shortcuts:', function () {
            it('delete selected page', function () {
                var deletePage = sinon.spy(npPrototypeMock, 'deletePage');
                var ctrl = createController();
                scope.$emit('page-map-view/afterEnter');
                triggerKeyEvent('Delete', 'keydown', $document[0]);
                triggerKeyEvent('Backspace', 'keydown', $document[0]);
                $rootScope.$apply();
                expect(deletePage.called).to.be.false;

                ctrl.selectedPage = {name: 'S0'};
                triggerKeyEvent('Delete', 'keydown', $document[0]);
                $rootScope.$apply();
                expect(deletePage.calledOnce).to.be.ok;
                ctrl.selectedPage = {name: 'S0'};
                triggerKeyEvent('Backspace', 'keydown', $document[0]);
                $rootScope.$apply();
                expect(deletePage.calledTwice).to.be.ok;
            });

            it('undo', function () {
                createController();
                scope.$emit('page-map-view/afterEnter');
                // trigger both ctrl+z and meta+z to be os independent
                triggerKeyEvent('z', 'keydown', $document[0], ['Control']);
                triggerKeyEvent('z', 'keydown', $document[0], ['Meta']);
                $rootScope.$apply();
                expect(uiCommandManagerMock.undo.calledOnce).to.be.ok;
            });

            it('redo', function () {
                createController();
                scope.$emit('page-map-view/afterEnter');
                // trigger both ctrl+z and meta+z to be os independent
                triggerKeyEvent('z', 'keydown', $document[0], ['Control', 'Shift']);
                triggerKeyEvent('z', 'keydown', $document[0], ['Meta', 'Shift']);
                $rootScope.$apply();
                expect(uiCommandManagerMock.redo.calledOnce).to.be.ok;
            });
        });
    });
})();
