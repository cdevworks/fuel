import { Rupee } from '../../rupee'

import {
  getCurrentPrice as gCP,
  getTargetPrice as gTP,
  getCirculatingSupply as gCS,
  getNextRebaseTimestamp as gNRT,
  getTotalSupply as gTS,
} from '../../rupeeUtils'

const getCurrentPrice = async (rupee: typeof Rupee): Promise<number> => {
  // FORBROCK: get current RUPEE price
  return gCP(rupee)
}

const getTargetPrice = async (rupee: typeof Rupee): Promise<number> => {
  // FORBROCK: get target RUPEE price
  return gTP(rupee)
}

const getCirculatingSupply = async (rupee: typeof Rupee): Promise<string> => {
  // FORBROCK: get circulating supply
  return gCS(rupee)
}

const getNextRebaseTimestamp = async (rupee: typeof Rupee): Promise<number> => {
  // FORBROCK: get next rebase timestamp
  const nextRebase = await gNRT(rupee) as number
  return nextRebase * 1000
}

const getTotalSupply = async (rupee: typeof Rupee): Promise<string> => {
  // FORBROCK: get total supply
  return gTS(rupee)
}

export const getStats = async (rupee: typeof Rupee) => {
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
