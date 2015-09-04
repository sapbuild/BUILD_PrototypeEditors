'use strict';

require('./dataModelEditor/dataModelDesigner');

require('norman-client-tp');

module.exports = angular.module('model', ['dataModeler.designer'])
    .config(['$stateProvider', function dataModelerConfig($stateProvider) {

        $stateProvider
            .state('models', {
                parent: 'prototype-editor',
                url: '/dataModel',
                views: {
                    'data-model': {
                        templateUrl: 'resources/norman-prototype-editors-client/DataModeler/dataModelEditor/dataModelEditor.html',
                        controller: 'HeaderBarController',
                        controllerAs: 'ctrl'
                    }
                },
                authenticate: true
            });
    }])
    .service('dm.ModelEditorService', require('./services/dataModelEditor.service.js'))
    .service('dm.SidePanelService', require('./services/sidePanel.service.js'))
    .factory('dm.Entity', require('./services/entity.service.js'))
    .factory('dm.Model', require('./services/model.service.js'))
    .factory('dm.Navigation', require('./services/navigation.service.js'))
    .factory('dm.Property', require('./services/property.service.js'))
    .factory('dm.Catalog', require('./services/catalog.service.js'))
    .factory('dm.Group', require('./services/group.service.js'))
    .controller('HeaderBarController', require('./dataModelEditor/header/headerBar.controller.js'))
    .controller('SidePanelController', require('./dataModelEditor/sidePanel/sidePanelEditor.controller.js'))
    .controller('SampleDataController', require('./dataModelEditor/sidePanel/sampleData.controller.js'))
    .controller('RelationsController', require('./dataModelEditor/sidePanel/relations.controller.js'))
    .controller('PropertiesController', require('./dataModelEditor/sidePanel/properties.controller.js'))
    .controller('GroupsController', require('./dataModelEditor/sidePanel/groups.controller.js'))
    .controller('SearchCatalogController', require('./dataModelEditor/popUps/searchCatalog.controller.js'))
    .controller('MessageInformationController', require('./dataModelEditor/popUps/messageInformation.controller.js'));

// FIXME To be migrated
require('./dataModelEditor/popUps/formulaEditor.controller.js');
require('./interceptor');
