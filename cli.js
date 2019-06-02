const program = require('commander');
const Promise = require('bluebird');
const request = Promise.promisifyAll(require('request'));
const cheerio = require('cheerio')
const fs = require('fs');
const async = require('async');
const mkdirp = require('mkdirp');
const path = require('path');
const moment = require('moment');
require('moment-timezone');

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

  fs.writeFileSync('./data/list.json', JSON.stringify(fsContent, null, 4));
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


function parseHtml(content, type, argv, isDebug) {
  let count = 0;
  if (type === 'regex') {
    const regex = new RegExp(argv, 'g');
    const match = regex.exec(content);
    if (match) {
      if (isDebug) {
        console.log(`Matched String: ${match[0]}`);
        console.log(`Parse Int: ${parseInt(match[1].replace(/\D/g, ''), 10)}`);
      }
      count = parseInt(match[1].replace(/\D/g, ''), 10);
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
      if (isDebug) {
        console.log(match[1]);
      }
    }
    count = max;
  } else if (type === 'count_in') {
    let regex = new RegExp(argv[0], 'g');
    let match = regex.exec(content);
    if (match) {
      regex = new RegExp(argv[1], 'g');
      const index = argv[2];
      match = match[index].match(regex);
      if (isDebug) {
        match.forEach((v, i) => {
          if (i < 50 || i >= match.length - 50) {
            console.log(`${i + 1}: ${v.trim()}`)
          }

        })
      }
      // default the offset to 1
      const offset = argv[3] !== undefined ? argv[3] : 1;
      count = match.length + offset;
    }

  }
  return count;
}

/**
 *
 */
function getCountFunc(index, isLocal, isDebug) {
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
        item.name = matchTitle[1].trim()
      }

      const {
        type, argv
      } = item.parseConfig
      item.count = parseHtml(content, type, argv, isDebug);
      console.log(`${item.name} :${item.count}`);

    } catch (error) {
      console.error(`Error when fetching ${item.url}`);
      console.error(error.message);
    }

  })
}

/**
 * Get the stats of the list.json
 */
function getStatsFunc(length) {
  let cnt = 0; 
  let numberOfSigns = 0;
  let checked = 0;
  let countButNotChecked = [];
  return async.asyncify(async (item, key) => {
    try {
      cnt++;
      numberOfSigns += (item.count != null && item.count ? item.count : 0);
      checked += (item.checked != null && item.checked == true ? 1 : 0);

      if(item.count != null && (item.checked == null || item.checked == false)) {
        countButNotChecked.push(item.index)
      }
      

      if(cnt == length) {
        console.log({
          cnt,
          numberOfSigns,
          checked,
          countButNotChecked: {
            count: countButNotChecked.length,
            index: countButNotChecked
          }
        });
      }
    } catch (error) {
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
  .option('-s, --stats', 'display the stats')
  .option('--debug', 'output the debug messages')
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
      async.eachOfLimit(list, 20, getCountFunc(cmd.index, cmd.local, cmd.debug), (error) => {
        fs.writeFileSync('./data/list.json', JSON.stringify({ list: list, meta: { updated_at: moment().tz('Asia/Hong_Kong').format('YYYY-MM-DD HH:mm:ss') } }, null, 4));
      })
    } else if (cmd.stats) {
      async.eachOfLimit(list, 20, getStatsFunc(list.length), (error) => {
        console.log(error);
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