'use strict';

var DataModelerAPI = require('../api/dataModelerRestApi');
var api = new DataModelerAPI();

describe('DB init', function () {
    this.timeout(120000);
    before('db initialize', function (done) {
        api.dbInitialize(done);
    });
    it('ok', function (done) {
        api.initialize('dbinit.datamodeler@example.com', '5_LucrouR').then(done);
    });
});
