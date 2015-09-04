'use strict';

var jsPlumb = require('norman-client-tp').jsPlumb;

module.exports = npJsPlumb;

npJsPlumb.$inject = ['$log'];
function npJsPlumb($log) {

    var service = {
        instance: null,
        PAINT_STYLE_NAV_TO: {strokeStyle: '#F0F2F3', lineWidth: 1},
        getConnection: getConnection,
        init: init,
        repaintEverything: repaintEverything,
        reset: reset
    };

    return service;

    function _getInstance() {
        if (!service.instance) {
            service.instance = jsPlumb.getInstance({

                // drag options
                DragOptions: {cursor: 'pointer', zIndex: 5000},

                Endpoint: ['Dot', {radius: 2}],
                PaintStyle: service.PAINT_STYLE_NAV_TO,
                ConnectionOverlays: [
                    ['PlainArrow', {
                        location: [1],
                        id: 'arrow',
                        length: 6,
                        width: 5
                    }]
                ],
                Anchors: [[[0, 0.5, -1, 0, 0, -5, 'Left'], 'Top', 'Right', 'Bottom'], [[0, 0.5, -1, 0, 0, 5, 'Left'],
                    [1, 0.5, 1, 0, 0, -10, 'Right'],
                    [0.5, 0, 0, -1, -10, 0, 'Top'],
                    [0.5, 1, 0, 1, 0, 0, 'Bottom']]],

                Connector: ['Bezier', {curviness: 35}]
            });
        }
        return service.instance;

    }

    /**
     * @name getConnection
     * @description retrieves the connector for a given source and target.
     * @param {String} sId source id of connection
     * @param {String} tId target id of connection
     * @param {String} name of connector to be retrieved
     * @returns {object} connection object for given source and target.
     */

    function getConnection(sId, tId, name) {
        if (service.instance) {
            return service.instance.getConnections({source: sId, target: tId, name: name});
        }
    }

    /**
     * @name init
     * @description Inititializes the jsplumb instance.
     */
    function init() {
        jsPlumb.ready(function () {
            _getInstance();
            $log.info('jsPlumbService ready');
        });
    }

    /**
     * @name repaintEverything
     * @description redraws all the connectors and nodes for that jsplumb instance.
     */
    function repaintEverything() {
        if (service.instance) {
            service.instance.repaintEverything();
        }
    }

    /**
     * @name reset
     * @description resets the Jsplumb instance.
     */
    function reset() {
        if (service.instance) {
            service.instance.cleanupListeners();
            service.instance.deleteEveryEndpoint();
            service.instance.reset();
            service.instance.detachEveryConnection();
            service.instance = null;
        }
    }
}

