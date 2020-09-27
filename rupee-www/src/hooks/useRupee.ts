import { useContext } from 'react'
import { Context } from '../contexts/RupeeProvider'

const useRupee = () => {
  const { rupee } = useContext(Context)
  return rupee
}

export default useRupee