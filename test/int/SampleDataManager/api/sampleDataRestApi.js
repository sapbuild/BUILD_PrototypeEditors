'use strict';

var fs = require('fs');
var path = require('path');
var NormanTestServer = require('norman-testing-server').server;
var NormanTestRequester = require('norman-testing-server').Requester;
require('norman-server-tp');
var commonServer = require('norman-common-server');
var registry = require('norman-common-server').registry;
var sampleDataService = null;

var configFile = path.join(__dirname, '../../config-sdm.json');
commonServer.registry.registerModule({}, 'PageFlow');
function SampleDataRestApi() {
}

SampleDataRestApi.prototype.dbInitialize = function (callback) {
    NormanTestServer.initialize(configFile).then(function (appServer) {
        NormanTestServer.dropDB().then(function () {
            appServer.initSchema().then(function () {
                sampleDataService = registry.getModule('SampleDataService');
                return appServer.checkSchema();
            }).callback(callback);
        });
    });
};

SampleDataRestApi.prototype.initialize = function (user, password) {
    var deferred = Promise.defer(), self = this;
    NormanTestServer.initialize(configFile).then(function (server) {
        self.normanTestRequester = new NormanTestRequester(server.app, user, password, deferred.resolve);
    });
    return deferred.promise;
};
//Lock
SampleDataRestApi.prototype.lockProject = function (projectId) {
    this.normanTestRequester.reqPost('/api/projects/' + projectId + '/prototype/lock', 200, function () {
    }, {projectId: projectId});
};

//PROJECT
SampleDataRestApi.prototype.createProject = function (projName, fnCallBack) {
    var that = this;
    this.normanTestRequester.reqPost('/api/projects', 201, function (err, res) {
        that.lockProject(res.body._id);
        setTimeout(function () {
            fnCallBack(err, res);
        }, 1000);
    }, {
        name: projName
    });
};

//MODEL
SampleDataRestApi.prototype.createModel = function (httpCodeExpected, fnCallBack) {
    var that = this;
    this.createProject(function (err, res) {
        that.getModel(200, res.body._id, fnCallBack);
    });
};

SampleDataRestApi.prototype.createEntity = function (httpCodeExpected, projectID, sendValue, fnCallBack) {
    this.normanTestRequester.reqPost('/api/models/' + projectID + '/entities', httpCodeExpected, fnCallBack, sendValue);
};

SampleDataRestApi.prototype.updateEntity = function (httpCodeExpected, projectID, entityID, sendValue, fnCallBack) {
    this.normanTestRequester.reqPut('/api/models/' + projectID + '/entities/' + entityID, httpCodeExpected, fnCallBack, sendValue);
};

SampleDataRestApi.prototype.deleteEntity = function (httpCodeExpected, projectID, entityID, fnCallBack) {
    this.normanTestRequester.reqDelete('/api/models/' + projectID + '/entities/' + entityID, httpCodeExpected, fnCallBack);
};

///*     =========== Property =========================== */
SampleDataRestApi.prototype.createProperty = function (httpCodeExpected, projectID, entityID, sendValue, fnCallBack) {
    this.normanTestRequester.reqPost('/api/models/' + projectID + '/entities/' + entityID + '/properties', httpCodeExpected, fnCallBack, sendValue);
};

SampleDataRestApi.prototype.updateProperty = function (httpCodeExpected, projectID, entityID, propertyID, sendValue, fnCallBack) {
    this.normanTestRequester.reqPut('/api/models/' + projectID + '/entities/' + entityID + '/properties/' + propertyID, httpCodeExpected, fnCallBack, sendValue);
};

SampleDataRestApi.prototype.deleteProperty = function (httpCodeExpected, projectID, entityID, propertyID, fnCallBack) {
    this.normanTestRequester.reqDelete('/api/models/' + projectID + '/entities/' + entityID + '/properties/' + propertyID, httpCodeExpected, fnCallBack);
};

///*     =========== Navigation Property ===========================*/
SampleDataRestApi.prototype.createNavigationProperty = function (httpCodeExpected, projectID, entityID, sendValue, fnCallBack) {
    this.normanTestRequester.reqPost('/api/models/' + projectID + '/entities/' + entityID + '/navigationProperties', httpCodeExpected, fnCallBack, sendValue);
};

SampleDataRestApi.prototype.getModel = function (httpCodeExpected, projectID, fnCallBack) {
    this.normanTestRequester.reqGet('/api/models/' + projectID, httpCodeExpected, fnCallBack);
};


//SAMPLEDATA
SampleDataRestApi.prototype.getSampleData = function (projectId, fnCallBack) {
    sampleDataService.getSDfromProjId(projectId).then(function (result) {
        fnCallBack(result);
    });
};

SampleDataRestApi.prototype.getEntityData = function (projectId, entityName, fnCallBack) {
    sampleDataService.getEntityDataFromProjId(projectId, entityName).then(function (result) {
        fnCallBack(result);
    });
};

SampleDataRestApi.prototype.saveSampleDataWithError = function (projectId, sampleData, fnCallBack) {
    this.getModel(200, projectId, function (err, res) {
        var dataModelJSON = res.body;
        sampleDataService.updateSDfromProjId(dataModelJSON, sampleData, true).then(function (sampleData) {
            fnCallBack(null, sampleData);
        }).catch(function (err) {
            fnCallBack(err);
        });
    });
};

SampleDataRestApi.prototype.saveSampleData = function (httpCodeExpected, projectId, sampleData, fnCallBack) {
    var that = this;
    this.getModel(200, projectId, function (err, res) {
        var dataModelJSON = res.body;
        var sendValue = {
            dataModelJson: res.body,
            sampleData: sampleData
        };
        that.normanTestRequester.reqPut('/api/sampledata/' + projectId, httpCodeExpected, fnCallBack, sendValue)
    });
};


module.exports = SampleDataRestApi;
