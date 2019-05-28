const program = require('commander');
const Promise = require('bluebird');
const request = Promise.promisifyAll(require('request'));
const cheerio = require('cheerio')
const fs = require('fs');
const async = require('async');
const mkdirp = require('mkdirp');
const path = require('path');


const listSrc = 'https://samyip.net/2019/05/27/%E5%AD%B8%E7%95%8C%E5%8F%8A%E5%90%84%E7%95%8C-%E5%8F%8D%E9%80%81%E4%B8%AD%E8%81%AF%E7%BD%B2%E5%8F%8A%E9%97%9C%E6%B3%A8%E7%B5%84%E6%95%B4%E5%90%88/';

program.command('gen_list').action(async () => {
  let res = await request.getAsync(listSrc);
  const content = res.body;
  const $ = cheerio.load(content);

  const list = $('div.entry-content').find("p");
  const fsContent = {
    list: []
  };
  list.each((i, ele) => {
    const text = $(ele).text();
    if (text.match(/.*http(s){0,1}:\/\//g)) {
      const [name, url] = text.split('http');
      fsContent.list.push({
        name,
        url: `http${url}`
      })
    }
  })

  fs.writeFileSync('./data/list.json', JSON.stringify(fsContent, null, 2));
})


/**
 * Function used for debug
 */
function getDownloadFunc() {
  return async.asyncify(async (item, key) => {
    try {
      const fname = `./data/download/${key}.html`;
      const data = await request.getAsync(item.url);
      mkdirp('./data/download');
      fs.writeFileSync(fname, data.body);
    } catch (error) {
      console.error(`Error when fetching ${item.url}`);
      console.error(error.message);
    }

  })
}

/**
 * Function used for debug
 */
function readDataFromLocal(dir) {
  const ls = fs.readdirSync(dir);
  // for (const fname of ls) {
    fname = ls[66];
    console.log(fname);
    const file = path.join(dir, fname);
    const content = fs.readFileSync(file).toString();
    const match = content.match(/人數[^\n<br>]*(:|：)[^\n<br>\\]*\d+/g);
    console.log(match);
  // }

}

/**
 *
 */
function getCountFunc() {
  return async.asyncify(async (item, key) => {
    try {
      const fname = `./data/download/${key}.html`;
      const res = await request.getAsync(item.url);
      const content = res.body;
      const match = content.match(/人數[^\n<br>]*\d+/g);
      if (match) {
        // TODO:
        const count = match[0]
        console.log(`${item.name}: ${count}`);
      } else {
        console.log(`${item.name}: unknown`);
      }
    } catch (error) {
      console.error(`Error when fetching ${item.url}`);
      console.error(error.message);
    }

  })
}

program
  .command('parse')
  .option('-d, --download-only', 'Download all the html only')
  .option('-l, --local', 'parse the data from local')
  .option('-c, --count', 'display the number (if any)')
  .action(async (cmd) => {

    let list;
    try {
      list = fs.readFileSync('./data/list.json').toString();
      list = JSON.parse(list);
    } catch (error) {
      console.error('File not exists or format invalid');
      process.exit(1);
    }

    list = list.list;
    console.log(`Total ${list.length} forms.`);
    if (cmd.downloadOnly) {
      async.eachOfLimit(list, 20, getDownloadFunc(), (error) => {
        console.log(error);
      })
    } else if (cmd.local){
      await readDataFromLocal('./data/download');
    } else if (cmd.count) {
      async.eachOfLimit(list, 20, getCountFunc(), (error) => {
      })
    }

    // await fetchAndParseForm(list[0].name, list[1].url);
  })


async function fetchAndParseForm(name, url) {
  const res = await request.getAsync(url);
  const content = res.body;

  const $ = cheerio.load(content);
}

program.parse(process.argv);
