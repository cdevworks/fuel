import {ethers} from 'ethers'

import BigNumber from 'bignumber.js'

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
});

const GAS_LIMIT = {
  STAKING: {
    DEFAULT: 200000,
    SNX: 850000,
  }
};

export const getPoolStartTime = async (poolContract) => {
  return await poolContract.methods.starttime().call()
}

export const stake = async (poolContract, amount, account, tokenName) => {
  let now = new Date().getTime() / 1000;
  const gas = GAS_LIMIT.STAKING[tokenName.toUpperCase()] || GAS_LIMIT.STAKING.DEFAULT;
  if (now >= 1597172400) {
    return poolContract.methods
      .stake((new BigNumber(amount).times(new BigNumber(10).pow(18))).toString())
      .send({ from: account, gas })
      .on('transactionHash', tx => {
        console.log(tx)
        return tx.transactionHash
      })
  } else {
    alert("pool not active");
  }
}

export const unstake = async (poolContract, amount, account) => {
  let now = new Date().getTime() / 1000;
  if (now >= 1597172400) {
    return poolContract.methods
      .withdraw((new BigNumber(amount).times(new BigNumber(10).pow(18))).toString())
      .send({ from: account, gas: 200000 })
      .on('transactionHash', tx => {
        console.log(tx)
        return tx.transactionHash
      })
  } else {
    alert("pool not active");
  }
}

export const harvest = async (poolContract, account) => {
  let now = new Date().getTime() / 1000;
  if (now >= 1597172400) {
    return poolContract.methods
      .getReward()
      .send({ from: account, gas: 200000 })
      .on('transactionHash', tx => {
        console.log(tx)
        return tx.transactionHash
      })
  } else {
    alert("pool not active");
  }
}

export const redeem = async (poolContract, account) => {
  let now = new Date().getTime() / 1000;
  if (now >= 1597172400) {
    return poolContract.methods
      .exit()
      .send({ from: account, gas: 200000 })
      .on('transactionHash', tx => {
        console.log(tx)
        return tx.transactionHash
      })
  } else {
    alert("pool not active");
  }
}

export const approve = async (tokenContract, poolContract, account) => {
  return tokenContract.methods
    .approve(poolContract.options.address, ethers.constants.MaxUint256)
    .send({ from: account, gas: 80000 })
}

export const getPoolContracts = async (rupee) => {
  const pools = Object.keys(rupee.contracts)
    .filter(c => c.indexOf('_pool') !== -1)
    .reduce((acc, cur) => {
      const newAcc = { ...acc }
      newAcc[cur] = rupee.contracts[cur]
      return newAcc
    }, {})
  return pools
}

export const getEarned = async (rupee, pool, account) => {
  const scalingFactor = new BigNumber(await rupee.contracts.rupee.methods.rupeesScalingFactor().call())
  const earned = new BigNumber(await pool.methods.earned(account).call())
  return earned.multipliedBy(scalingFactor.dividedBy(new BigNumber(10).pow(18)))
}

export const getStaked = async (rupee, pool, account) => {
  return rupee.toBigN(await pool.methods.balanceOf(account).call())
}

export const getCurrentPrice = async (rupee) => {
  // FORBROCK: get current RUPEE price
  return rupee.toBigN(await rupee.contracts.rebaser.methods.getCurrentTWAP().call())
}

export const getTargetPrice = async (rupee) => {
  return rupee.toBigN(1).toFixed(2);
}

export const getCirculatingSupply = async (rupee) => {
  let now = await rupee.web3.eth.getBlock('latest');
  let scalingFactor = rupee.toBigN(await rupee.contracts.rupee.methods.rupeesScalingFactor().call());
  let starttime = rupee.toBigN(await rupee.contracts.eth_pool.methods.starttime().call()).toNumber();
  let timePassed = now["timestamp"] - starttime;
  if (timePassed < 0) {
    return 0;
  }
  let rupeesDistributed = rupee.toBigN(8 * timePassed * 250000 / 172800); //rupees from first 8 pools
  let starttimePool2 = rupee.toBigN(await rupee.contracts.ycrvUNIV_pool.methods.starttime().call()).toNumber();
  timePassed = now["timestamp"] - starttime;
  let pool2Yams = rupee.toBigN(timePassed * 1500000 / 172800); // rupees from second pool. note: just accounts for first week
  let circulating = pool2Yams.plus(rupeesDistributed).times(scalingFactor).div(10**36).toFixed(2)
  return circulating
}

export const getNextRebaseTimestamp = async (yam) => {
  try {
    let now = await yam.web3.eth.getBlock('latest').then(res => res.timestamp);
    let interval = 43200; // 12 hours
    let offset = 28800; // 8am/8pm utc
    let secondsToRebase = 0;
    if (await yam.contracts.rebaser.methods.rebasingActive().call()) {
      if (now % interval > offset) {
          secondsToRebase = (interval - (now % interval)) + offset;
       } else {
          secondsToRebase = offset - (now % interval);
      }
    } else {
      let twap_init = yam.toBigN(await yam.contracts.rebaser.methods.timeOfTWAPInit().call()).toNumber();
      if (twap_init > 0) {
        let delay = yam.toBigN(await yam.contracts.rebaser.methods.rebaseDelay().call()).toNumber();
        let endTime = twap_init + delay;
        if (endTime % interval > offset) {
            secondsToRebase = (interval - (endTime % interval)) + offset;
         } else {
            secondsToRebase = offset - (endTime % interval);
        }
        return endTime + secondsToRebase;
      } else {
        return now + 13*60*60; // just know that its greater than 12 hours away
      }
    }
    return secondsToRebase
  } catch (e) {
    console.log(e)
  }
}

export const getTotalSupply = async (rupee) => {
  return await rupee.contracts.rupee.methods.totalSupply().call();
}

export const getStats = async (rupee) => {
  const curPrice = await getCurrentPrice(rupee)
  const circSupply = await getCirculatingSupply(rupee)
  const nextRebase = await getNextRebaseTimestamp(rupee)
  const targetPrice = await getTargetPrice(rupee)
  const totalSupply = await getTotalSupply(rupee)
  return {
    circSupply,
    curPrice,
    nextRebase,
    targetPrice,
    totalSupply
  }
}
