const convert = require("convert-units");

function calcTeneur(value, teneur = "", unit = "g") {
  const covertedValue = convert(value)
    .from(unit)
    .to("g");

  const parsedTeneur = parseFloat(teneur.replace(",", "."), 10);

  return !parsedTeneur ? teneur : (covertedValue * parsedTeneur) / 100;
}

module.exports = {
  calcTeneur
};
