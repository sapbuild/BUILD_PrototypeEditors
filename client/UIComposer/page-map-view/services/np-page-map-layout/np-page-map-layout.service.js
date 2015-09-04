'use strict';

var _ = require('norman-client-tp').lodash;
var d3 = require('norman-client-tp').d3;

module.exports = npPageMapLayout;
npPageMapLayout.$inject = ['$document', 'npJsPlumb'];


function npPageMapLayout($document, npJsPlumb) {

    var elementHeight = 180, elementWidth = 220, gridTop = -1, gridLeft = -1,
        defaultColor = '#F0F2F3', highlightColor = '#2ECC71';

    /**
     * @private
     * @description Prototype of each page
     */
    var pageNode = {
        id: '-1',
        displayName: '',
        name: null,
        thumbnailUrl: '',
        isConnected: false
    };

    /**
     * @private
     * @description Prototype of each edge
     */
    var links = {
        id: '-1',
        pageFrom: null,
        pageTo: null
    };

    return {
        getGridLayout: getGridLayout,
        getConnectedPages: getConnectedPages,
        showHighlightedConnections: showHighlightedConnections,
        createLayout: createLayout,
        createConnections: createConnections
    };

    function _createEdges(edges) {
        return _.map(edges, function (edge) {
            var node = Object.create(links);
            _.extend(node, {
                pageFrom: edge.pageFrom,
                pageTo: edge.pageTo,
                id: edge._id,
                highlight: false,
                firstoccurance: false
            });
            return node;
        });
    }

    function _createPageNodes(pages) {
        return _.map(pages, function (page, index) {
            var node = Object.create(pageNode);
            _.extend(node, {
                displayName: page.displayName,
                name: page.name,
                id: page.id,
                thumbnailUrl: page.thumbnailUrl,
                position: {},
                highlight: false
            });
            if (index === 0) {
                node.isHome = true;
            }
            return node;
        });
    }

    function getContainerWidth() {
        var pageMap = $document[0].querySelector('.np-p-page-map-container');
        if (pageMap) {
            return angular.element(pageMap)[0].offsetWidth;
        }
    }

    /**
     * @name getGridLayout
     * @memberof npPageMapLayout
     * @description Sets the initial position of pages in a grid layout.
     * @param {Array} returns array of pages with position object having top left properties
     */

    function getGridLayout(pageNodes) {
        if (_.isEmpty(pageNodes)) {
            return undefined;
        }
        var grid = $document[0].getElementById('np-p-page-map-grid');
        gridTop = -1;
        gridLeft = -1;
        var positions = {
            top: '0px',
            left: '0px'
        };
        _.forEach(pageNodes, function (page) {
            page.highlight = true;
            positions = _getPositionsForNewPage();
            page.position = {
                top: positions.top + 'px',
                left: positions.left + 'px'
            };
        });
        if (grid) {
            grid.style.height = positions.top + elementHeight + 'px';
        }
        return pageNodes;
    }

    /**
     * @private
     * @name getPositionsForNewPage
     * @memberof npPageMapLayout
     * @description gets the position for the new page
     * @param {Array} pages array
     * @returns {Object} position object having top left properties of the new page
     */
    function _getPositionsForNewPage() {
        var containerWidth = getContainerWidth();
        if (gridLeft < 0 && gridTop < 0) {
            gridTop = 20;
            gridLeft = 20;
        }
        else {
            if (gridLeft + (2 * elementWidth) < containerWidth) {
                gridLeft = gridLeft + elementWidth;
            }
            else {
                gridLeft = 20;
                gridTop = gridTop + elementHeight;
            }
        }
        return {
            left: gridLeft,
            top: gridTop
        };
    }

    /**
     * @private
     * @name createUniqueEdges
     * @memberof npPageMapLayout
     * @description gets the unique edges
     * @param {Array} connections array
     * @returns {Array} filters out repeated edges
     */
    function _createUniqueEdges(connections) {
        var uniqueEdges = [];
        var edges = _createEdges(connections);
        _.forEach(edges, function (edge) {
            if (_.isEmpty(uniqueEdges)) {
                uniqueEdges.push(edge);
            }
            else {
                if (!_.some(uniqueEdges, {pageTo: edge.pageTo, pageFrom: edge.pageFrom})) {
                    uniqueEdges.push(edge);
                }
            }
        });

        return uniqueEdges;
    }

    /**
     * @name applyFirstOccurenceRuleOnLinks
     * @memberof npPageMapLayout
     * @description Marks the links according to the rule of first occurence, i.e, the nearest links to the page from the first page is included into first occurence links
     *              and also marks the depth of each page according to the rule.
     * @param {Array} pages, connected pages array
     * @param {Array} edges, unique edges array
     **/
    function applyFirstOccurenceRuleOnLinks(pages, edges) {
        var pagesLookUp = [], connectedPageTo;
        _.forEach(pages, function (page) {
            var edgesFromCurrentPage = _.filter(edges, {pageFrom: page.name});
            if (edgesFromCurrentPage.length) {
                if (page.depth === undefined) {
                    page.depth = 0;
                }
                _.forEach(edgesFromCurrentPage, function (edge) {
                    var edgeToPageName = edge.pageTo;
                    var index = _.indexOf(pagesLookUp, edgeToPageName);
                    if (index < 0) {
                        connectedPageTo = _.filter(pages, {name: edgeToPageName})[0];
                        if (connectedPageTo) {
                            if (connectedPageTo.depth === undefined) {
                                if (page.depth !== undefined) {
                                    connectedPageTo.depth = page.depth + 1;
                                    //First Occurence links are marked
                                    edge.firstoccurance = true;
                                    //Highlight set to true when no page is selected
                                    edge.highlight = true;
                                }
                                else {
                                    connectedPageTo.depth = 0;
                                }
                            }
                            pagesLookUp.push(edgeToPageName);
                        }
                    }
                });
            }
        });
    }

    /**
     * @name getConnectedPages
     * @memberof npPageMapLayout
     * @description gets connected, unconnected Pages and unique edges
     * @param {Array} prototypes, pages array
     * @param {Array} connections, edges array
     * @returns {Object} Object of filtered first occurence links, connected pages array, unconnected pages array
     **/
    function getConnectedPages(prototypes, connections) {
        var connectedPages = [], connectedPageNames = [];
        var pages = _createPageNodes(prototypes);
        var uniqueEdges = _createUniqueEdges(connections);

        connectedPageNames = _.union(_.pluck(uniqueEdges, 'pageTo'), _.pluck(uniqueEdges, 'pageFrom'));

        connectedPages = _.filter(pages, function (page) {
            if (_.contains(connectedPageNames, page.name)) {
                //All connected Pages
                page.isConnected = true;
                //highlight is true for the first time when no pages are selected
                page.highlight = true;
                return true;
            }
        });

        applyFirstOccurenceRuleOnLinks(connectedPages, uniqueEdges);

        return {
            edges: uniqueEdges,
            connectedPages: connectedPages,
            unConnectedPages: _.difference(pages, connectedPages)
        };
    }


    function resetHighlightedPages(pages) {
        _.forEach(pages, function (page) {
            page.highlight = false;
        });
    }

    function createConnection(navigation) {
        var sourcePage = 'np-p-screen-' + navigation.pageFrom,
            targetPage = 'np-p-screen-' + navigation.pageTo,
            color = navigation.highlight ? highlightColor : defaultColor,
            paintStyle = {strokeStyle: color, lineWidth: 1};
        var myConnection = npJsPlumb.getConnection(sourcePage, targetPage)[0];
        if (myConnection) {
            myConnection.setPaintStyle(paintStyle);
        }
        else {
            npJsPlumb.instance.connect({
                source: sourcePage,
                target: targetPage,
                name: navigation._id,
                paintStyle: paintStyle
            });
        }
    }

    /**
     * @name showHighlightedConnections
     * @memberof npPageMapLayout
     * @description filters the links which have direct relation to the selected page
     * @param {Object} selected page
     * @param {Array} edges array
     * @param {Array} pages array
     * @param {Array} unconnected pages array
     * @returns {Array}  links, with highlighted properties set
     **/
    function showHighlightedConnections(selectedPage, edges, pages, unconnectedPages) {
        // reset highlighting property for pages
        resetHighlightedPages(pages);
        resetHighlightedPages(unconnectedPages);

        calculateHighlights(edges, pages, selectedPage);

        if (!selectedPage.isConnected) {
            selectedPage.highlight = true;
        }

        return edges;
    }

    function calculateHighlights(navigations, pages, selectedPage) {
        _.forEach(navigations, function (navigation) {
            var highlight = false;
            if (navigation.pageTo === selectedPage.name || navigation.pageFrom === selectedPage.name) {
                var pageTo = _.find(pages, {name: navigation.pageTo});
                var pageFrom = _.find(pages, {name: navigation.pageFrom});
                if (pageTo) {
                    pageTo.highlight = true;
                }
                if (pageFrom) {
                    pageFrom.highlight = true;
                }
                highlight = true;
            }
            navigation.highlight = highlight;
            createConnection(navigation);
        });
    }


    /**
     * @name createConnections
     * @memberof npPageMapLayout
     * @description draws the connections based on highlight property
     **/
    function createConnections(edges) {
        _.forEach(edges, createConnection);
    }


    /**
     * @name _getGroupedData
     * @memberof npPageMapLayout
     * @description groups the data in a hierarchical order
     * @param {Array} rootNodes pages array with highest parents
     *  @param {Array} edges first occurence edges array
     * @returns {Array} treeData array which is hierarchical
     **/
    function _getGroupedData(rootNodes, edges) {
        var nodeName = null;
        var treeData = [];

        _.forEach(rootNodes, function (root) {
            // Add links connecting null to the parent nodes
            edges.push({
                id: 'page' + root.name,
                pageFrom: nodeName,
                pageTo: root.name,
                target: 'pages'
            });
        });

        var dataMap = edges.reduce(function (map, node) {
            map[node.pageTo] = node;
            return map;
        }, {});

        _.forEach(edges, function (node) {
            var parent = dataMap[node.pageFrom];
            if (parent) {
                (parent.children || (parent.children = [])).push(node);
            }
            else {
                treeData.push(node);
            }
        });
        return treeData;
    }

    /**
     * @name createLayout
     * @memberof npPageMapLayout
     * @description creates d3 tree layout for all the connected nodes
     * @param {Array} nodes connected pages array
     *  @param {Array} edges first occurence edges array
     * @returns {Array} nodes connected pages with layout information as positions
     **/
    function createLayout(nodes, edges) {
        var layout = $document[0].getElementById('np-p-page-map-layout');

        var rootNodes = _.filter(nodes, {depth: 0});
        // Need to filter edges as the layout is hierarchical so only feed first occurance edges
        var firstOccuranceEdges = _.filter(edges, {firstoccurance: true});
        var groupedData = _getGroupedData(rootNodes, firstOccuranceEdges);
        var prevHeight = 0;
        _.forEach(groupedData, function (data) {
            var tree = d3.layout.tree().nodeSize([elementHeight, elementWidth]);
            var treeNodes = tree.nodes(data);
            var HeightValues = _findHeight(treeNodes);
            var height = HeightValues.height;

            _.forEach(treeNodes, function (treeNode) {
                var currentNode = _.filter(nodes, {name: treeNode.pageTo});
                var position = currentNode[0].position;
                if (!position.top && !position.left) {
                    var topX = height + prevHeight + treeNode.x;
                    if (topX > 0) {
                        position.top = topX + 'px';
                    }
                    else {
                        position.top = '0px';
                    }
                    position.left = treeNode.y + 'px';
                }

            });
            prevHeight = prevHeight + elementHeight + height + HeightValues.offset;
        });

        if (layout) {
            layout.style.height = prevHeight + 'px';
        }

        return nodes;
    }


    /**
     * @name _findHeight
     * @memberof npPageMapLayout
     * @description finds the height of the layout and also offset between layouts
     * @param {Array} nodes connected pages array
     * @returns {Object} height of the layout and also offset between layouts
     **/
    function _findHeight(nodes) {
        var height = 0, offset = 0;
        if (nodes) {
            _.forEach(nodes, function (node) {
                var nodeX = Math.abs(node.x), nodeXOffset = node.x;
                if (nodeX > height) {
                    height = nodeX;
                }
                if (nodeXOffset > offset) {
                    offset = nodeXOffset;
                }
            });
        }
        return {
            height: height,
            offset: offset
        };
    }
}
