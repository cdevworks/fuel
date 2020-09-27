// ============ Contracts ============

// Token
// deployed first
const RUPEEImplementation = artifacts.require("RUPEEDelegate");
const RUPEEProxy = artifacts.require("RUPEEDelegator");

// ============ Main Migration ============

const migration = async (deployer, network, accounts) => {
  await Promise.all([
    deployToken(deployer, network),
  ]);
};

module.exports = migration;

// ============ Deploy Functions ============


async function deployToken(deployer, network) {
  await deployer.deploy(RUPEEImplementation);
  await deployer.deploy(RUPEEProxy,
    "FUEL",
    "GAS",
    18,
    "2000000000000000000000000",
    RUPEEImplementation.address,
    "0x"
  );
}
