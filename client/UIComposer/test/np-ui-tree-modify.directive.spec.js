'use strict';
(function () {

    var expect = chai.expect;

    describe('Directive: np-ui-tree-modify', function () {

        var $q, elem, scope, pageNode, npPrototypeMock, npPageMetadataMock, pages, stateMock,
            getNameSpy, setNameSpy;

        beforeEach(function () {
            stateMock = {
                params: {
                    currentProject: 1111
                },
                go: function () {
                }
            };

            pageNode = {
                data: {
                    isPageElement: function () {
                        return true;
                    }
                },
                pageName: 'Page 1',
                displayName: 'old Name',
                pageIncomingNavigations: 0
            };

            var nodes = [pageNode];
            pages = [{}];

            npPrototypeMock = {
                getPageDisplayName: function () {
                    return $q.when(pageNode.displayName);
                },
                setPageDisplayName: function (name, value) {
                    pageNode.displayName = value;
                    return $q.when();
                }
            };

            var npMessagingMock = {};
            var npKeyboarderMock = {
                on: function () {
                }
            };

            npPageMetadataMock = {
                setCurrentPageName: function () {
                }
            };

            //module('templates');
            module('uiComposer.uiEditor');

            module(function ($provide) {
                $provide.value('npPrototype', npPrototypeMock);
                $provide.value('npMessaging', npMessagingMock);
                $provide.value('npPageMetadata', npPageMetadataMock);
                $provide.value('npKeyboarder', npKeyboarderMock);
                $provide.value('$state', stateMock);
            });

            inject(function ($rootScope, $compile, _$q_) {
                $q = _$q_;
                elem = angular.element('<np-ui-tree-modify item="node" nodeslength={{tree.nodes.length}}></np-ui-tree-modify>');
                scope = $rootScope.$new();
                scope.node = pageNode;
                scope.tree = {nodes: nodes};
                elem = $compile(elem)(scope);
                scope.$digest();
            });

            getNameSpy = sinon.spy(npPrototypeMock, 'getPageDisplayName');
            setNameSpy = sinon.spy(npPrototypeMock, 'setPageDisplayName');
        });


       /* it('should call edit page name on dblClick', function () {
            var child = elem.children('.np-e-tree-handle-page-input-js');
            var childScope = child.scope();
            var editPageSpy = sinon.spy(childScope, 'editPageOnTree');
            expect(childScope.editing).to.be.equal(false);
            child.triggerHandler('dblclick');
            expect(editPageSpy.called).to.be.equal(true);
            expect(childScope.editing).to.be.equal(true);
        });

        it('should not save page name as length', function () {
            pageNode.displayName = '';
            var child = elem.children('.np-e-tree-handle-page-input-js');
            var childScope = child.scope();
            var saveSpy = sinon.spy(childScope, 'saveDisplayName');
            child.triggerHandler('dblclick');
            expect(childScope.editing).to.be.equal(true);
            child.triggerHandler('blur');
            expect(saveSpy.called).to.be.equal(true);
            expect(getNameSpy.called).to.be.equal(true);
            expect(setNameSpy.called).to.be.equal(false);
            expect(childScope.editing).to.be.equal(false);
            expect(child[0].value).to.be.equal('');
        });

        it('should change and save page name name', function () {
            var child = elem.children('.np-e-tree-handle-page-input-js');
            var childScope = child.scope();
            var saveSpy = sinon.spy(childScope, 'saveDisplayName');
            child.triggerHandler('dblclick');
            expect(childScope.editing).to.be.equal(true);
            child[0].value = 'new Name';
            child.triggerHandler('blur');
            expect(saveSpy.called).to.be.equal(true);
            expect(getNameSpy.called).to.be.equal(true);
            expect(setNameSpy.called).to.be.equal(true);
            expect(childScope.editing).to.be.equal(false);
            expect(pageNode.displayName).to.be.equal('new Name');
        });*/

    });
})();
