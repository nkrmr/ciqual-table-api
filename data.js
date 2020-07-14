const request = require("request");
const unzip = require("unzipper");
const { parseString } = require("xml2js");
const legacy = require("legacy-encoding");
const parse = require("obj-parse");
const deepKeys = require("deep-keys");
const camelcaseKeysDeep = require("camelcase-keys-deep");
const fs = require("fs");
const path = require("path");

const CIQUAL_TABLE_URL = "https://ciqual.anses.fr/cms/sites/default/files/inline-files/XML_2020_07_07.zip";

const getData = () =>
  new Promise((resolve, reject) => {
    let alimentTable = "";
    let compositionTable = "";
    let constantTable = "";
    let nbFinishedFiles = 0;

    request(CIQUAL_TABLE_URL)
      .pipe(unzip.Parse())
      .on("entry", (entry) => {
        const fileName = entry.path;
        if (
          ![
            "alim_2020_07_07.xml",
            "compo_2020_07_07.xml",
            "const_2020_07_07.xml",
          ].includes(fileName)
        ) {
          entry.on("data", () => {});
          return;
        }
        entry.on("end", () => {
          nbFinishedFiles += 1;
          let tableToParse = null;
          switch (fileName) {
            case "alim_2020_07_07.xml":
              tableToParse = alimentTable;
              break;
            case "compo_2020_07_07.xml":
              tableToParse = compositionTable;
              break;
            case "const_2020_07_07.xml":
              tableToParse = constantTable;
              break;
            default:
              break;
          }

          parseString(tableToParse.replace(/ & /g, ' &amp; ')
                   .replace(/ < /g, ' &lt; ')
                   .replace(/ > /g, ' &gt; ')
                   .replace(/\(</g, '(&lt;')
                   .replace(/\(>/g, '(&gt;'), { trim: true }, (err, result) => {
            if (err) {
              reject(err);
            }
            switch (fileName) {
              case "alim_2020_07_07.xml":
                alimentTable = result;
                break;
              case "compo_2020_07_07.xml":
                compositionTable = result;
                break;
              case "const_2020_07_07.xml":
                constantTable = result;
                break;
              default:
                break;
            }
            if (nbFinishedFiles === 3) {
              resolve({ alimentTable, compositionTable, constantTable });
            }
          });
        });
        const decode = (value) => legacy.decode(value, "windows-1252");
        entry.on("data", (chunk) => {
          switch (fileName) {
            case "alim_2020_07_07.xml":
              alimentTable += decode(chunk);
              break;
            case "compo_2020_07_07.xml":
              compositionTable += decode(chunk);
              break;
            case "const_2020_07_07.xml":
              constantTable += decode(chunk);
              break;
            default:
              break;
          }
        });
      });
  });

function writeTable(table, name) {
  const filePath = path.join(__dirname, `./${name}.json`);

  fs.writeFile(filePath, JSON.stringify(table), (err) => {
    if (err) {
      console.log(err);
    }

    console.log(`The ${name} file has been created.`);
  });
}

function removeArrays(el) {
  let elem = null;
  if (Array.isArray(el)) {
    elem = [...el];
  } else {
    elem = { ...el };
  }
  deepKeys(elem).forEach((key) => {
    const get = parse(key);
    const set = parse(key).assign;
    if (Array.isArray(get(elem))) {
      set(elem, get(elem)[0]);
    }
  });
  return elem;
}

(function initData() {
  console.log("downloading data...");

  return getData().then(({ alimentTable, compositionTable, constantTable }) => {
    console.log("...data downloaded");
    console.log("parsing data...");

    const aliments = camelcaseKeysDeep(
      alimentTable.TABLE.ALIM.map(removeArrays)
    );
    const compositions = camelcaseKeysDeep(
      compositionTable.TABLE.COMPO.map(removeArrays)
    );
    const constants = camelcaseKeysDeep(
      constantTable.TABLE.CONST.map(removeArrays)
    );

    console.log("...data parsed");

    writeTable(
      {
        aliments,
        compositions,
        constants,
      },
      "ciqual"
    );
  });
})();
