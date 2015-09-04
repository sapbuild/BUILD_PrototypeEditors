'use strict';

var npCssTransitionEndHandler = function () {
    return {
        restrict: 'A',
        scope: {transitionEndCallBack: '&npCssTransitionEndHandler'},
        link: function (scope, element) {
            element.bind('transitionend', function () {
                if (typeof scope.transitionEndCallBack === 'function') {
                    scope.$apply(function () {
                        scope.transitionEndCallBack();
                    });
                }
            });
        }
    };
};

module.exports = npCssTransitionEndHandler;
