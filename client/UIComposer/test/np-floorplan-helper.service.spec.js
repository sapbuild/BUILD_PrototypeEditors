'use strict';
(function () {

    var expect = chai.expect;

    describe('Service: np-floorplan-helper', function () {
        beforeEach(module('ui.router'));
        beforeEach(module('ngResource'));
        beforeEach(module('uiComposer.services'));

        var $q, $rootScope, npFloorplanHelper;
        var npUiCatalogMock, npPrototypeMock;
        var prototypeData, startFloorplans, compatibleFloorplans;

        beforeEach(function () {
            prototypeData = {
                catalogId: '1',
                pages: [{}]
            };
            npUiCatalogMock = {
                getCompatibleFloorplans: function () {
                    return $q.when(compatibleFloorplans);
                },
                getFloorplans: function () {
                    return $q.when(startFloorplans);
                }
            };
            npPrototypeMock = {
                getPrototype: function () {
                    return $q.when(prototypeData);
                }
            };
            module(function ($provide) {
                $provide.value('npUiCatalog', npUiCatalogMock);
                $provide.value('npPrototype', npPrototypeMock);
            });
        });

        beforeEach(inject(function ($injector) {
            $q = $injector.get('$q');
            $rootScope = $injector.get('$rootScope');
            npFloorplanHelper = $injector.get('npFloorplanHelper');
        }));

        it('init properly', function () {
            expect(npFloorplanHelper).to.be.ok;
        });

        it('call getFloorplans when no pages', function () {
            var fpSpy = sinon.spy(npUiCatalogMock, 'getFloorplans'),
                compatSpy = sinon.spy(npUiCatalogMock, 'getCompatibleFloorplans');
            prototypeData.pages = [];
            npFloorplanHelper.getValidFloorplans();
            $rootScope.$apply();
            expect(fpSpy.calledOnce).to.be.ok;
            expect(compatSpy.called).not.to.be.ok;
        });

        it('call getCompatibleFloorplans when has pages', function () {
            var fpSpy = sinon.spy(npUiCatalogMock, 'getFloorplans'),
                compatSpy = sinon.spy(npUiCatalogMock, 'getCompatibleFloorplans');
            npFloorplanHelper.getValidFloorplans();
            $rootScope.$apply();
            expect(fpSpy.calledOnce).not.to.be.ok;
            expect(compatSpy.calledOnce).to.be.ok;
            expect(compatSpy.calledWith(prototypeData.catalogId)).to.be.ok;
        });

        describe('smart templates:', function () {
            it('should keep only non-smart floorplans and root floorplans', function () {
                startFloorplans = [{
                    name: 'ABSOLUTE',
                    isSmart: false,
                    isRootFloorplan: false
                }, {
                    name: 'ListReport',
                    isSmart: true,
                    isRootFloorplan: true
                }, {
                    name: 'ObjectPage',
                    isSmart: true,
                    isRootFloorplan: false
                }];
                prototypeData.pages = [];
                var filteredFloorplans = [startFloorplans[0], startFloorplans[1]];
                var fpPromise = npFloorplanHelper.getValidFloorplans();
                $rootScope.$apply();
                expect(fpPromise).to.eventually.deep.equal(filteredFloorplans);
                expect(startFloorplans).to.deep.equal(filteredFloorplans);
            });

            it('should keep only non-root floorplans if prototype is a smart app with already a page in it', function () {
                prototypeData.isSmartApp = true;
                compatibleFloorplans = [{
                    name: 'ABSOLUTE',
                    isSmart: false,
                    isRootFloorplan: false
                }, {
                    name: 'ListReport',
                    isSmart: true,
                    isRootFloorplan: true
                }, {
                    name: 'ObjectPage',
                    isSmart: true,
                    isRootFloorplan: false
                }];
                var filteredFloorplans = [compatibleFloorplans[2]];
                var fpPromise = npFloorplanHelper.getValidFloorplans();
                $rootScope.$apply();
                expect(fpPromise).to.eventually.deep.equal(filteredFloorplans);
                expect(compatibleFloorplans).to.deep.equal(filteredFloorplans);
            });
        });
    });
})();
