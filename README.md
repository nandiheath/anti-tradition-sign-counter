# anti-tradition-sign-counter
Get the total number of signs across different organization


## Run

```bash
npm i

# First generate the list for parsing
node cli.js gen_list

# Try to get the count from the html
node cli.js parse -c

```

## Contribution

### To Fix the regex

Now support 3 `type` of regex

`regex`

- get the count from the text (if any)
- Best suit for '人數: (xyz)'

`count`

- count the exact occurance for specified regex
- Best suit for 'XYZ (2017 XYZ)\n'

`numbered`

- find the specified regex and get the max number of it
- Best suit for '1. XYZ (2017 XYZ)\n'

```bash

# edit the data/list.json

# Change the regex

# Run only with the specified index
node cli.js parse -c -i [index]
```