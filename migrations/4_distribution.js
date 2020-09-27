var fs = require('fs')

// ============ Contracts ============


// Protocol
// deployed second
const RUPEEImplementation = artifacts.require("RUPEEDelegate");
const RUPEEProxy = artifacts.require("RUPEEDelegator");

// deployed third
const RUPEEReserves = artifacts.require("RUPEEReserves");
const RUPEERebaser = artifacts.require("RUPEERebaser");

const Gov = artifacts.require("GovernorAlpha");
const Timelock = artifacts.require("Timelock");

// deployed fourth
const RUPEE_LINKPool = artifacts.require("RUPEELINKPool");


// deployed fifth
const RUPEEIncentivizer = artifacts.require("RUPEEIncentivizer");

// ============ Main Migration ============

const migration = async (deployer, network, accounts) => {
  await Promise.all([
    // deployTestContracts(deployer, network),
    deployDistribution(deployer, network, accounts),
    // deploySecondLayer(deployer, network)
  ]);
}

module.exports = migration;

// ============ Deploy Functions ============


async function deployDistribution(deployer, network, accounts) {
  console.log(network)
  let RUPEE = await RUPEEProxy.deployed();
  let yReserves = await RUPEEReserves.deployed()
  let yRebaser = await RUPEERebaser.deployed()
  let tl = await Timelock.deployed();
  let gov = await Gov.deployed();
  if (network != "test") {
    await deployer.deploy(RUPEEIncentivizer);
    await deployer.deploy(RUPEE_LINKPool);
    
    let link_pool = new web3.eth.Contract(RUPEE_LINKPool.abi, RUPEE_LINKPool.address);

    console.log("setting distributor");
    await Promise.all([
        link_pool.methods.setRewardDistribution("0xA8C178C6d6A9f5cd52145f4b142Bc5bc36C8F74f").send({from: "0xA8C178C6d6A9f5cd52145f4b142Bc5bc36C8F74f", gas: 100000}),
      ]);
    // tokens will be sent from the deployer address, make sure to get the math right to avoid substraction errors!!!
    let twenty = web3.utils.toBN(10**3).mul(web3.utils.toBN(10**18)).mul(web3.utils.toBN(2000));
    let one_five = web3.utils.toBN(10**3).mul(web3.utils.toBN(10**18)).mul(web3.utils.toBN(1500));

    console.log("transfering and notifying");
    console.log("eth");
    await Promise.all([
      RUPEE.transfer(RUPEE_LINKPool.address, twenty.toString()),
      RUPEE._setIncentivizer(RUPEEIncentivizer.address),
    ]);

    await Promise.all([
      link_pool.methods.notifyRewardAmount(twenty.toString()).send({from:"0xA8C178C6d6A9f5cd52145f4b142Bc5bc36C8F74f"}),

      // incentives is a minter and prepopulates itself.
    ]);

    await Promise.all([
      link_pool.methods.setRewardDistribution(Timelock.address).send({from: "0xA8C178C6d6A9f5cd52145f4b142Bc5bc36C8F74f", gas: 100000}),
    ]);
    await Promise.all([
      link_pool.methods.transferOwnership(Timelock.address).send({from: "0xA8C178C6d6A9f5cd52145f4b142Bc5bc36C8F74f", gas: 100000}),
    ]);
  }

  await Promise.all([
    RUPEE._setPendingGov(Timelock.address),
    yReserves._setPendingGov(Timelock.address),
    yRebaser._setPendingGov(Timelock.address),
  ]);

  await Promise.all([
      tl.executeTransaction(
        RUPEEProxy.address,
        0,
        "_acceptGov()",
        "0x",
        0
      ),

      tl.executeTransaction(
        RUPEEReserves.address,
        0,
        "_acceptGov()",
        "0x",
        0
      ),

      tl.executeTransaction(
        RUPEERebaser.address,
        0,
        "_acceptGov()",
        "0x",
        0
      ),
  ]);
  await tl.setPendingAdmin(Gov.address);
  await gov.__acceptAdmin();
  await gov.__abdicate();
}
