const restify = require('restify');
const fs = require('fs');
const { exec } = require('child_process');

let list = [];
function respond(req, res, next) {
  res.send('hello ' + req.params.name);
  next();
}

var server = restify.createServer();
server.get('/list', (req, res, next) => {
  try {
    const content = JSON.parse(fs.readFileSync('./data/list.json').toString());
    list = content.list;
    const resultList = list.filter(record => record.count > 0).map(record => ({
      name: record.name,
      count: record.count,
      url: record.url,
      checked: record.checked ? true: false
    }));
    res.send(200, {
      org_count: resultList.length,
      total: resultList.map(record => parseInt(record.count)).reduce((p, c) => p + c, 0),
      data: resultList,
    })
  } catch (error) {

  }
  console.log(list);

});
server.post('/list', (req, res, next) => {
  console.log('start to run command');
  exec('node cli.js parse -c', (err, stdout, stderr) => {
    if (err) {
      console.log(`stderr: ${stderr}`);
      // node couldn't execute the command
      return;
    }

    // the *entire* stdout and stderr (buffered)
    console.log(`stdout: ${stdout}`);
    console.log(`stderr: ${stderr}`);
  });
  res.send(200);
});

server.listen(8082, function() {
  console.log('%s listening at %s', server.name, server.url);
});