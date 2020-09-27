import { useCallback, useEffect, useState } from 'react'

import BigNumber from 'bignumber.js'
import { useWallet } from 'use-wallet'
import { Contract } from "web3-eth-contract"

import { getStaked } from '../rupeeUtils'
import useRupee from './useRupee'

const useStakedBalance = (pool: Contract) => {
  const [balance, setBalance] = useState(new BigNumber(0))
  const { account }: { account: string } = useWallet()
  const rupee = useRupee()

  const fetchBalance = useCallback(async () => {
    const balance = await getStaked(rupee, pool, account)
    setBalance(new BigNumber(balance))
  }, [account, pool, rupee])

  useEffect(() => {
    if (account && pool && rupee) {
      fetchBalance()
    }
  }, [account, pool, setBalance, rupee])

  return balance
}

export default useStakedBalance