import {
  Yam
} from "../index.js";
import * as Types from "../lib/types.js";
import {
  addressMap
} from "../lib/constants.js";
import {
  decimalToString,
  stringToDecimal
} from "../lib/Helpers.js"


export const rupee = new Yam(
  "http://localhost:8545/",
  // "http://127.0.0.1:9545/",
  "1001",
  true, {
    defaultAccount: "",
    defaultConfirmations: 1,
    autoGasMultiplier: 1.5,
    testing: false,
    defaultGas: "6000000",
    defaultGasPrice: "1",
    accounts: [],
    ethereumNodeTimeout: 10000
  }
)
const oneEther = 10 ** 18;

describe("Distribution", () => {
  let snapshotId;
  let user;
  let user2;
  let ycrv_account = "0x0eb4add4ba497357546da7f5d12d39587ca24606";
  let weth_account = "0xf9e11762d522ea29dd78178c9baf83b7b093aacc";
  let uni_ampl_account = "0x8c545be506a335e24145edd6e01d2754296ff018";
  let comp_account = "0xc89b6f0146642688bb254bf93c28fccf1e182c81";
  let lend_account = "0x3b08aa814bea604917418a9f0907e7fc430e742c";
  let link_account = "0xbe6977e08d4479c0a6777539ae0e8fa27be4e9d6";
  let mkr_account = "0xf37216a8ac034d08b4663108d7532dfcb44583ed";
  let snx_account = "0xb696d629cd0a00560151a434f6b4478ad6c228d7"
  let yfi_account = "0x0eb4add4ba497357546da7f5d12d39587ca24606";
  beforeAll(async () => {
    const accounts = await rupee.web3.eth.getAccounts();
    rupee.addAccount(accounts[0]);
    user = accounts[0];
    rupee.addAccount(accounts[1]);
    user2 = accounts[1];
    snapshotId = await rupee.testing.snapshot();
  });

  beforeEach(async () => {
    await rupee.testing.resetEVM("0x2");
  });

  describe("pool failures", () => {
    test("cant join pool 1s early", async () => {
      await rupee.testing.resetEVM("0x2");
      let a = await rupee.web3.eth.getBlock('latest');

      let starttime = await rupee.contracts.eth_pool.methods.starttime().call();

      expect(rupee.toBigN(a["timestamp"]).toNumber()).toBeLessThan(rupee.toBigN(starttime).toNumber());

      //console.log("starttime", a["timestamp"], starttime);
      await rupee.contracts.weth.methods.approve(rupee.contracts.eth_pool.options.address, -1).send({from: user});

      await rupee.testing.expectThrow(
        rupee.contracts.eth_pool.methods.stake(
          rupee.toBigN(200).times(rupee.toBigN(10**18)).toString()
        ).send({
          from: user,
          gas: 300000
        })
      , "not start");


      a = await rupee.web3.eth.getBlock('latest');

      starttime = await rupee.contracts.ampl_pool.methods.starttime().call();

      expect(rupee.toBigN(a["timestamp"]).toNumber()).toBeLessThan(rupee.toBigN(starttime).toNumber());

      //console.log("starttime", a["timestamp"], starttime);

      await rupee.contracts.UNIAmpl.methods.approve(rupee.contracts.ampl_pool.options.address, -1).send({from: user});

      await rupee.testing.expectThrow(rupee.contracts.ampl_pool.methods.stake(
        "5016536322915819"
      ).send({
        from: user,
        gas: 300000
      }), "not start");
    });

    test("cant join pool 2 early", async () => {

    });

    test("cant withdraw more than deposited", async () => {
      await rupee.testing.resetEVM("0x2");
      let a = await rupee.web3.eth.getBlock('latest');

      await rupee.contracts.weth.methods.transfer(user, rupee.toBigN(2000).times(rupee.toBigN(10**18)).toString()).send({
        from: weth_account
      });
      await rupee.contracts.UNIAmpl.methods.transfer(user, "5000000000000000").send({
        from: uni_ampl_account
      });

      let starttime = await rupee.contracts.eth_pool.methods.starttime().call();

      let waittime = starttime - a["timestamp"];
      if (waittime > 0) {
        await rupee.testing.increaseTime(waittime);
      }

      await rupee.contracts.weth.methods.approve(rupee.contracts.eth_pool.options.address, -1).send({from: user});

      await rupee.contracts.eth_pool.methods.stake(
        rupee.toBigN(200).times(rupee.toBigN(10**18)).toString()
      ).send({
        from: user,
        gas: 300000
      });

      await rupee.contracts.UNIAmpl.methods.approve(rupee.contracts.ampl_pool.options.address, -1).send({from: user});

      await rupee.contracts.ampl_pool.methods.stake(
        "5000000000000000"
      ).send({
        from: user,
        gas: 300000
      });

      await rupee.testing.expectThrow(rupee.contracts.ampl_pool.methods.withdraw(
        "5016536322915820"
      ).send({
        from: user,
        gas: 300000
      }), "");

      await rupee.testing.expectThrow(rupee.contracts.eth_pool.methods.withdraw(
        rupee.toBigN(201).times(rupee.toBigN(10**18)).toString()
      ).send({
        from: user,
        gas: 300000
      }), "");

    });
  });

  describe("incentivizer pool", () => {
    test("joining and exiting", async() => {
      await rupee.testing.resetEVM("0x2");

      await rupee.contracts.ycrv.methods.transfer(user, "12000000000000000000000000").send({
        from: ycrv_account
      });

      await rupee.contracts.weth.methods.transfer(user, rupee.toBigN(2000).times(rupee.toBigN(10**18)).toString()).send({
        from: weth_account
      });

      let a = await rupee.web3.eth.getBlock('latest');

      let starttime = await rupee.contracts.eth_pool.methods.starttime().call();

      let waittime = starttime - a["timestamp"];
      if (waittime > 0) {
        await rupee.testing.increaseTime(waittime);
      } else {
        console.log("late entry", waittime)
      }

      await rupee.contracts.weth.methods.approve(rupee.contracts.eth_pool.options.address, -1).send({from: user});

      await rupee.contracts.eth_pool.methods.stake(
        "2000000000000000000000"
      ).send({
        from: user,
        gas: 300000
      });

      let earned = await rupee.contracts.eth_pool.methods.earned(user).call();

      let rr = await rupee.contracts.eth_pool.methods.rewardRate().call();

      let rpt = await rupee.contracts.eth_pool.methods.rewardPerToken().call();
      //console.log(earned, rr, rpt);
      await rupee.testing.increaseTime(86400);
      // await rupee.testing.mineBlock();

      earned = await rupee.contracts.eth_pool.methods.earned(user).call();

      rpt = await rupee.contracts.eth_pool.methods.rewardPerToken().call();

      let ysf = await rupee.contracts.rupee.methods.rupeesScalingFactor().call();

      console.log(earned, ysf, rpt);

      let j = await rupee.contracts.eth_pool.methods.getReward().send({
        from: user,
        gas: 300000
      });

      let rupee_bal = await rupee.contracts.rupee.methods.balanceOf(user).call()

      console.log("rupee bal", rupee_bal)
      // start rebasing
        //console.log("approve rupee")
        await rupee.contracts.rupee.methods.approve(
          rupee.contracts.uni_router.options.address,
          -1
        ).send({
          from: user,
          gas: 80000
        });
        //console.log("approve ycrv")
        await rupee.contracts.ycrv.methods.approve(
          rupee.contracts.uni_router.options.address,
          -1
        ).send({
          from: user,
          gas: 80000
        });

        let ycrv_bal = await rupee.contracts.ycrv.methods.balanceOf(user).call()

        console.log("ycrv_bal bal", ycrv_bal)

        console.log("add liq/ create pool")
        await rupee.contracts.uni_router.methods.addLiquidity(
          rupee.contracts.rupee.options.address,
          rupee.contracts.ycrv.options.address,
          rupee_bal,
          rupee_bal,
          rupee_bal,
          rupee_bal,
          user,
          1596740361 + 10000000
        ).send({
          from: user,
          gas: 8000000
        });

        let pair = await rupee.contracts.uni_fact.methods.getPair(
          rupee.contracts.rupee.options.address,
          rupee.contracts.ycrv.options.address
        ).call();

        rupee.contracts.uni_pair.options.address = pair;
        let bal = await rupee.contracts.uni_pair.methods.balanceOf(user).call();

        await rupee.contracts.uni_pair.methods.approve(
          rupee.contracts.ycrv_pool.options.address,
          -1
        ).send({
          from: user,
          gas: 300000
        });

        starttime = await rupee.contracts.ycrv_pool.methods.starttime().call();

        a = await rupee.web3.eth.getBlock('latest');

        waittime = starttime - a["timestamp"];
        if (waittime > 0) {
          await rupee.testing.increaseTime(waittime);
        } else {
          console.log("late entry, pool 2", waittime)
        }

        await rupee.contracts.ycrv_pool.methods.stake(bal).send({from: user, gas: 400000});


        earned = await rupee.contracts.ampl_pool.methods.earned(user).call();

        rr = await rupee.contracts.ampl_pool.methods.rewardRate().call();

        rpt = await rupee.contracts.ampl_pool.methods.rewardPerToken().call();

        console.log(earned, rr, rpt);

        await rupee.testing.increaseTime(172800 + 1000);

        earned = await rupee.contracts.ampl_pool.methods.earned(user).call();

        rr = await rupee.contracts.ampl_pool.methods.rewardRate().call();

        rpt = await rupee.contracts.ampl_pool.methods.rewardPerToken().call();

        console.log(earned, rr, rpt);

        await rupee.contracts.ycrv_pool.methods.exit().send({from: user, gas: 400000});

        rupee_bal = await rupee.contracts.rupee.methods.balanceOf(user).call();


        expect(rupee.toBigN(rupee_bal).toNumber()).toBeGreaterThan(0)
        console.log("rupee bal after staking in pool 2", rupee_bal);
    });
  });

  describe("ampl", () => {
    test("rewards from pool 1s ampl", async () => {
        await rupee.testing.resetEVM("0x2");

        await rupee.contracts.UNIAmpl.methods.transfer(user, "5000000000000000").send({
          from: uni_ampl_account
        });
        let a = await rupee.web3.eth.getBlock('latest');

        let starttime = await rupee.contracts.eth_pool.methods.starttime().call();

        let waittime = starttime - a["timestamp"];
        if (waittime > 0) {
          await rupee.testing.increaseTime(waittime);
        } else {
          //console.log("missed entry");
        }

        await rupee.contracts.UNIAmpl.methods.approve(rupee.contracts.ampl_pool.options.address, -1).send({from: user});

        await rupee.contracts.ampl_pool.methods.stake(
          "5000000000000000"
        ).send({
          from: user,
          gas: 300000
        });

        let earned = await rupee.contracts.ampl_pool.methods.earned(user).call();

        let rr = await rupee.contracts.ampl_pool.methods.rewardRate().call();

        let rpt = await rupee.contracts.ampl_pool.methods.rewardPerToken().call();
        //console.log(earned, rr, rpt);
        await rupee.testing.increaseTime(172800 + 100);
        // await rupee.testing.mineBlock();

        earned = await rupee.contracts.ampl_pool.methods.earned(user).call();

        rpt = await rupee.contracts.ampl_pool.methods.rewardPerToken().call();

        let ysf = await rupee.contracts.rupee.methods.rupeesScalingFactor().call();

        //console.log(earned, ysf, rpt);


        let rupee_bal = await rupee.contracts.rupee.methods.balanceOf(user).call()

        let j = await rupee.contracts.ampl_pool.methods.exit().send({
          from: user,
          gas: 300000
        });

        //console.log(j.events)

        // let k = await rupee.contracts.eth_pool.methods.exit().send({
        //   from: user,
        //   gas: 300000
        // });
        //
        // //console.log(k.events)

        // weth_bal = await rupee.contracts.weth.methods.balanceOf(user).call()

        // expect(weth_bal).toBe(rupee.toBigN(2000).times(rupee.toBigN(10**18)).toString())

        let ampl_bal = await rupee.contracts.UNIAmpl.methods.balanceOf(user).call()

        expect(ampl_bal).toBe("5000000000000000")


        let rupee_bal2 = await rupee.contracts.rupee.methods.balanceOf(user).call()

        let two_fity = rupee.toBigN(250).times(rupee.toBigN(10**3)).times(rupee.toBigN(10**18))
        expect(rupee.toBigN(rupee_bal2).minus(rupee.toBigN(rupee_bal)).toString()).toBe(two_fity.times(1).toString())
    });
  });

  describe("eth", () => {
    test("rewards from pool 1s eth", async () => {
        await rupee.testing.resetEVM("0x2");

        await rupee.contracts.weth.methods.transfer(user, rupee.toBigN(2000).times(rupee.toBigN(10**18)).toString()).send({
          from: weth_account
        });

        let a = await rupee.web3.eth.getBlock('latest');

        let starttime = await rupee.contracts.eth_pool.methods.starttime().call();

        let waittime = starttime - a["timestamp"];
        if (waittime > 0) {
          await rupee.testing.increaseTime(waittime);
        } else {
          console.log("late entry", waittime)
        }

        await rupee.contracts.weth.methods.approve(rupee.contracts.eth_pool.options.address, -1).send({from: user});

        await rupee.contracts.eth_pool.methods.stake(
          "2000000000000000000000"
        ).send({
          from: user,
          gas: 300000
        });

        let earned = await rupee.contracts.eth_pool.methods.earned(user).call();

        let rr = await rupee.contracts.eth_pool.methods.rewardRate().call();

        let rpt = await rupee.contracts.eth_pool.methods.rewardPerToken().call();
        //console.log(earned, rr, rpt);
        await rupee.testing.increaseTime(172800 + 100);
        // await rupee.testing.mineBlock();

        earned = await rupee.contracts.eth_pool.methods.earned(user).call();

        rpt = await rupee.contracts.eth_pool.methods.rewardPerToken().call();

        let ysf = await rupee.contracts.rupee.methods.rupeesScalingFactor().call();

        //console.log(earned, ysf, rpt);


        let rupee_bal = await rupee.contracts.rupee.methods.balanceOf(user).call()

        let j = await rupee.contracts.eth_pool.methods.exit().send({
          from: user,
          gas: 300000
        });

        //console.log(j.events)

        let weth_bal = await rupee.contracts.weth.methods.balanceOf(user).call()

        expect(weth_bal).toBe("2000000000000000000000")


        let rupee_bal2 = await rupee.contracts.rupee.methods.balanceOf(user).call()

        let two_fity = rupee.toBigN(250).times(rupee.toBigN(10**3)).times(rupee.toBigN(10**18))
        expect(rupee.toBigN(rupee_bal2).minus(rupee.toBigN(rupee_bal)).toString()).toBe(two_fity.times(1).toString())
    });
    test("rewards from pool 1s eth with rebase", async () => {
        await rupee.testing.resetEVM("0x2");

        await rupee.contracts.ycrv.methods.transfer(user, "12000000000000000000000000").send({
          from: ycrv_account
        });

        await rupee.contracts.weth.methods.transfer(user, rupee.toBigN(2000).times(rupee.toBigN(10**18)).toString()).send({
          from: weth_account
        });

        let a = await rupee.web3.eth.getBlock('latest');

        let starttime = await rupee.contracts.eth_pool.methods.starttime().call();

        let waittime = starttime - a["timestamp"];
        if (waittime > 0) {
          await rupee.testing.increaseTime(waittime);
        } else {
          console.log("late entry", waittime)
        }

        await rupee.contracts.weth.methods.approve(rupee.contracts.eth_pool.options.address, -1).send({from: user});

        await rupee.contracts.eth_pool.methods.stake(
          "2000000000000000000000"
        ).send({
          from: user,
          gas: 300000
        });

        let earned = await rupee.contracts.eth_pool.methods.earned(user).call();

        let rr = await rupee.contracts.eth_pool.methods.rewardRate().call();

        let rpt = await rupee.contracts.eth_pool.methods.rewardPerToken().call();
        //console.log(earned, rr, rpt);
        await rupee.testing.increaseTime(125000 + 100);
        // await rupee.testing.mineBlock();

        earned = await rupee.contracts.eth_pool.methods.earned(user).call();

        rpt = await rupee.contracts.eth_pool.methods.rewardPerToken().call();

        let ysf = await rupee.contracts.rupee.methods.rupeesScalingFactor().call();

        //console.log(earned, ysf, rpt);




        let j = await rupee.contracts.eth_pool.methods.getReward().send({
          from: user,
          gas: 300000
        });

        let rupee_bal = await rupee.contracts.rupee.methods.balanceOf(user).call()

        console.log("rupee bal", rupee_bal)
        // start rebasing
          //console.log("approve rupee")
          await rupee.contracts.rupee.methods.approve(
            rupee.contracts.uni_router.options.address,
            -1
          ).send({
            from: user,
            gas: 80000
          });
          //console.log("approve ycrv")
          await rupee.contracts.ycrv.methods.approve(
            rupee.contracts.uni_router.options.address,
            -1
          ).send({
            from: user,
            gas: 80000
          });

          let ycrv_bal = await rupee.contracts.ycrv.methods.balanceOf(user).call()

          console.log("ycrv_bal bal", ycrv_bal)

          console.log("add liq/ create pool")
          await rupee.contracts.uni_router.methods.addLiquidity(
            rupee.contracts.rupee.options.address,
            rupee.contracts.ycrv.options.address,
            rupee_bal,
            rupee_bal,
            rupee_bal,
            rupee_bal,
            user,
            1596740361 + 10000000
          ).send({
            from: user,
            gas: 8000000
          });

          let pair = await rupee.contracts.uni_fact.methods.getPair(
            rupee.contracts.rupee.options.address,
            rupee.contracts.ycrv.options.address
          ).call();

          rupee.contracts.uni_pair.options.address = pair;
          let bal = await rupee.contracts.uni_pair.methods.balanceOf(user).call();

          // make a trade to get init values in uniswap
          //console.log("init swap")
          await rupee.contracts.uni_router.methods.swapExactTokensForTokens(
            "100000000000000000000000",
            100000,
            [
              rupee.contracts.ycrv.options.address,
              rupee.contracts.rupee.options.address
            ],
            user,
            1596740361 + 10000000
          ).send({
            from: user,
            gas: 1000000
          });

          // trade back for easier calcs later
          //console.log("swap 0")
          await rupee.contracts.uni_router.methods.swapExactTokensForTokens(
            "10000000000000000",
            100000,
            [
              rupee.contracts.ycrv.options.address,
              rupee.contracts.rupee.options.address
            ],
            user,
            1596740361 + 10000000
          ).send({
            from: user,
            gas: 1000000
          });

          await rupee.testing.increaseTime(43200);

          //console.log("init twap")
          await rupee.contracts.rebaser.methods.init_twap().send({
            from: user,
            gas: 500000
          });

          //console.log("first swap")
          await rupee.contracts.uni_router.methods.swapExactTokensForTokens(
            "1000000000000000000000",
            100000,
            [
              rupee.contracts.ycrv.options.address,
              rupee.contracts.rupee.options.address
            ],
            user,
            1596740361 + 10000000
          ).send({
            from: user,
            gas: 1000000
          });

          // init twap
          let init_twap = await rupee.contracts.rebaser.methods.timeOfTWAPInit().call();

          // wait 12 hours
          await rupee.testing.increaseTime(12 * 60 * 60);

          // perform trade to change price
          //console.log("second swap")
          await rupee.contracts.uni_router.methods.swapExactTokensForTokens(
            "10000000000000000000",
            100000,
            [
              rupee.contracts.ycrv.options.address,
              rupee.contracts.rupee.options.address
            ],
            user,
            1596740361 + 10000000
          ).send({
            from: user,
            gas: 1000000
          });

          // activate rebasing
          await rupee.contracts.rebaser.methods.activate_rebasing().send({
            from: user,
            gas: 500000
          });


          bal = await rupee.contracts.rupee.methods.balanceOf(user).call();

          a = await rupee.web3.eth.getBlock('latest');

          let offset = await rupee.contracts.rebaser.methods.rebaseWindowOffsetSec().call();
          offset = rupee.toBigN(offset).toNumber();
          let interval = await rupee.contracts.rebaser.methods.minRebaseTimeIntervalSec().call();
          interval = rupee.toBigN(interval).toNumber();

          let i;
          if (a["timestamp"] % interval > offset) {
            i = (interval - (a["timestamp"] % interval)) + offset;
          } else {
            i = offset - (a["timestamp"] % interval);
          }

          await rupee.testing.increaseTime(i);

          let r = await rupee.contracts.uni_pair.methods.getReserves().call();
          let q = await rupee.contracts.uni_router.methods.quote(rupee.toBigN(10**18).toString(), r[0], r[1]).call();
          console.log("quote pre positive rebase", q);

          let b = await rupee.contracts.rebaser.methods.rebase().send({
            from: user,
            gas: 2500000
          });

          let bal1 = await rupee.contracts.rupee.methods.balanceOf(user).call();

          let resRUPEE = await rupee.contracts.rupee.methods.balanceOf(rupee.contracts.reserves.options.address).call();

          let resycrv = await rupee.contracts.ycrv.methods.balanceOf(rupee.contracts.reserves.options.address).call();

          // new balance > old balance
          expect(rupee.toBigN(bal).toNumber()).toBeLessThan(rupee.toBigN(bal1).toNumber());
          // increases reserves
          expect(rupee.toBigN(resycrv).toNumber()).toBeGreaterThan(0);

          r = await rupee.contracts.uni_pair.methods.getReserves().call();
          q = await rupee.contracts.uni_router.methods.quote(rupee.toBigN(10**18).toString(), r[0], r[1]).call();
          console.log("quote", q);
          // not below peg
          expect(rupee.toBigN(q).toNumber()).toBeGreaterThan(rupee.toBigN(10**18).toNumber());


        await rupee.testing.increaseTime(525000 + 100);


        j = await rupee.contracts.eth_pool.methods.exit().send({
          from: user,
          gas: 300000
        });
        //console.log(j.events)

        let weth_bal = await rupee.contracts.weth.methods.balanceOf(user).call()

        expect(weth_bal).toBe("2000000000000000000000")


        let rupee_bal2 = await rupee.contracts.rupee.methods.balanceOf(user).call()

        let two_fity = rupee.toBigN(250).times(rupee.toBigN(10**3)).times(rupee.toBigN(10**18))
        expect(
          rupee.toBigN(rupee_bal2).minus(rupee.toBigN(rupee_bal)).toNumber()
        ).toBeGreaterThan(two_fity.toNumber())
    });
    test("rewards from pool 1s eth with negative rebase", async () => {
        await rupee.testing.resetEVM("0x2");

        await rupee.contracts.ycrv.methods.transfer(user, "12000000000000000000000000").send({
          from: ycrv_account
        });

        await rupee.contracts.weth.methods.transfer(user, rupee.toBigN(2000).times(rupee.toBigN(10**18)).toString()).send({
          from: weth_account
        });

        let a = await rupee.web3.eth.getBlock('latest');

        let starttime = await rupee.contracts.eth_pool.methods.starttime().call();

        let waittime = starttime - a["timestamp"];
        if (waittime > 0) {
          await rupee.testing.increaseTime(waittime);
        } else {
          console.log("late entry", waittime)
        }

        await rupee.contracts.weth.methods.approve(rupee.contracts.eth_pool.options.address, -1).send({from: user});

        await rupee.contracts.eth_pool.methods.stake(
          "2000000000000000000000"
        ).send({
          from: user,
          gas: 300000
        });

        let earned = await rupee.contracts.eth_pool.methods.earned(user).call();

        let rr = await rupee.contracts.eth_pool.methods.rewardRate().call();

        let rpt = await rupee.contracts.eth_pool.methods.rewardPerToken().call();
        //console.log(earned, rr, rpt);
        await rupee.testing.increaseTime(125000 + 100);
        // await rupee.testing.mineBlock();

        earned = await rupee.contracts.eth_pool.methods.earned(user).call();

        rpt = await rupee.contracts.eth_pool.methods.rewardPerToken().call();

        let ysf = await rupee.contracts.rupee.methods.rupeesScalingFactor().call();

        //console.log(earned, ysf, rpt);




        let j = await rupee.contracts.eth_pool.methods.getReward().send({
          from: user,
          gas: 300000
        });

        let rupee_bal = await rupee.contracts.rupee.methods.balanceOf(user).call()

        console.log("rupee bal", rupee_bal)
        // start rebasing
          //console.log("approve rupee")
          await rupee.contracts.rupee.methods.approve(
            rupee.contracts.uni_router.options.address,
            -1
          ).send({
            from: user,
            gas: 80000
          });
          //console.log("approve ycrv")
          await rupee.contracts.ycrv.methods.approve(
            rupee.contracts.uni_router.options.address,
            -1
          ).send({
            from: user,
            gas: 80000
          });

          let ycrv_bal = await rupee.contracts.ycrv.methods.balanceOf(user).call()

          console.log("ycrv_bal bal", ycrv_bal)

          rupee_bal = rupee.toBigN(rupee_bal);
          console.log("add liq/ create pool")
          await rupee.contracts.uni_router.methods.addLiquidity(
            rupee.contracts.rupee.options.address,
            rupee.contracts.ycrv.options.address,
            rupee_bal.times(.1).toString(),
            rupee_bal.times(.1).toString(),
            rupee_bal.times(.1).toString(),
            rupee_bal.times(.1).toString(),
            user,
            1596740361 + 10000000
          ).send({
            from: user,
            gas: 8000000
          });

          let pair = await rupee.contracts.uni_fact.methods.getPair(
            rupee.contracts.rupee.options.address,
            rupee.contracts.ycrv.options.address
          ).call();

          rupee.contracts.uni_pair.options.address = pair;
          let bal = await rupee.contracts.uni_pair.methods.balanceOf(user).call();

          // make a trade to get init values in uniswap
          //console.log("init swap")
          await rupee.contracts.uni_router.methods.swapExactTokensForTokens(
            "1000000000000000000000",
            100000,
            [
              rupee.contracts.rupee.options.address,
              rupee.contracts.ycrv.options.address
            ],
            user,
            1596740361 + 10000000
          ).send({
            from: user,
            gas: 1000000
          });

          // trade back for easier calcs later
          //console.log("swap 0")
          await rupee.contracts.uni_router.methods.swapExactTokensForTokens(
            "100000000000000",
            100000,
            [
              rupee.contracts.rupee.options.address,
              rupee.contracts.ycrv.options.address
            ],
            user,
            1596740361 + 10000000
          ).send({
            from: user,
            gas: 1000000
          });

          await rupee.testing.increaseTime(43200);

          //console.log("init twap")
          await rupee.contracts.rebaser.methods.init_twap().send({
            from: user,
            gas: 500000
          });

          //console.log("first swap")
          await rupee.contracts.uni_router.methods.swapExactTokensForTokens(
            "100000000000000",
            100000,
            [
              rupee.contracts.rupee.options.address,
              rupee.contracts.ycrv.options.address
            ],
            user,
            1596740361 + 10000000
          ).send({
            from: user,
            gas: 1000000
          });

          // init twap
          let init_twap = await rupee.contracts.rebaser.methods.timeOfTWAPInit().call();

          // wait 12 hours
          await rupee.testing.increaseTime(12 * 60 * 60);

          // perform trade to change price
          //console.log("second swap")
          await rupee.contracts.uni_router.methods.swapExactTokensForTokens(
            "1000000000000000000",
            100000,
            [
              rupee.contracts.rupee.options.address,
              rupee.contracts.ycrv.options.address
            ],
            user,
            1596740361 + 10000000
          ).send({
            from: user,
            gas: 1000000
          });

          // activate rebasing
          await rupee.contracts.rebaser.methods.activate_rebasing().send({
            from: user,
            gas: 500000
          });


          bal = await rupee.contracts.rupee.methods.balanceOf(user).call();

          a = await rupee.web3.eth.getBlock('latest');

          let offset = await rupee.contracts.rebaser.methods.rebaseWindowOffsetSec().call();
          offset = rupee.toBigN(offset).toNumber();
          let interval = await rupee.contracts.rebaser.methods.minRebaseTimeIntervalSec().call();
          interval = rupee.toBigN(interval).toNumber();

          let i;
          if (a["timestamp"] % interval > offset) {
            i = (interval - (a["timestamp"] % interval)) + offset;
          } else {
            i = offset - (a["timestamp"] % interval);
          }

          await rupee.testing.increaseTime(i);

          let r = await rupee.contracts.uni_pair.methods.getReserves().call();
          let q = await rupee.contracts.uni_router.methods.quote(rupee.toBigN(10**18).toString(), r[0], r[1]).call();
          console.log("quote pre positive rebase", q);

          let b = await rupee.contracts.rebaser.methods.rebase().send({
            from: user,
            gas: 2500000
          });

          let bal1 = await rupee.contracts.rupee.methods.balanceOf(user).call();

          let resRUPEE = await rupee.contracts.rupee.methods.balanceOf(rupee.contracts.reserves.options.address).call();

          let resycrv = await rupee.contracts.ycrv.methods.balanceOf(rupee.contracts.reserves.options.address).call();

          expect(rupee.toBigN(bal1).toNumber()).toBeLessThan(rupee.toBigN(bal).toNumber());
          expect(rupee.toBigN(resycrv).toNumber()).toBe(0);

          r = await rupee.contracts.uni_pair.methods.getReserves().call();
          q = await rupee.contracts.uni_router.methods.quote(rupee.toBigN(10**18).toString(), r[0], r[1]).call();
          console.log("quote", q);
          // not below peg
          expect(rupee.toBigN(q).toNumber()).toBeLessThan(rupee.toBigN(10**18).toNumber());


        await rupee.testing.increaseTime(525000 + 100);


        j = await rupee.contracts.eth_pool.methods.exit().send({
          from: user,
          gas: 300000
        });
        //console.log(j.events)

        let weth_bal = await rupee.contracts.weth.methods.balanceOf(user).call()

        expect(weth_bal).toBe("2000000000000000000000")


        let rupee_bal2 = await rupee.contracts.rupee.methods.balanceOf(user).call()

        let two_fity = rupee.toBigN(250).times(rupee.toBigN(10**3)).times(rupee.toBigN(10**18))
        expect(
          rupee.toBigN(rupee_bal2).minus(rupee.toBigN(rupee_bal)).toNumber()
        ).toBeLessThan(two_fity.toNumber())
    });
  });

  describe("yfi", () => {
    test("rewards from pool 1s yfi", async () => {
        await rupee.testing.resetEVM("0x2");
        await rupee.contracts.yfi.methods.transfer(user, "500000000000000000000").send({
          from: yfi_account
        });

        let a = await rupee.web3.eth.getBlock('latest');

        let starttime = await rupee.contracts.yfi_pool.methods.starttime().call();

        let waittime = starttime - a["timestamp"];
        if (waittime > 0) {
          await rupee.testing.increaseTime(waittime);
        } else {
          console.log("late entry", waittime)
        }

        await rupee.contracts.yfi.methods.approve(rupee.contracts.yfi_pool.options.address, -1).send({from: user});

        await rupee.contracts.yfi_pool.methods.stake(
          "500000000000000000000"
        ).send({
          from: user,
          gas: 300000
        });

        let earned = await rupee.contracts.yfi_pool.methods.earned(user).call();

        let rr = await rupee.contracts.yfi_pool.methods.rewardRate().call();

        let rpt = await rupee.contracts.yfi_pool.methods.rewardPerToken().call();
        //console.log(earned, rr, rpt);
        await rupee.testing.increaseTime(172800 + 100);
        // await rupee.testing.mineBlock();

        earned = await rupee.contracts.yfi_pool.methods.earned(user).call();

        rpt = await rupee.contracts.yfi_pool.methods.rewardPerToken().call();

        let ysf = await rupee.contracts.rupee.methods.rupeesScalingFactor().call();

        //console.log(earned, ysf, rpt);


        let rupee_bal = await rupee.contracts.rupee.methods.balanceOf(user).call()

        let j = await rupee.contracts.yfi_pool.methods.exit().send({
          from: user,
          gas: 300000
        });

        //console.log(j.events)

        let weth_bal = await rupee.contracts.yfi.methods.balanceOf(user).call()

        expect(weth_bal).toBe("500000000000000000000")


        let rupee_bal2 = await rupee.contracts.rupee.methods.balanceOf(user).call()

        let two_fity = rupee.toBigN(250).times(rupee.toBigN(10**3)).times(rupee.toBigN(10**18))
        expect(rupee.toBigN(rupee_bal2).minus(rupee.toBigN(rupee_bal)).toString()).toBe(two_fity.times(1).toString())
    });
  });

  describe("comp", () => {
    test("rewards from pool 1s comp", async () => {
        await rupee.testing.resetEVM("0x2");
        await rupee.contracts.comp.methods.transfer(user, "50000000000000000000000").send({
          from: comp_account
        });

        let a = await rupee.web3.eth.getBlock('latest');

        let starttime = await rupee.contracts.comp_pool.methods.starttime().call();

        let waittime = starttime - a["timestamp"];
        if (waittime > 0) {
          await rupee.testing.increaseTime(waittime);
        } else {
          console.log("late entry", waittime)
        }

        await rupee.contracts.comp.methods.approve(rupee.contracts.comp_pool.options.address, -1).send({from: user});

        await rupee.contracts.comp_pool.methods.stake(
          "50000000000000000000000"
        ).send({
          from: user,
          gas: 300000
        });

        let earned = await rupee.contracts.comp_pool.methods.earned(user).call();

        let rr = await rupee.contracts.comp_pool.methods.rewardRate().call();

        let rpt = await rupee.contracts.comp_pool.methods.rewardPerToken().call();
        //console.log(earned, rr, rpt);
        await rupee.testing.increaseTime(172800 + 100);
        // await rupee.testing.mineBlock();

        earned = await rupee.contracts.comp_pool.methods.earned(user).call();

        rpt = await rupee.contracts.comp_pool.methods.rewardPerToken().call();

        let ysf = await rupee.contracts.rupee.methods.rupeesScalingFactor().call();

        //console.log(earned, ysf, rpt);


        let rupee_bal = await rupee.contracts.rupee.methods.balanceOf(user).call()

        let j = await rupee.contracts.comp_pool.methods.exit().send({
          from: user,
          gas: 300000
        });

        //console.log(j.events)

        let weth_bal = await rupee.contracts.comp.methods.balanceOf(user).call()

        expect(weth_bal).toBe("50000000000000000000000")


        let rupee_bal2 = await rupee.contracts.rupee.methods.balanceOf(user).call()

        let two_fity = rupee.toBigN(250).times(rupee.toBigN(10**3)).times(rupee.toBigN(10**18))
        expect(rupee.toBigN(rupee_bal2).minus(rupee.toBigN(rupee_bal)).toString()).toBe(two_fity.times(1).toString())
    });
  });

  describe("lend", () => {
    test("rewards from pool 1s lend", async () => {
        await rupee.testing.resetEVM("0x2");
        await rupee.web3.eth.sendTransaction({from: user2, to: lend_account, value : rupee.toBigN(100000*10**18).toString()});

        await rupee.contracts.lend.methods.transfer(user, "10000000000000000000000000").send({
          from: lend_account
        });

        let a = await rupee.web3.eth.getBlock('latest');

        let starttime = await rupee.contracts.lend_pool.methods.starttime().call();

        let waittime = starttime - a["timestamp"];
        if (waittime > 0) {
          await rupee.testing.increaseTime(waittime);
        } else {
          console.log("late entry", waittime)
        }

        await rupee.contracts.lend.methods.approve(rupee.contracts.lend_pool.options.address, -1).send({from: user});

        await rupee.contracts.lend_pool.methods.stake(
          "10000000000000000000000000"
        ).send({
          from: user,
          gas: 300000
        });

        let earned = await rupee.contracts.lend_pool.methods.earned(user).call();

        let rr = await rupee.contracts.lend_pool.methods.rewardRate().call();

        let rpt = await rupee.contracts.lend_pool.methods.rewardPerToken().call();
        //console.log(earned, rr, rpt);
        await rupee.testing.increaseTime(172800 + 100);
        // await rupee.testing.mineBlock();

        earned = await rupee.contracts.lend_pool.methods.earned(user).call();

        rpt = await rupee.contracts.lend_pool.methods.rewardPerToken().call();

        let ysf = await rupee.contracts.rupee.methods.rupeesScalingFactor().call();

        //console.log(earned, ysf, rpt);


        let rupee_bal = await rupee.contracts.rupee.methods.balanceOf(user).call()

        let j = await rupee.contracts.lend_pool.methods.exit().send({
          from: user,
          gas: 300000
        });

        //console.log(j.events)

        let weth_bal = await rupee.contracts.lend.methods.balanceOf(user).call()

        expect(weth_bal).toBe("10000000000000000000000000")


        let rupee_bal2 = await rupee.contracts.rupee.methods.balanceOf(user).call()

        let two_fity = rupee.toBigN(250).times(rupee.toBigN(10**3)).times(rupee.toBigN(10**18))
        expect(rupee.toBigN(rupee_bal2).minus(rupee.toBigN(rupee_bal)).toString()).toBe(two_fity.times(1).toString())
    });
  });

  describe("link", () => {
    test("rewards from pool 1s link", async () => {
        await rupee.testing.resetEVM("0x2");

        await rupee.web3.eth.sendTransaction({from: user2, to: link_account, value : rupee.toBigN(100000*10**18).toString()});

        await rupee.contracts.link.methods.transfer(user, "10000000000000000000000000").send({
          from: link_account
        });

        let a = await rupee.web3.eth.getBlock('latest');

        let starttime = await rupee.contracts.link_pool.methods.starttime().call();

        let waittime = starttime - a["timestamp"];
        if (waittime > 0) {
          await rupee.testing.increaseTime(waittime);
        } else {
          console.log("late entry", waittime)
        }

        await rupee.contracts.link.methods.approve(rupee.contracts.link_pool.options.address, -1).send({from: user});

        await rupee.contracts.link_pool.methods.stake(
          "10000000000000000000000000"
        ).send({
          from: user,
          gas: 300000
        });

        let earned = await rupee.contracts.link_pool.methods.earned(user).call();

        let rr = await rupee.contracts.link_pool.methods.rewardRate().call();

        let rpt = await rupee.contracts.link_pool.methods.rewardPerToken().call();
        //console.log(earned, rr, rpt);
        await rupee.testing.increaseTime(172800 + 100);
        // await rupee.testing.mineBlock();

        earned = await rupee.contracts.link_pool.methods.earned(user).call();

        rpt = await rupee.contracts.link_pool.methods.rewardPerToken().call();

        let ysf = await rupee.contracts.rupee.methods.rupeesScalingFactor().call();

        //console.log(earned, ysf, rpt);


        let rupee_bal = await rupee.contracts.rupee.methods.balanceOf(user).call()

        let j = await rupee.contracts.link_pool.methods.exit().send({
          from: user,
          gas: 300000
        });

        //console.log(j.events)

        let weth_bal = await rupee.contracts.link.methods.balanceOf(user).call()

        expect(weth_bal).toBe("10000000000000000000000000")


        let rupee_bal2 = await rupee.contracts.rupee.methods.balanceOf(user).call()

        let two_fity = rupee.toBigN(250).times(rupee.toBigN(10**3)).times(rupee.toBigN(10**18))
        expect(rupee.toBigN(rupee_bal2).minus(rupee.toBigN(rupee_bal)).toString()).toBe(two_fity.times(1).toString())
    });
  });

  describe("mkr", () => {
    test("rewards from pool 1s mkr", async () => {
        await rupee.testing.resetEVM("0x2");
        await rupee.web3.eth.sendTransaction({from: user2, to: mkr_account, value : rupee.toBigN(100000*10**18).toString()});
        let eth_bal = await rupee.web3.eth.getBalance(mkr_account);

        await rupee.contracts.mkr.methods.transfer(user, "10000000000000000000000").send({
          from: mkr_account
        });

        let a = await rupee.web3.eth.getBlock('latest');

        let starttime = await rupee.contracts.mkr_pool.methods.starttime().call();

        let waittime = starttime - a["timestamp"];
        if (waittime > 0) {
          await rupee.testing.increaseTime(waittime);
        } else {
          console.log("late entry", waittime)
        }

        await rupee.contracts.mkr.methods.approve(rupee.contracts.mkr_pool.options.address, -1).send({from: user});

        await rupee.contracts.mkr_pool.methods.stake(
          "10000000000000000000000"
        ).send({
          from: user,
          gas: 300000
        });

        let earned = await rupee.contracts.mkr_pool.methods.earned(user).call();

        let rr = await rupee.contracts.mkr_pool.methods.rewardRate().call();

        let rpt = await rupee.contracts.mkr_pool.methods.rewardPerToken().call();
        //console.log(earned, rr, rpt);
        await rupee.testing.increaseTime(172800 + 100);
        // await rupee.testing.mineBlock();

        earned = await rupee.contracts.mkr_pool.methods.earned(user).call();

        rpt = await rupee.contracts.mkr_pool.methods.rewardPerToken().call();

        let ysf = await rupee.contracts.rupee.methods.rupeesScalingFactor().call();

        //console.log(earned, ysf, rpt);


        let rupee_bal = await rupee.contracts.rupee.methods.balanceOf(user).call()

        let j = await rupee.contracts.mkr_pool.methods.exit().send({
          from: user,
          gas: 300000
        });

        //console.log(j.events)

        let weth_bal = await rupee.contracts.mkr.methods.balanceOf(user).call()

        expect(weth_bal).toBe("10000000000000000000000")


        let rupee_bal2 = await rupee.contracts.rupee.methods.balanceOf(user).call()

        let two_fity = rupee.toBigN(250).times(rupee.toBigN(10**3)).times(rupee.toBigN(10**18))
        expect(rupee.toBigN(rupee_bal2).minus(rupee.toBigN(rupee_bal)).toString()).toBe(two_fity.times(1).toString())
    });
  });

  describe("snx", () => {
    test("rewards from pool 1s snx", async () => {
        await rupee.testing.resetEVM("0x2");

        await rupee.web3.eth.sendTransaction({from: user2, to: snx_account, value : rupee.toBigN(100000*10**18).toString()});

        let snx_bal = await rupee.contracts.snx.methods.balanceOf(snx_account).call();

        console.log(snx_bal)

        await rupee.contracts.snx.methods.transfer(user, snx_bal).send({
          from: snx_account
        });

        snx_bal = await rupee.contracts.snx.methods.balanceOf(user).call();

        console.log(snx_bal)

        let a = await rupee.web3.eth.getBlock('latest');

        let starttime = await rupee.contracts.snx_pool.methods.starttime().call();

        let waittime = starttime - a["timestamp"];
        if (waittime > 0) {
          await rupee.testing.increaseTime(waittime);
        } else {
          console.log("late entry", waittime)
        }

        await rupee.contracts.snx.methods.approve(rupee.contracts.snx_pool.options.address, -1).send({from: user});

        await rupee.contracts.snx_pool.methods.stake(
          snx_bal
        ).send({
          from: user,
          gas: 300000
        });

        let earned = await rupee.contracts.snx_pool.methods.earned(user).call();

        let rr = await rupee.contracts.snx_pool.methods.rewardRate().call();

        let rpt = await rupee.contracts.snx_pool.methods.rewardPerToken().call();
        //console.log(earned, rr, rpt);
        await rupee.testing.increaseTime(172800 + 100);
        // await rupee.testing.mineBlock();

        earned = await rupee.contracts.snx_pool.methods.earned(user).call();

        rpt = await rupee.contracts.snx_pool.methods.rewardPerToken().call();

        let ysf = await rupee.contracts.rupee.methods.rupeesScalingFactor().call();

        //console.log(earned, ysf, rpt);


        let rupee_bal = await rupee.contracts.rupee.methods.balanceOf(user).call()

        let j = await rupee.contracts.snx_pool.methods.exit().send({
          from: user,
          gas: 300000
        });

        //console.log(j.events)

        let weth_bal = await rupee.contracts.snx.methods.balanceOf(user).call()

        expect(weth_bal).toBe(snx_bal)


        let rupee_bal2 = await rupee.contracts.rupee.methods.balanceOf(user).call()

        let two_fity = rupee.toBigN(250).times(rupee.toBigN(10**3)).times(rupee.toBigN(10**18))
        expect(rupee.toBigN(rupee_bal2).minus(rupee.toBigN(rupee_bal)).toString()).toBe(two_fity.times(1).toString())
    });
  });
})
