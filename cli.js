const program = require('commander');
const Promise = require('bluebird');
const request = Promise.promisifyAll(require('request'));
const cheerio = require('cheerio')
const fs = require('fs');
const async = require('async');
const mkdirp = require('mkdirp');
const path = require('path');


const listSrc = 'https://samyip.net/2019/05/27/%E5%AD%B8%E7%95%8C%E5%8F%8A%E5%90%84%E7%95%8C-%E5%8F%8D%E9%80%81%E4%B8%AD%E8%81%AF%E7%BD%B2%E5%8F%8A%E9%97%9C%E6%B3%A8%E7%B5%84%E6%95%B4%E5%90%88/';
const LIST_FILE_PATH = './data/list.json';

program.command('gen_list').action(async () => {
  let res = await request.getAsync(listSrc);
  const content = res.body;
  const $ = cheerio.load(content);

  const list = $('div.entry-content').find("p").find("a");
  let fsContent = {
    list: []
  };

  if (fs.existsSync(LIST_FILE_PATH)) {
    fsContent = JSON.parse(fs.readFileSync(LIST_FILE_PATH).toString());
  }

  list.each((i, ele) => {
    const name = $(ele).text();
    const url = $(ele).attr('href');
    const index = fsContent.list.length;
    if (!fsContent.list.find(row => row.url === url)) {
      fsContent.list.push({
        index,
        name,
        url,
        parseConfig: {
          type: 'regex',
          argv: '人數\\D*\(\\d+)'
        }
      });
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


function parseHtml(content, type, argv) {
  let count = 0;
  if (type === 'regex') {
    const regex = new RegExp(argv, 'g');
    const match = regex.exec(content);
    if (match) {
      count = parseInt(match[1], 10);
    }
  } else if (type === 'count') {
    const regex = new RegExp(argv, 'g');
    const match = content.match(regex);
    count = match.length;
  } else if (type === 'numbered') {
    const regex = new RegExp(argv, 'g');
    let match;
    let max = 0;
    while (match = regex.exec(content)) {
      max = Math.max(max, match[1]);
    }
    count = max;
  } else if (type === 'count_in') {
    let regex = new RegExp(argv[0], 'g');
    let match = regex.exec(content);
    if (match) {
      regex = new RegExp(argv[1], 'g');
      const index = argv[2];
      
      match = match[index].match(regex);      
      count = match.length + 1;
    }
    
  }
  return count;
}

/**
 *
 */
function getCountFunc(index, isLocal) {
  return async.asyncify(async (item, key) => {
    if (index && index != key) {
      return;
    }

    try {
      let content;
      const fname = `./data/download/${key}.html`;
      if (isLocal && fs.existsSync(fname)) {
        content = fs.readFileSync(fname).toString();
      } else {
        const res = await request.getAsync(item.url);
        content = res.body;
      }

      const matchTitle = content.match(/<title>(.*?)<\/title>/i);
      if (matchTitle) {
        item.name = matchTitle[1]
      }

      const {
        type, argv
      } = item.parseConfig
      item.count = parseHtml(content, type, argv);
      console.log(`${item.name} :${item.count}`);

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
  .option('-i, --index <index>', 'run the index only')
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
    } else if (cmd.count) {
      async.eachOfLimit(list, 20, getCountFunc(cmd.index, cmd.local), (error) => {
        fs.writeFileSync('./data/list.json', JSON.stringify({ list: list }, null, 4));
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
