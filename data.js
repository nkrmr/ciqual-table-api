const request = require("request");
const unzip = require("unzipper");
const { parseString } = require("xml2js");
const legacy = require("legacy-encoding");
const parse = require("obj-parse");
const deepKeys = require("deep-keys");
const camelcaseKeysDeep = require("camelcase-keys-deep");

const CIQUAL_TABLE_URL =
  "https://ciqual.anses.fr/cms/sites/default/files/inline-files/TableCiqual2017_XML_2017%2011%2021.zip";

const getData = () =>
  new Promise((resolve, reject) => {
    let alimentTable = "";
    let compositionTable = "";
    let constantTable = "";
    let nbFinishedFiles = 0;

    request(CIQUAL_TABLE_URL)
      .pipe(unzip.Parse())
      .on("entry", entry => {
        const fileName = entry.path;
        if (
          ![
            "alim_2017 11 21.xml",
            "compo_2017 11 21.xml",
            "const_2017 11 21.xml"
          ].includes(fileName)
        ) {
          entry.on("data", () => {});
          return;
        }
        entry.on("end", () => {
          nbFinishedFiles += 1;
          let tableToParse = null;
          switch (fileName) {
            case "alim_2017 11 21.xml":
              tableToParse = alimentTable;
              break;
            case "compo_2017 11 21.xml":
              tableToParse = compositionTable;
              break;
            case "const_2017 11 21.xml":
              tableToParse = constantTable;
              break;
            default:
              break;
          }
          parseString(tableToParse, { trim: true }, (err, result) => {
            if (err) {
              reject(err);
            }
            switch (fileName) {
              case "alim_2017 11 21.xml":
                alimentTable = result;
                break;
              case "compo_2017 11 21.xml":
                compositionTable = result;
                break;
              case "const_2017 11 21.xml":
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
        const decode = value => legacy.decode(value, "windows-1252");
        entry.on("data", chunk => {
          switch (fileName) {
            case "alim_2017 11 21.xml":
              alimentTable += decode(chunk);
              break;
            case "compo_2017 11 21.xml":
              compositionTable += decode(chunk);
              break;
            case "const_2017 11 21.xml":
              constantTable += decode(chunk);
              break;
            default:
              break;
          }
        });
      });
  });

function removeArrays(el) {
  let elem = null;
  if (Array.isArray(el)) {
    elem = [...el];
  } else {
    elem = { ...el };
  }
  deepKeys(elem).forEach(key => {
    const get = parse(key);
    const set = parse(key).assign;
    if (Array.isArray(get(elem))) {
      set(elem, get(elem)[0]);
    }
  });
  return elem;
}

module.exports = function initData() {
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

    return {
      aliments,
      compositions,
      constants
    };
  });
};
