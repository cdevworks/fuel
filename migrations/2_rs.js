// ============ Contracts ============

// Token
// deployed first
const RUPEEImplementation = artifacts.require("RUPEEDelegate");
const RUPEEProxy = artifacts.require("RUPEEDelegator");

// Rs
// deployed second
const RUPEEReserves = artifacts.require("RUPEEReserves");
const RUPEERebaser = artifacts.require("RUPEERebaser");

// ============ Main Migration ============

const migration = async (deployer, network, accounts) => {
  await Promise.all([
    deployRs(deployer, network),
  ]);
};

module.exports = migration;

// ============ Deploy Functions ============


async function deployRs(deployer, network) {
  let reserveToken = "0x5d6D4355776fffD46D83DCeDB8156D65c152a4ba";
  let uniswap_factory = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
  await deployer.deploy(RUPEEReserves, reserveToken, RUPEEProxy.address);
  await deployer.deploy(RUPEERebaser,
      RUPEEProxy.address,
      reserveToken,
      uniswap_factory,
      RUPEEReserves.address
  );
  let rebase = new web3.eth.Contract(RUPEERebaser.abi, RUPEERebaser.address);

  let pair = await rebase.methods.uniswap_pair().call();
  console.log("RUPEEProxy address is " + RUPEEProxy.address);
  console.log("Uniswap pair is " + pair);
  let RUPEE = await RUPEEProxy.deployed();
  await RUPEE._setRebaser(RUPEERebaser.address);
  let reserves = await RUPEEReserves.deployed();
  await reserves._setRebaser(RUPEERebaser.address)
}
