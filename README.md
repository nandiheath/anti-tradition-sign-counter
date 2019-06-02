# anti-tradition-sign-counter
Get the total number of signs across different organization


## Run

```bash
npm i

# First generate the list for parsing
node cli.js gen_list

# Try to get the count from the html
node cli.js parse -c

# Get the stats 
node cli.js parse -s

```

## Contribution

### To Fix the regex

```bash

# edit the data/list.json to change the regex

# Download all the content to local for speeding up
node cli.js parse -d

# Run only with the specified index
node cli.js parse -c -l -i [index]

# Debug mode
node cli.js parse -c -l -i [index] --debug
```

Now support 4 `type` of regex

`regex`

- get the count from the text (if any)
- Best suit for '人數: (xyz)'

`count`

- count the exact occurance for specified regex
- Best suit for 'XYZ (2017 XYZ)\n'

`count_in`

- count the occurance for specified regex within some content
- argv[0] = content match regex
- argv[1] = record match regex
- argv[2] = index of the matching group

e.g.

```
聯署人(29/05/2019 15:51更新)：
楊志濤	校友	會計	2010
許浚賢	校友	政治與行政	2018
Kwan Man Ho	校友	BBA	2011
葉君怡	校友	人類學	2019
陳兆匡	校友	政治與行政	2014
陳子豪	在學學生	哲學	

>> parseConfig:
"parseConfig": {
    "type": "count_in",
    "argv": [
        "聯署人([^\\n]*)：([^\"]*)\">", // extract the content. 
        "\\n", // each new line count as 1 record
        2, // the matching group of content is index[2]. group[0] = original content, group[1] = ([^\\n]*) i.e. timestamp
        0 // offset. Default: 1
    ]
},
```


`numbered`

- find the specified regex and get the max number of it
- Best suit for '1. XYZ (2017 XYZ)\n'

