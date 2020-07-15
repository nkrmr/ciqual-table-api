const { ApolloServer, gql } = require("apollo-server");

const data = require("./ciqual.json");
const { calcTeneur } = require("./utils");

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
    aliment(code: String): Aliment
    aliments(nom: String, first: Int): [Aliment]
  }
`;

const resolvers = {
  Query: {
    aliment: (_, { code }) => {
      return data.aliments.find((a) => a.alimCode === code);
    },
    aliments: (_, { nom, first }) => {
      const result = data.aliments.filter(
        (a) => {
          let pattern = new RegExp(`^${nom.toUpperCase()}`)
          return a.alimNomFr.toUpperCase().match(pattern);
        }
      );

      return first ? result.slice(0, first) : result;
    },
  },
  Aliment: {
    composition: (parent, req) => {
      const { alimCode } = parent;
      const { value, unit } = req;

      return data.compositions
        .filter((c) => c.alimCode === alimCode)
        .map((c) => {
          // aggregate the current composition with his
          // corresponding constants
          const compo = {
            ...c,
            ...data.constants.find((cons) => cons.constCode === c.constCode),
          };

          // changing the teneur according to the given value
          if (value) {
            compo.teneur = calcTeneur(value, c.teneur, unit);
          }

          return compo;
        });
    },
  },
};

const server = new ApolloServer({ typeDefs, resolvers });

// launching Graphql server
server.listen().then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
});
