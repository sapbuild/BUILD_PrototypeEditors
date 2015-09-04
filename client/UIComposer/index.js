'use strict';

require('./polyfills.js');
require('./mixins.js');
require('./services');
require('./directives');
require('./ui-editor');
require('./page-map-view');
require('./technology-helpers');

module.exports = angular.module('uiComposer', [
        'angularFileUpload',
        'uiComposer.services',
        'uiComposer.directives',
        'uiComposer.uiEditor',
        'uiComposer.uiCanvas',
        'pageMapView',
        'uiComposer.technologyHelpers'
    ])
    .config(uiComposerConfig)
    .run(uiComposerRun);

uiComposerConfig.$inject = ['$provide'];

function uiComposerConfig($provide) {
    addSkipReloadFunctionality();

    function addSkipReloadFunctionality() {
        $provide.decorator('$location', function ($delegate, $rootScope) {
            var skipping = false;

            $rootScope.$on('$locationChangeSuccess', function (event) {
                if (skipping) {
                    event.preventDefault();
                    skipping = false;
                }
            });

            $delegate.skipReload = function () {
                skipping = true;
                return this;
            };

            return $delegate;
        });
    }
}

uiComposerRun.$inject = ['$rootScope', '$state', '$log', 'npEnter', 'featureToggle'];

function uiComposerRun($rootScope, $state, $log, npEnter, featureToggleProvider) {
    var checkFeatureEnabled = function (toState) {
        // If prototype is disable with feature toggle then go back to the welcome page
        featureToggleProvider.isEnabled('enable-prototype')
            .then(function (prototypeEnabled) {
                if (!prototypeEnabled) {
                    if (toState.name === 'ui-composer' || toState.name === 'page-map-view') {
                        event.preventDefault();
                        $state.go('welcome');
                    }
                }
            });
    };

    $rootScope.$on('$stateChangeStart', function (event, toState, toParams, fromState) {
        checkFeatureEnabled(toState);
        npEnter.checkEnter(toState.name, fromState.name);
    });
}
