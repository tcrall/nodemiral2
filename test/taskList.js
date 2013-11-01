var TaskList = require('../lib/taskList');
var Session = require('../lib/session');
var assert = require('assert');

suite('TaskList', function() {
  test('register and run', function(done) {
    var optionsList = [];
    var session = new Session('host');
    TaskList.registerTask('simpleTask', function(_session, options, callback) {
      assert.equal(session, _session);
      optionsList.push(options);
      callback();
    });

    var taskList = new TaskList('simple', {pretty: false});
    taskList.simpleTask('Simple Name', {aa: 10});
    taskList.simpleTask('Simple Name2', {aa: 20});
    taskList.run(session, function(summeryMap) {
      assert.deepEqual(summeryMap[session._host], {error: null, history: [
        {task: 'Simple Name', status: 'SUCCESS'},
        {task: 'Simple Name2', status: 'SUCCESS'}
      ]});
      assert.deepEqual(optionsList, [{aa: 10}, {aa: 20}]);
      done();
    });
  });

  test('when error', function(done) {
    var session = new Session('host');
    TaskList.registerTask('simpleTask2', function(_session, options, callback) {
      assert.equal(session, _session);
      if(options.aa == 20) {
        callback(new Error('error-here'));
      } else {
        callback();
      }
    });

    var taskList = new TaskList('simple', {pretty: false});
    taskList.simpleTask2('one', {aa: 10});
    taskList.simpleTask2('two', {aa: 20});
    taskList.simpleTask2('three', {aa: 30});
    taskList.run(session, function(summeryMap) {
      var summery = summeryMap[session._host];
      assert.equal(summery.error.message, 'error-here');
      assert.deepEqual(summery.history, [
        {task: 'one', status: 'SUCCESS'},
        {task: 'two', status: 'FAILED', error: 'error-here'}
      ]);
      done();
    });
  });

  test('when error - with ignoreErrors', function(done) {
    var session = new Session('host');
    TaskList.registerTask('simpleTask3', function(_session, options, callback) {
      assert.equal(session, _session);
      if(options.aa == 20) {
        callback(new Error('error-here'));
      } else {
        callback();
      }
    });

    var taskList = new TaskList('simple', {pretty: false, ignoreErrors: true});
    taskList.simpleTask3('one', {aa: 10});
    taskList.simpleTask3('two', {aa: 20});
    taskList.simpleTask3('three', {aa: 30});
    taskList.run(session, function(summeryMap) {
      var summery = summeryMap[session._host];
      assert.ifError(summery.error);
      assert.deepEqual(summery.history, [
        {task: 'one', status: 'SUCCESS'},
        {task: 'two', status: 'FAILED', error: 'error-here'},
        {task: 'three', status: 'SUCCESS'},
      ]);
      done();
    });
  });

  test('concat', function(done) {
    var optionsList = [];
    var session = new Session('host');
    TaskList.registerTask('simpleTask', function(_session, options, callback) {
      assert.equal(session, _session);
      optionsList.push(options);
      callback();
    });

    var tl1 = new TaskList('one', {pretty: false});
    tl1.simpleTask('Simple Name', {aa: 10});
    tl1.simpleTask('Simple Name2', {aa: 20});

    var tl2 = new TaskList('two', {pretty: false});
    tl2.simpleTask('Simple Name', {aa: 30});
    tl2.simpleTask('Simple Name2', {aa: 40});

    var tl3 = new TaskList('three', {pretty: false});
    tl3.simpleTask('Simple Name', {aa: 50});
    tl3.simpleTask('Simple Name2', {aa: 60});

    var combined = tl1.concat([tl2, tl3]);
    assert.equal(combined._name, tl1._name + '+');

    combined.run(session, function(summeryMap) {
      assert.ifError(summeryMap[session._host].error);
      assert.deepEqual(optionsList, [
        {aa: 10}, {aa: 20}, {aa: 30}, {aa: 40}, {aa: 50}, {aa: 60}
        ]);
      done();
    });
  });

  test('variable mapper', function(done) {
    var optionsList = [];
    var session = new Session('host');
    TaskList.registerTask('first', function(_session, options, callback, varsMapper) {
      optionsList.push(options);
      var stdout = "value1";
      var stderr = "value2";
      varsMapper(stdout, stderr);
      callback();
    });

    TaskList.registerTask('second', function(_session, options, callback, varsMapper) {
      optionsList.push(options);
      //this does not support varsMappers, so simply do nothing
      callback();
    });

    var taskList = new TaskList('simple', {pretty: false});

    taskList.first('One', {aa: 10}, function(stdout, stderr) {
      this.simple = {
        v1: stdout,
        v2: stderr
      };
    });

    taskList.second('Two', {
      data: function() {return this.simple },
      aa: 20
    });

    taskList.run(session, function(summeryMap) { 
      assert.deepEqual(summeryMap[session._host], {error: null, history: [
        {task: 'One', status: 'SUCCESS'},
        {task: 'Two', status: 'SUCCESS'}
      ]});

      assert.deepEqual(optionsList, [{aa: 10}, {
        data: {
          v1: 'value1',
          v2: 'value2'
        },
        aa: 20
      }]);

      done();
    });
  });
});