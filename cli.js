const program = require('commander');
const Promise = require('bluebird');
const request = Promise.promisifyAll(require('request'));
const cheerio = require('cheerio')
const fs = require('fs');

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
    if (text.match(/.*http:\/\/bit.ly\//g)) {
      const [name, url] = text.split('http://');
      console.log(name);
      console.log(url);
      fsContent.list.push({
        name,
        link: `http://${url}`
      })
    }
  })

  fs.writeFileSync('./data/list.json');
})


program.parse(process.argv);
