const { ApolloServer, gql } = require("apollo-server");
const convert = require("convert-units");

const data = require("./ciqual.json");

function calcTeneur(value, teneur = "", unit = "g") {
  const covertedValue = convert(value)
    .from(unit)
    .to("g");

  const parsedTeneur = parseFloat(teneur.replace(",", "."), 10);

  if (!parsedTeneur) return teneur;

  return (covertedValue * parsedTeneur) / 100;
}

const typeDefs = gql`
  type Aliment {
    alimCode: String
    alimNomFr: String
    alimNomIndexFr: String
    alimNomEng: String
    alimNomIndexEng: String
    alimGrpCode: String
    alimSsgrpCode: String
    alimSsssgrpCode: String
    composition(alimCode: String, unit: String, value: Int): [Composition]
  }

  type Composition {
    constCode: String
    teneur: String
    constNomFr: String
    constNomEng: String
  }

  type Query {
    aliment(code: Int): Aliment
    aliments(nom: String, first: Int): [Aliment]
  }
`;

const resolvers = {
  Query: {
    aliment: (_, { code }) => {
      data.aliments.find(a => parseInt(a.alimCode, 10) === code);
    },
    aliments: (_, { nom, first }) => {
      const result = data.aliments.filter(
        a =>
          a.alimNomFr.toUpperCase().includes(nom.toUpperCase()) ||
          a.alimNomEng.toUpperCase().includes(nom.toUpperCase())
      );

      return first ? result.slice(0, first) : result;
    }
  },
  Aliment: {
    composition: (parent, req) => {
      const { alimCode } = parent;
      const { value, unit } = req;

      return data.compositions
        .filter(c => c.alimCode.includes(alimCode))
        .map(c => {
          // aggregate the current composition with his
          // corresponding constants
          const compo = {
            ...c,
            ...data.constants.find(cons => cons.constCode.includes(c.constCode))
          };

          // changing the teneur according to the given value
          if (value) {
            compo.teneur = calcTeneur(value, c.teneur, unit);
          }

          return compo;
        });
    }
  }
};

const server = new ApolloServer({ typeDefs, resolvers });

// launching Graphql server
server.listen({ port: 4001 }).then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
});
