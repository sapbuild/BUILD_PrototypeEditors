'use strict';

var SampleDataRestApi = require('../api/sampleDataRestApi');
var api = new SampleDataRestApi();

describe('DB init', function () {
    this.timeout(120000);
    before('db initialize', function (done) {
        api.dbInitialize(done);
    });
    it('ok', function (done) {
        api.initialize('dbinit-sample.datam@example.com', '5_LucrouR').then(done);
    });
});
