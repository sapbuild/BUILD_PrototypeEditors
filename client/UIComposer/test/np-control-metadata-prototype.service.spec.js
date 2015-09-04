'use strict';
(function () {

    var expect = chai.expect;

    describe('Service: np-control-metadata-prototype', function () {
        var npControlMetadataPrototype;

        beforeEach(module('uiComposer.services'));

        beforeEach(function () {
            inject(function ($injector) {
                npControlMetadataPrototype = $injector.get('npControlMetadataPrototype');
            });
        });

        it('should expose a function that sets the prototype of a control metadata object', function () {
            expect(npControlMetadataPrototype.setControlMdPrototype).to.be.a('function');
        });

        it('should attach certain functions to the passed control metadata object', function () {
            var controlMd = {},
                pageMd = {};

            npControlMetadataPrototype.setControlMdPrototype(controlMd, pageMd);

            expect(controlMd.getParentMd).to.be.a('function');
            expect(controlMd.getChildrenMd).to.be.a('function');
            expect(controlMd.isRootChild).to.be.a('function');
        });

        describe('getParentMd: ', function () {
            it('should return the control metadata object\'s parent', function () {
                var parentMd = {
                        controlId: 'parent'
                    },
                    controlMd = {
                        parentControlId: 'parent'
                    },
                    pageMd = {
                        controls: [parentMd, controlMd]
                    };
                npControlMetadataPrototype.setControlMdPrototype(controlMd, pageMd);
                expect(controlMd.getParentMd()).to.be.equal(parentMd);
            });
        });

        describe('getChildrenMd: ', function () {
            it('should return the control metadata object\'s children for a certain group', function () {
                var child1 = {
                        controlId: 'child1'
                    },
                    child2 = {
                        controlId: 'child2'
                    },
                    parentMd = {
                        groups: [{
                            groupId: 'aGroupId',
                            children: ['child1', 'child2']
                        }]
                    },
                    pageMd = {
                        controls: [child1, child2, parentMd]
                    };
                npControlMetadataPrototype.setControlMdPrototype(parentMd, pageMd);
                var children = parentMd.getChildrenMd('aGroupId');
                expect(children.length).to.be.equal(2);
                expect(children).to.be.deep.equal([child1, child2]);
            });
        });

        describe('isRootChild: ', function () {
            it('should return whether the control is a direct child of the root control', function () {
                var child1 = {
                        parentControlId: 'rootCtrl'
                    },
                    child2 = {
                        parentControlId: 'notRootCtrl'
                    },
                    pageMd = {
                        rootControlId: 'rootCtrl'
                    };
                npControlMetadataPrototype.setControlMdPrototype(child1, pageMd);
                npControlMetadataPrototype.setControlMdPrototype(child2, pageMd);
                expect(child1.isRootChild()).to.be.true;
                expect(child2.isRootChild()).to.be.false;
            });
        });
    });
})();
