import { ethers } from 'ethers'
import { CONTRACT_ADDRESSES, NETWORK_CONFIG } from './constants'

export class Web3Service {
  constructor() {
    this.provider = null
    this.signer = null
    this.contracts = {}
  }

  async initialize() {
    if (!window.ethereum) {
      throw new Error('MetaMask is required to use this app')
    }

    this.provider = new ethers.providers.Web3Provider(window.ethereum)
    await this.switchToAmoyNetwork()
    return this.provider
  }

  async switchToAmoyNetwork() {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: NETWORK_CONFIG.amoy.chainId }]
      })
    } catch (switchError) {
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [NETWORK_CONFIG.amoy]
        })
      } else {
        throw switchError
      }
    }
  }

  async connectWallet() {
    if (!this.provider) {
      await this.initialize()
    }

    const accounts = await window.ethereum.request({ 
      method: 'eth_requestAccounts' 
    })
    
    this.signer = this.provider.getSigner()
    return accounts[0]
  }

  getContract(contractName, abi) {
    const address = CONTRACT_ADDRESSES.amoy[contractName]
    if (!address) {
      throw new Error(`Contract ${contractName} not found`)
    }

    if (!this.contracts[contractName]) {
      this.contracts[contractName] = new ethers.Contract(
        address,
        abi,
        this.signer || this.provider
      )
    }

    return this.contracts[contractName]
  }

  async getBalance(address) {
    if (!this.provider) {
      await this.initialize()
    }
    
    const balance = await this.provider.getBalance(address)
    return ethers.utils.formatEther(balance)
  }

  formatUnits(value, decimals = 18) {
    return ethers.utils.formatUnits(value, decimals)
  }

  parseUnits(value, decimals = 18) {
    return ethers.utils.parseUnits(value.toString(), decimals)
  }

  isAddress(address) {
    return ethers.utils.isAddress(address)
  }
}

export const web3Service = new Web3Service()
