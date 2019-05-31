const restify = require('restify');
const fs = require('fs');
const { exec } = require('child_process');

let list = [];
function respond(req, res, next) {
  res.send('hello ' + req.params.name);
  next();
}

var server = restify.createServer();
server.use(restify.plugins.queryParser());
server.get('/list', (req, res, next) => {
  const checked = req.query.checked;
  try {
    const content = JSON.parse(fs.readFileSync('./data/list.json').toString());
    list = content.list;
    const resultList = list.filter(record => record.count > 0 &&
      checked === undefined ? true : record.checked === (checked === 'true')
    ).map(record => ({
      name: record.name,
      count: record.count,
      url: record.url,
      checked: record.checked ? true : false
    }));
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.send(200, {
      meta: Object.assign({
        org_count: resultList.length,
        total: resultList.map(record => parseInt(record.count)).reduce((p, c) => p + c, 0),
      }, content.meta),
      data: resultList,
    })
  } catch (error) {

  }

});

function scheduleUpdate() {
  console.log('going to update the list..');
  exec('node cli.js parse -c', (err, stdout, stderr) => {
    setTimeout(scheduleUpdate, 1000 * 60 * 5); // run after 5 mins
    if (err) {
      console.log(`stderr: ${stderr}`);
      // node couldn't execute the command
      return;
    }

    // the *entire* stdout and stderr (buffered)
    // console.log(`stdout: ${stdout}`);
    // console.log(`stderr: ${stderr}`);
  });
}

scheduleUpdate();

server.listen(8082, function () {
  console.log('%s listening at %s', server.name, server.url);
});