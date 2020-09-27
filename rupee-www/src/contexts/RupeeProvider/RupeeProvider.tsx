import React, { createContext, useEffect, useState } from 'react'

import { useWallet } from 'use-wallet'

import { Rupee } from '../../rupee'

export interface RupeeContext {
  rupee?: typeof Rupee
}

export const Context = createContext<RupeeContext>({
  rupee: undefined,
})

declare global {
  interface Window {
    rupeesauce: any
  }
}

const RupeeProvider: React.FC = ({ children }) => {
  const { ethereum } = useWallet()
  const [rupee, setRupee] = useState<any>()

  useEffect(() => {
    if (ethereum) {
      const rupeeLib = new Rupee(
        ethereum,
        "42",
        false, {
          defaultAccount: "",
          defaultConfirmations: 1,
          autoGasMultiplier: 1.5,
          testing: false,
          defaultGas: "6000000",
          defaultGasPrice: "1000000000000",
          accounts: [],
          ethereumNodeTimeout: 10000
        }
      )
      setRupee(rupeeLib)
      window.rupeesauce = rupeeLib
    }
  }, [ethereum])

  return (
    <Context.Provider value={{ rupee }}>
      {children}
    </Context.Provider>
  )
}

export default RupeeProvider
