

const HDWalletProvider = require('@truffle/hdwallet-provider');
const privateKeys = process.env.PRIVATE_KEYS || ""

module.exports = {

  networks: {
    // running on Ganache local blockchain
    development: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "*" // Match any network id
    },

    rinkeby: {
      provider: function() {
        return new HDWalletProvider(
          privateKeys.split(','), // Array of account private keys
          `https://rinkeby.infura.io/v3/${process.env.INFURA_API_KEY}`// Url to an Ethereum Node
        )
      },
      gas: 5000000,
      gasPrice: 5000000000, // 5 gwei
      network_id: 4
    },
  },

  contracts_directory: './contracts',
  contracts_build_directory: './frontend/src/contracts',

  // Set default mocha options here, use special reporters etc.
  mocha: {
    // timeout: 100000
  },

  // Configure your compilers
  compilers: {
    solc: {
      version: "0.8.0",
      optimizer: {
        enabled: true, // for large projects
        runs: 200
    },
    }
  },
};
