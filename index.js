const { ApolloServer, gql } = require("apollo-server");
const initData = require("./data");

let data = null;

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
    composition(alimCode: String): [Composition]
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
      data.aliments.find(a => parseInt(a.alimCode.trim(), 10) === code);
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
    composition: parent =>
      data.compositions
        .filter(c => c.alimCode.includes(parent.alimCode))
        .map(c => ({
          ...c,
          ...data.constants.find(cons => cons.constCode.includes(c.constCode))
        }))
  }
};

/**
 * Downloading CIQUAL data
 */
initData().then(d => {
  data = d;

  const server = new ApolloServer({ typeDefs, resolvers });

  // launching Graphql server
  server.listen({ port: 4001 }).then(({ url }) => {
    console.log(`🚀  Server ready at ${url}`);
  });
});
