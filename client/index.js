'use strict';

var _ = require('norman-client-tp').lodash;

require('./SharedWorkSpace');
require('./UIComposer');
require('./DataModeler');
require('./Previewer');
require('./SampleDataManager');

module.exports = angular.module('prototype-editors', [
        'ui.router',
        'ct.ui.router.extras.sticky',
        'ngResource',
        'model',
        'uiComposer',
        'SampleDataManager',
        'Previewer',
        'sharedWorkspace'
    ])
    .config(prototypeEditorsConfig)
    .run(prototypeEditorsRun);

prototypeEditorsConfig.$inject = ['$stateProvider', '$stickyStateProvider'];

function prototypeEditorsConfig($stateProvider, $stickyStateProvider) {
    $stickyStateProvider.enableDebug(true);

    var prototypeEditorsResolve = {
        resPrototypeLock: ['npPrototype', function (npPrototype) {
            return npPrototype.lockPrototype();
        }]
    };

    $stateProvider
        .state('prototype-editor', {
            parent: 'shell.project',
            abstract: true,
            templateUrl: 'resources/norman-prototype-editors-client/prototype-editors.html',
            controller: ['$scope', '$state', function ($scope, $state) {
                $scope.$state = $state;
            }],
            authenticate: true,
            resolve: prototypeEditorsResolve,
            onEnter: onPrototypeEditorsEnter,
            onExit: onPrototypeEditorsExit
        });
}

onPrototypeEditorsEnter.$inject = ['$state', '$timeout', 'resPrototypeLock', 'npPrototype', 'npConcurrentAccessHelper'];

function onPrototypeEditorsEnter($state, $timeout, resPrototypeLock, npPrototype, npConcurrentAccessHelper) {
    if (resPrototypeLock.success) {
        npConcurrentAccessHelper.enableUnlockMonitoring();
    }
    else {
        var prototpyeViewModeData = npPrototype.getPrototypeViewModeData();
        if (!angular.isDefined(prototpyeViewModeData) || !prototpyeViewModeData.prototypeViewMode) {
            // TODO: $timeout wrapping is needed as a workaround to get the $state.go to work properly within onEnter. This is a known $stateProvider issue. Not sure if it will ever be fixed.
            $timeout(function () {
                $state.go('shell.project.prototype', {
                    currentProject: $state.params.currentProject
                });
            });
        }
    }
}

onPrototypeEditorsExit.$inject = ['npConcurrentAccessHelper'];

function onPrototypeEditorsExit(npConcurrentAccessHelper) {
    npConcurrentAccessHelper.handleUnlock();
}

prototypeEditorsRun.$inject = ['$rootScope'];

function prototypeEditorsRun($rootScope) {
    /**
     * @description
     * Broadcast the 'beforeExit' and 'beforeEnter' events for state transitions
     * 'beforeExit' will fire before controllers and their scopes are destroyed
     * 'beforeEnter' will fire before controllers and their scopes are instantiated
     */
    $rootScope.$on('$stateChangeStart', function (event, toState, toParams, fromState) {
        $rootScope.$broadcast(fromState.name + '/beforeExit');
        $rootScope.$broadcast(toState.name + '/beforeEnter');
    });

    /**
     * @description
     * Broadcast the 'afterExit' and 'afterEnter' events for state transitions
     * 'afterExit' will fire after controllers and their scopes are destroyed
     * 'afterEnter' will fire after controllers and their scopes are instantiated
     */
    $rootScope.$on('$stateChangeSuccess', function (event, toState, toParams, fromState) {
        _.defer(function () {
            $rootScope.$broadcast(fromState.name + '/afterExit');
            $rootScope.$broadcast(toState.name + '/afterEnter');
        });
    });
}
