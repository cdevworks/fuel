var fs = require('fs')

// ============ Contracts ============


// Protocol
// deployed second
const GRAPImplementation = artifacts.require("GRAPDelegate");
const GRAPProxy = artifacts.require("GRAPDelegator");

// deployed third
const GRAPReserves = artifacts.require("GRAPReserves");
const GRAPRebaser = artifacts.require("GRAPRebaser");

const Gov = artifacts.require("GovernorAlpha");
const Timelock = artifacts.require("Timelock");

// deployed fourth
const GRAP_LINKPool = artifacts.require("GRAPLINKPool");


// deployed fifth
const GRAPIncentivizer = artifacts.require("GRAPIncentivizer");

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
  let grap = await GRAPProxy.deployed();
  let yReserves = await GRAPReserves.deployed()
  let yRebaser = await GRAPRebaser.deployed()
  let tl = await Timelock.deployed();
  let gov = await Gov.deployed();
  if (network != "test") {
    await deployer.deploy(GRAPIncentivizer);
    await deployer.deploy(GRAP_LINKPool);
    
    let link_pool = new web3.eth.Contract(GRAP_LINKPool.abi, GRAP_LINKPool.address);

    console.log("setting distributor");
    await Promise.all([
        link_pool.methods.setRewardDistribution("0xA8C178C6d6A9f5cd52145f4b142Bc5bc36C8F74f").send({from: "0xA8C178C6d6A9f5cd52145f4b142Bc5bc36C8F74f", gas: 100000}),
      ]);

    let twenty = web3.utils.toBN(10**3).mul(web3.utils.toBN(10**18)).mul(web3.utils.toBN(200));
    let one_five = web3.utils.toBN(10**3).mul(web3.utils.toBN(10**18)).mul(web3.utils.toBN(1500));

    console.log("transfering and notifying");
    console.log("eth");
    await Promise.all([
      grap.transfer(GRAP_LINKPool.address, twenty.toString()),
      grap._setIncentivizer(GRAPIncentivizer.address),
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
    grap._setPendingGov(Timelock.address),
    yReserves._setPendingGov(Timelock.address),
    yRebaser._setPendingGov(Timelock.address),
  ]);

  await Promise.all([
      tl.executeTransaction(
        GRAPProxy.address,
        0,
        "_acceptGov()",
        "0x",
        0
      ),

      tl.executeTransaction(
        GRAPReserves.address,
        0,
        "_acceptGov()",
        "0x",
        0
      ),

      tl.executeTransaction(
        GRAPRebaser.address,
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
