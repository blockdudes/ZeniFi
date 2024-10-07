export const LEVERAGE_CONTRACT_ADDRESS = "0x900bE62143FFBc35e07847f865855e9b49767549";
export const USDT_CONTRACT_ADDRESS = "0xd8876b338ddd8a84a574c4a28da69af38b0e9eb5";

// 0x900bE62143FFBc35e07847f865855e9b49767549 leverage cross fi
// 0xd8876b338ddd8a84a574c4a28da69af38b0e9eb5 usdt cross fi
// 0x2ec8ac5d2191AEF748A4B3d0a810E0d3AB946911 usdt cross fi unused
// forge create--rpc - url https://rpc.testnet.ms --private-key 49c9a17b9e705a0749cd2a0d358bec619a6e056e343c4d10c4619b93a83b9369 src/contracts/Leverage.sol:Leverage --constructor-args "0xd8876b338ddd8a84a574c4a28da69af38b0e9eb5"