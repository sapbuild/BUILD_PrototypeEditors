'use strict';

module.exports = angular.module('Previewer', ['ui.router'])

	.config(['$stateProvider', function ($stateProvider) {
		$stateProvider
			.state('shell.Previewer', {
				url: '/Previewer',
				templateUrl: 'node_modules/norman-prototype-editors-client/Previewer/Previewer.html',
				controller: 'PreviewerCtrl',
                authenticate: false
			});
	}])
	.controller('PreviewerCtrl', require('./Previewer.controller.js'));
