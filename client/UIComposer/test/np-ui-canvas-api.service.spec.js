'use strict';
(function () {

    var expect = chai.expect;

    describe('Service: np-ui-canvas-api', function () {
        beforeEach(module('ngResource'));
        beforeEach(module('uiComposer.uiCanvas'));

        var $q, $rootScope, npUiCanvasAPI, npUi5Helper, npUiCatalog, npBindingHelper, npPageMetadataHelper, npImageHelper, npConstants, npPropertyChangeHelper, npMessaging;

        var controls, controlsMd;
        var pageMd;

        var defaultProperties = {
            text: {
                name: 'text',
                defaultValue: 'hello'
            },
            visible: {
                name: 'visible',
                defaultValue: true
            }
        };


        var initControl = function (type, id) {
            return {
                id: id,
                __catalogControlName: type,
                type: type,
                properties: {},
                aggregations: {},
                classes: [],
                domRef: function () {
                    return '<div id="' + this.id + '"></div>';
                }
            };
        };
        var initMd = function (control, parent) {
            var parentId = parent ? parent.id : null;
            return {
                controlId: control.id,
                parentControlId: parentId,
                parentGroupId: null,
                parentGroupIndex: 0,
                properties: [],
                groups: [],
                getParentMd: function () {
                    return npPageMetadataHelper.getControlMd(this.parentControlId);
                },
                getChildrenMd: function (groupId) {
                    var group = _.find(this.groups, {groupId: groupId}) || {};
                    return _.map(group.children, npPageMetadataHelper.getControlMd);
                }
            };
        };


        beforeEach(module(function ($provide) {
            var button = initControl('sap.m.Button', 'button'),
                root = initControl('sap.m.Page', 'root'),
                buttonMd = initMd(button, root),
                rootMd = initMd(root);
            rootMd.groups.push({
                groupId: 'content',
                children: [button.id]
            });
            buttonMd.parentGroupId = 'content';

            controls = [root, button];
            controlsMd = [rootMd, buttonMd];
            pageMd = {
                name: 'S0',
                rootControlId: root.id,
                controls: controlsMd
            };

            npPropertyChangeHelper = {};

            npUi5Helper = {
                setWindow: function () {
                    return $q.when();
                },
                getWindow: function () {
                },
                waitForRendering: function () {
                    return $q.when();
                },
                waitForBinding: function () {
                    return $q.when();
                },
                initControl: initControl,
                insertControl: function () {
                },
                moveControl: function () {
                },
                removeControl: function () {
                },
                updateAggregation: function () {
                },
                bindAggregation: function () {
                },
                getId: function (ctrl) {
                    return ctrl.id;
                },
                getDomRef: function (ctrl) {
                    return ctrl.domRef();
                },
                setControlProperty: function (ctrl, name, value) {
                    ctrl.properties[name] = value;
                },
                getBindingInfo: function () {
                },
                getChild: function () {
                },
                navTo: function () {
                    var deferred = $q.defer();
                    deferred.resolve();
                    return deferred.promise;
                },
                getControlById: function (sId) {
                    return _.find(controls, {id: sId});
                },
                setContext: function () {
                    return $q.reject();
                }
            };

            npUiCatalog = {
                getControlProperties: function () {
                    return defaultProperties;
                },
                getDefaultProperty: function () {
                    return 'text';
                },
                getControlType: function (name) {
                    return name;
                },
                getTagName: function () {
                }
            };

            npBindingHelper = {
                getEntityDefaultPath: function () {
                    return $q.when('defaultPath');
                },
                getExpandPathsFromMd: function () {
                    return 'expandPaths';
                },
                getPath: function () {
                    return;
                }
            };

            npPageMetadataHelper = {
                getControlMd: function (controlId) {
                    return _.find(controlsMd, {controlId: controlId});
                },
                getGroupMd: function (groupId, controlMd) {
                    return _.find(controlMd.groups, {groupId: groupId});
                },
                isTemplate: function () {
                    return false;
                },
                getTopMostTemplate: function () {
                },
                isBound: function () {
                    return false;
                }
            };
            npImageHelper = {
                loadImages: function () {
                    return $q.when();
                }
            };
            npConstants = {
                renderingProperties: {
                    VISIBLE: 'visible'
                }
            };

            npMessaging = {
                showBusyIndicator: function () {
                },
                hideBusyIndicator: function () {
                }
            };

            $provide.value('npUi5Helper', npUi5Helper);
            $provide.value('npUiCatalog', npUiCatalog);
            $provide.value('npBindingHelper', npBindingHelper);
            $provide.value('npPageMetadataHelper', npPageMetadataHelper);
            $provide.value('npImageHelper', npImageHelper);
            $provide.value('npConstants', npConstants);
            $provide.value('npPropertyChangeHelper', npPropertyChangeHelper);
            $provide.value('npMessaging', npMessaging);
        }));

        beforeEach(inject(function ($injector) {
            npUiCanvasAPI = $injector.get('npUiCanvasAPI');
            $q = $injector.get('$q');
            $rootScope = $injector.get('$rootScope');
        }));


        describe('initialization', function () {

            it('init wait for canvas to be rendered', function () {
                var initPromise;
                initPromise = npUiCanvasAPI.init();
                expect(initPromise).to.be.rejected;

                initPromise = npUiCanvasAPI.init(window, 'UI5');
                expect(initPromise).to.eventually.exist;
            });

            it('init should set window and get it back', function () {
                var setWindowSpy = sinon.spy(npUi5Helper, 'setWindow');
                npUiCanvasAPI.init(window, 'UI5');

                expect(setWindowSpy.calledWith(window)).to.be.ok;
                npUi5Helper.setWindow.restore();
            });

            it('should get window from helper', function () {
                npUiCanvasAPI.init(window, 'UI5');
                var spy = sinon.spy(npUi5Helper, 'getWindow');
                npUiCanvasAPI.getWindow();
                expect(spy.called).to.be.ok;
                npUi5Helper.getWindow.restore();
            });
        });


        describe('control metadata methods', function () {
            beforeEach(function () {
                npUiCanvasAPI.init(window, 'UI5');
                npUiCanvasAPI.navTo(pageMd);
                $rootScope.$apply();
            });

            it('should get control dom ref', function () {
                var buttonMd = controlsMd[1],
                    buttonCtrl = controls[1],
                    spy = sinon.spy(npUi5Helper, 'getControlById'),
                    domRef = npUiCanvasAPI.getControlDomRefByMd(buttonMd);
                expect(domRef).to.exist;
                expect(domRef).to.be.equal(buttonCtrl.domRef());
                expect(spy.calledWith(buttonMd.controlId)).to.be.ok;
                npUi5Helper.getControlById.restore();
            });

            it('should wait for control to be ready: set the main entity context', function () {
                pageMd.mainEntity = 'entityId';
                npUiCanvasAPI.navTo(pageMd);

                var bindingSpy = sinon.spy(npBindingHelper, 'getEntityDefaultPath'),
                    helperSpy = sinon.spy(npUi5Helper, 'setContext'),
                    buttonMd = controlsMd[1];
                npUiCanvasAPI.controlReady(buttonMd);
                $rootScope.$apply();

                expect(bindingSpy.calledWith('entityId')).to.be.ok;
                expect(helperSpy.calledWith('defaultPath', 'expandPaths')).to.be.ok;

                npBindingHelper.getEntityDefaultPath.restore();
                npUi5Helper.setContext.restore();
            });

            it('should wait for control to be ready: top most template', function () {
                var bindingSpy = sinon.spy(npUi5Helper, 'waitForBinding'),
                    renderingSpy = sinon.spy(npUi5Helper, 'waitForRendering'),
                    buttonMd = controlsMd[1],
                    rootMd = controlsMd[0],
                    rootCtrl = controls[0];

                rootMd.groups[0].binding = {
                    isRelative: false
                };
                npPageMetadataHelper.getTopMostTemplate = function () {
                    return buttonMd;
                };
                npPageMetadataHelper.isBound = function (groupMd) {
                    return groupMd === rootMd.groups[0];
                };
                npUi5Helper.getBindingInfo = function (ctrl, aggregationName) {
                    if (aggregationName === rootMd.groups[0].groupId) {
                        return {binding: {}};
                    }
                };
                npUiCanvasAPI.controlReady(buttonMd);
                $rootScope.$apply();

                expect(bindingSpy.calledWith(rootCtrl, buttonMd.parentGroupId)).to.be.ok;
                expect(renderingSpy.called).not.to.be.ok;

                npUi5Helper.waitForBinding.restore();
                npUi5Helper.waitForRendering.restore();
            });

            it('should wait for control to be ready: no binding, URI properties', function () {
                var buttonMd = controlsMd[1];
                buttonMd.properties = [{
                    type: 'URI',
                    value: '/api/image/1.png'
                }];
                var spy = sinon.spy(npImageHelper, 'loadImages');
                npUiCanvasAPI.controlReady(buttonMd);
                $rootScope.$apply();
                expect(spy.calledWith([buttonMd.properties[0].value])).to.be.ok;
                buttonMd.properties = [];
                npImageHelper.loadImages.restore();
            });

            it('should wait for control to be ready: no binding', function () {
                var spy = sinon.spy(npUi5Helper, 'waitForRendering'),
                    buttonMd = controlsMd[1],
                    buttonCtrl = controls[1];
                npUiCanvasAPI.controlReady(buttonMd);
                $rootScope.$apply();
                expect(spy.calledWith(buttonCtrl)).to.be.ok;
                npUi5Helper.waitForRendering.restore();
            });


            it('should wait for control to be ready if control is visible', function () {
                var buttonMd = controlsMd[1];
                buttonMd.properties = [{
                    name: 'visible',
                    type: 'boolean',
                    value: true
                }];
                var spy = sinon.spy(npUi5Helper, 'waitForRendering');
                npUiCanvasAPI.controlReady(buttonMd);
                $rootScope.$apply();
                expect(spy.called).to.be.true;
                buttonMd.properties = [];
                npUi5Helper.waitForRendering.restore();
            });

            it('should not wait for control to be ready if control is invisible', function () {
                var buttonMd = controlsMd[1];
                buttonMd.properties = [{
                    name: 'visible',
                    type: 'boolean',
                    value: false
                }];
                var spy = sinon.spy(npUi5Helper, 'waitForRendering');
                npUiCanvasAPI.controlReady(buttonMd);
                $rootScope.$apply();
                expect(spy.called).to.be.false;
                buttonMd.properties = [];
                npUi5Helper.waitForRendering.restore();
            });
        });
    });
})();
