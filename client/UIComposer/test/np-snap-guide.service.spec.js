'use strict';

(function () {

    var expect = chai.expect;

    describe('Service: np-snap-guide', function () {
        var documentBody;

        var createDOMElement = function (width, height, left, top, position) {
            var element = angular.element('<div></div>');
            element.css({
                width: width,
                height: height,
                left: left,
                top: top,
                position: position
            });
            documentBody.append(element);
            return element;
        };

        var parseFloatRound = function (value) {
            return Math.round(parseFloat(value));
        };

        var singleGuideLineTest = function (type, npSnapGuide, width, height, left, top, position, testGuideLineLength, testLeft, testTop) {
            var element = createDOMElement(width, height, left, top, position);

            npSnapGuide.setSnappingEnabled(true);
            npSnapGuide.updateElementsPositions(element);
            npSnapGuide.updateSnapPosition(parseInt(element[0].style.left), parseInt(element[0].style.top), element);

            var guides;
            if (type === 'height') {
                guides = npSnapGuide.getVerticalGuides();
            }
            else {
                guides = npSnapGuide.getHorizontalGuides();
            }
            expect(parseFloatRound(guides[0].style[type])).to.be.at.most(testGuideLineLength);
            expect(parseFloatRound(guides[0].style.left)).to.be.at.most(testLeft);
            expect(parseFloatRound(guides[0].style.top)).to.be.at.most(testTop);
        };


        beforeEach(module('uiComposer.uiCanvas'));

        beforeEach(function () {
            var npGrid = {};

            module(function ($provide) {
                $provide.value('npGrid', npGrid);
            });

            inject(function ($document) {
                documentBody = angular.element($document[0].body);
                npGrid.getElements = function () {
                    var elements;

                    var element = createDOMElement('100px', '50px', '100px', '100px', 'absolute');
                    elements = [{
                        domRef: function () {
                            return element;
                        },
                        style: {
                            top : '100px',
                            left : '100px'
                        }
                    }];
                    elements[0].children = [_.clone(elements[0])];
                    return elements;
                };
                npGrid.getRootElement = function () {
                    return {style: {}};
                };
            });
        });

        afterEach(inject(function (npSnapGuide) {
            npSnapGuide.clearGuideLines();
            npSnapGuide.setSnappingEnabled(false);
        }));

        it('test horizontal right', inject(function (npSnapGuide) {
            singleGuideLineTest('height', npSnapGuide, '40px', '20px', '60px', '50px', 'absolute', 101, 100, 50);
        }));

        it('test horizontal center', inject(function (npSnapGuide) {
            singleGuideLineTest('height', npSnapGuide, '40px', '20px', '80px', '50px', 'absolute', 101, 100, 50);
        }));

        it('test horizontal right', inject(function (npSnapGuide) {
            singleGuideLineTest('height', npSnapGuide, '40px', '20px', '100px', '50px', 'absolute', 101, 100, 50);
        }));

        it('test vertical top', inject(function (npSnapGuide) {
            singleGuideLineTest('width', npSnapGuide, '40px', '20px', '0px', '80px', 'absolute', 200, 0, 100);
        }));

        it('test vertical center', inject(function (npSnapGuide) {
            singleGuideLineTest('width', npSnapGuide, '40px', '20px', '0px', '105px', 'absolute', 200, 0, 126);
        }));

        it('test vertical bottom', inject(function (npSnapGuide) {
            singleGuideLineTest('width', npSnapGuide, '40px', '20px', '0px', '130px', 'absolute', 200, 0, 151);
        }));
    });
})();
