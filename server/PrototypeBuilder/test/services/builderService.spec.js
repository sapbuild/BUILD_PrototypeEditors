'use strict';

var chai = require('norman-testing-tp').chai;
var sinon = require('norman-testing-tp').sinon;
require('norman-server-tp');
var PrototypeBuilderService = require('../../lib/services/builder/index.js');
var commonBuilder = require('../../lib/services/builder/builderUtils.js');
var fs = require('fs');
var path = require('path');
var expect = chai.expect;
var commonServer = require('norman-common-server');
var mongoose = commonServer.db.mongoose;
var ObjectId = mongoose.Types.ObjectId;

describe('Builder Service', function () {

    var uiCatalogService;
    var sharedWorkspaceService;
    var artifactService;
    var protoBuilder;
    var assetService;
    var projectId = new ObjectId();
    var assetId = new ObjectId();
    var badProjectId = new ObjectId();
    var badAssetId = new ObjectId();

    var currentDataModel;
    var currentAppMetadata;
    var currentPageMetadata;
    var currentSampleMetadata;

    var retrieveTestData = function (testFileName) {
        var testData = {};
        testData.jsonSource = JSON.parse(fs.readFileSync(path.resolve(__dirname, testFileName + '.json')), 'utf-8');
        testData.jsonSource._id = testData.jsonSource.name;
        if (fs.existsSync(path.resolve(__dirname, testFileName + '.xml'))) {
            testData.xmlTarget = fs.readFileSync(path.resolve(__dirname, testFileName + '.xml')).toString().replace(/\r\n/g, '\n').replace(/\t/g, '    ');
        }
        if (fs.existsSync(path.resolve(__dirname, testFileName + '.controller'))) {
            testData.controllerTarget = fs.readFileSync(path.resolve(__dirname, testFileName + '.controller')).toString().replace(/\r\n/g, '\n').replace(/\t/g, '    ');
        }
        return testData;
    };

    before(function (done) {
        this.timeout(5000);
        var uiCatalogCustom = JSON.parse(fs.readFileSync(path.resolve(__dirname, './material/r1c1ui5.json')), 'utf-8');
        var uiCatalogRoot = JSON.parse(fs.readFileSync(path.resolve(__dirname, './material/r1ui5.json')), 'utf-8');
        uiCatalogService = {
            getCompatibleCatalogs: function () {
                return new Promise(function (resolve) {
                    resolve([uiCatalogCustom, uiCatalogRoot]);
                });
            }
        };
        sharedWorkspaceService = {
            getMetadata: function () {
                return new Promise(function (resolve) {
                    resolve({
                        appMetadata: {
                            toObject: function () {
                                return currentAppMetadata;
                            }
                        },
                        pageMetadata: {
                            toObject: function () {
                                return currentPageMetadata;
                            }
                        },
                        dataModelMetadata: [{
                            toObject: function () {
                                return currentDataModel;
                            }
                        }],
                        sampleMetadata: [{
                            toObject: function () {
                                return currentSampleMetadata;
                            }
                        }]
                    });
                });
            }
        };
        artifactService = {
            uploadArtifacts: function (uploadProjectId) {
                return new Promise(function (resolve, reject) {
                    if (uploadProjectId === badProjectId) {
                        reject('Bad Project ID');
                    }
                    else {
                        resolve('OK');
                    }
                });
            },
            removeArtifactByMetadata: function (metadata) {
                return new Promise(function (resolve, reject) {
                    if (metadata.projectId === badProjectId) {
                        reject('Bad Project ID');
                    }
                    else {
                        resolve('OK');
                    }
                });
            },
            copyAssetsToArtifacts: function () {

            }
        };
        assetService = {
            getAssets: function (assetsProjectId) {
                return new Promise(function (resolve, reject) {
                    if (assetsProjectId === badProjectId) {
                        reject('Bad Project ID');
                    }
                    else {
                        resolve([{_id: assetId, filename: 'asset1.png'}]);
                    }
                });
            },
            getAssetWithContent: function (requestAssetId) {
                return new Promise(function (resolve, reject) {
                    if (requestAssetId === badAssetId) {
                        reject('Bad Project ID');
                    }
                    else {
                        resolve({fileContent: 'AssetOK'});
                    }
                });
            }
        };
        protoBuilder = new PrototypeBuilderService(sharedWorkspaceService, uiCatalogService, artifactService, assetService);
        protoBuilder.initialize(done);
   });

    beforeEach(function () {
        currentDataModel = {
            projectId: projectId, entities: [
                JSON.parse(fs.readFileSync(path.resolve(__dirname, './material/datamodels/SalesOrder.json')), 'utf-8'),
                JSON.parse(fs.readFileSync(path.resolve(__dirname, './material/datamodels/SalesOrderItem.json')), 'utf-8'),
                JSON.parse(fs.readFileSync(path.resolve(__dirname, './material/datamodels/Product.json')), 'utf-8')
            ]
        };

        currentSampleMetadata = {
            projectId: projectId, entities: [
                JSON.parse(fs.readFileSync(path.resolve(__dirname, './material/sampledata/SalesOrder.json')), 'utf-8'),
                JSON.parse(fs.readFileSync(path.resolve(__dirname, './material/sampledata/SalesOrderItem.json')), 'utf-8'),
                JSON.parse(fs.readFileSync(path.resolve(__dirname, './material/sampledata/Product.json')), 'utf-8')
            ]
        };
    });

    describe('can be stubbed', function () {
        it('will not work if you don\'t pass all the parameters', function () {
            var proto1 = new PrototypeBuilderService(sharedWorkspaceService);
            expect(proto1.initialized).to.be.false;
            var proto2 = new PrototypeBuilderService(sharedWorkspaceService, uiCatalogService);
            expect(proto2.initialized).to.be.false;
        });

        var registrySpy;
        before(function () {
            registrySpy = sinon.spy(commonServer.registry, 'getModule');
        });
        after(function () {
            registrySpy.restore();
        });
        it('will not allow to reinitialized an initialized builder service', function () {
            expect(protoBuilder.initialized).to.be.true;
            protoBuilder.onInitialized();
            expect(commonServer.registry.getModule.callCount).to.equal(0);
        });
    });

    describe('knows how to generate a snapshot', function () {

        before(function () {
            sinon.spy(uiCatalogService, 'getCompatibleCatalogs');
            sinon.spy(sharedWorkspaceService, 'getMetadata');
            sinon.spy(artifactService, 'uploadArtifacts');
            sinon.spy(artifactService, 'copyAssetsToArtifacts');
            sinon.spy(assetService, 'getAssetWithContent');
        });

        after(function () {
            uiCatalogService.getCompatibleCatalogs.restore();
            sharedWorkspaceService.getMetadata.restore();
            artifactService.uploadArtifacts.restore();
            artifactService.copyAssetsToArtifacts.restore();
            assetService.getAssetWithContent.restore();
        });

        it('when you pass everything to it', function (done) {

            var testData = retrieveTestData('material/properties/simplePage');
            var testData2 = retrieveTestData('material/groups/pageWithChildren');
            var testData3 = retrieveTestData('material/assets/pageWithAsset');
            var sampleRouter = fs.readFileSync(path.resolve(__dirname, 'material/ui5/tripleRouter.js.tmpl')).toString().replace(/\r\n/g, '\n').replace(/\t/g, '    ');
            currentPageMetadata = [testData.jsonSource, testData2.jsonSource, testData3.jsonSource];
            currentAppMetadata = {
                uiLang: 'ui5',
                appType: 'App',
                catalogId: 'customCatalog',
                pages: currentPageMetadata,
                navigations: [
                    {
                        pageTo: 'SimplePage',
                        pageFrom: '',
                        targetAggregation: 'pages'
                    },
                    {
                        pageTo: 'PageWithChildren',
                        pageFrom: '',
                        targetAggregation: 'pages'
                    },
                    {
                        pageTo: 'PageWithAsset',
                        pageFrom: '',
                        targetAggregation: 'pages'
                    }
                ]
            };
            commonBuilder.setContext(null, currentDataModel, currentAppMetadata);
            protoBuilder.generateSnapshot(projectId, 1).then(function (response) {
                expect(uiCatalogService.getCompatibleCatalogs.callCount).to.equal(1);
                expect(uiCatalogService.getCompatibleCatalogs.getCall(0).args[0]).to.equal('customCatalog');
                expect(sharedWorkspaceService.getMetadata.callCount).to.equal(1);
                expect(sharedWorkspaceService.getMetadata.getCall(0).args[0]).to.equal(projectId);
                expect(artifactService.uploadArtifacts.callCount).to.equal(1);
                expect(artifactService.uploadArtifacts.getCall(0).args[0]).to.equal(projectId);
                expect(artifactService.uploadArtifacts.getCall(0).args[1].length).to.equal(14);
                expect(artifactService.uploadArtifacts.getCall(0).args[1][0].path).to.equal('view/SimplePage.view.xml');
                expect(artifactService.uploadArtifacts.getCall(0).args[1][0].filecontent.replace(/\r\n/g, '\n').replace(/\t/g, '    ')).to.equal(testData.xmlTarget);
                expect(artifactService.uploadArtifacts.getCall(0).args[1][1].path).to.equal('view/SimplePage.controller.js');
                expect(artifactService.uploadArtifacts.getCall(0).args[1][1].filecontent.replace(/\r\n/g, '\n').replace(/\t/g, '    ')).to.equal(testData.controllerTarget);
                expect(artifactService.uploadArtifacts.getCall(0).args[1][2].path).to.equal('view/PageWithChildren.view.xml');
                expect(artifactService.uploadArtifacts.getCall(0).args[1][2].filecontent.replace(/\r\n/g, '\n').replace(/\t/g, '    ')).to.equal(testData2.xmlTarget);
                expect(artifactService.uploadArtifacts.getCall(0).args[1][3].path).to.equal('view/PageWithChildren.controller.js');
                expect(artifactService.uploadArtifacts.getCall(0).args[1][3].filecontent.replace(/\r\n/g, '\n').replace(/\t/g, '    ')).to.equal(testData2.controllerTarget);
                expect(artifactService.uploadArtifacts.getCall(0).args[1][4].path).to.equal('view/PageWithAsset.view.xml');
                expect(artifactService.uploadArtifacts.getCall(0).args[1][4].filecontent.replace(/\r\n/g, '\n').replace(/\t/g, '    ')).to.equal(testData3.xmlTarget);
                expect(artifactService.uploadArtifacts.getCall(0).args[1][5].path).to.equal('view/PageWithAsset.controller.js');
                expect(artifactService.uploadArtifacts.getCall(0).args[1][5].filecontent.replace(/\r\n/g, '\n').replace(/\t/g, '    ')).to.equal(testData3.controllerTarget);
                expect(artifactService.uploadArtifacts.getCall(0).args[1][6].path).to.equal('index.html');
                expect(artifactService.uploadArtifacts.getCall(0).args[1][7].path).to.equal('Component.js');
                expect(artifactService.uploadArtifacts.getCall(0).args[1][7].filecontent.replace(/\r\n/g, '\n').replace(/\t/g, '    ')).to.equal(sampleRouter);
                expect(artifactService.uploadArtifacts.getCall(0).args[1][8].path).to.equal('models/metadata.xml');
                expect(artifactService.uploadArtifacts.getCall(0).args[1][9].path).to.equal('models/formulaCalculation.js');
                expect(artifactService.uploadArtifacts.getCall(0).args[1][10].path).to.equal('models/sampleData.json');
                expect(artifactService.uploadArtifacts.getCall(0).args[1][11].path).to.equal('fakeLRep.json');
                expect(artifactService.uploadArtifacts.getCall(0).args[1][12].path).to.equal('Component-preload.js');
                expect(assetService.getAssetWithContent.callCount).to.equal(1);
                expect(assetService.getAssetWithContent.getCall(0).args[0]).to.equal('54eb4221df562d9aa035aef7');

                expect(response[0].pageName).to.equal('SimplePage');
                expect(response[0].entitySet).to.equal('ProductSet');
                expect(response[0].defaultContext).to.equal('\'P0\'');
                expect(response[1].pageName).to.equal('PageWithChildren');
                expect(response[1].entitySet).to.equal('SalesOrderSet');
                expect(response[1].defaultContext).to.equal('\'SO0001\'');

                done();
            }).catch(done);
        });

        it('but can fail if you\'ve been bad', function (done) {

            var testData = retrieveTestData('material/properties/simplePage');
            var testData2 = retrieveTestData('material/groups/pageWithChildren');
            protoBuilder.generateSnapshot(badProjectId, 1, [testData.jsonSource, testData2.jsonSource], {
                pages: [testData.jsonSource, testData2.jsonSource],
                uiLang: 'ui5'
            }).then(function () {
                done('Should fail');
            }).catch(function (error) {
                expect(error).to.be.not.null;
                done();
            });
        });
    });
});
