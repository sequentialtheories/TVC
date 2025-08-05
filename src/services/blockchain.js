import { web3Service } from '../utils/web3'
import { 
  VAULT_CONTRACT_ABI, 
  SUBCLUB_FACTORY_ABI, 
  SUBCLUB_ABI, 
  EMERGENCY_MODULE_ABI 
} from '../utils/constants'

class BlockchainService {
  constructor() {
    this.eventListeners = new Map()
  }

  async getVaultBalance(address) {
    try {
      const contract = web3Service.getContract('megaVault', VAULT_CONTRACT_ABI)
      const balance = await contract.balanceOf(address)
      return web3Service.formatUnits(balance, 6)
    } catch (error) {
      console.error('Error fetching vault balance:', error)
      return '0'
    }
  }

  async getVaultStats() {
    try {
      const contract = web3Service.getContract('megaVault', VAULT_CONTRACT_ABI)
      const vaultState = await contract.getVaultState()
      const totalMembers = await contract.getTotalMembers()
      
      return {
        totalMembers: totalMembers.toNumber(),
        totalDeposits: web3Service.formatUnits(vaultState.totalValue, 6),
        systemHealth: vaultState.isPaused ? 50 : 100,
        transactions: vaultState.harvestCount.toNumber(),
        currentPhase: vaultState.currentPhase,
        lastHarvestTime: vaultState.lastHarvestTime.toNumber(),
        isPaused: vaultState.isPaused
      }
    } catch (error) {
      console.error('Error fetching vault stats:', error)
      return { 
        totalMembers: 0, 
        totalDeposits: '0', 
        systemHealth: 100, 
        transactions: 0,
        currentPhase: 1,
        lastHarvestTime: 0,
        isPaused: false
      }
    }
  }

  async createSubClub(members, lockPeriod, rigor, isCharged) {
    try {
      const factory = web3Service.getContract('factory', SUBCLUB_FACTORY_ABI)
      const tx = await factory.createSubClub(members, lockPeriod, rigor, isCharged)
      const receipt = await tx.wait()
      
      const event = receipt.events?.find(e => e.event === 'SubClubCreated')
      return event?.args?.subClubAddress
    } catch (error) {
      console.error('Error creating SubClub:', error)
      throw error
    }
  }

  async getSubClubInfo(subClubAddress) {
    try {
      const contract = new web3Service.provider.Contract(subClubAddress, SUBCLUB_ABI, web3Service.signer)
      const contractInfo = await contract.getContractInfo()
      
      return {
        members: contractInfo.members,
        lockPeriod: contractInfo.lockPeriod.toNumber(),
        rigor: contractInfo.rigor,
        weeklyAmount: web3Service.formatUnits(contractInfo.weeklyAmount, 6),
        isCharged: contractInfo.isCharged,
        startTime: contractInfo.startTime.toNumber(),
        currentPhase: contractInfo.currentPhase,
        isCompleted: contractInfo.isCompleted,
        totalValue: web3Service.formatUnits(contractInfo.totalValue, 6)
      }
    } catch (error) {
      console.error('Error fetching SubClub info:', error)
      throw error
    }
  }

  async getMemberInfo(subClubAddress, memberAddress) {
    try {
      const contract = new web3Service.provider.Contract(subClubAddress, SUBCLUB_ABI, web3Service.signer)
      const memberInfo = await contract.getMemberInfo(memberAddress)
      
      return {
        totalDeposited: web3Service.formatUnits(memberInfo.totalDeposited, 6),
        sharePercentage: web3Service.formatUnits(memberInfo.sharePercentage, 2),
        missedDeposits: memberInfo.missedDeposits.toNumber(),
        lastDepositWeek: memberInfo.lastDepositWeek.toNumber(),
        isActive: memberInfo.isActive,
        joinedAt: memberInfo.joinedAt.toNumber()
      }
    } catch (error) {
      console.error('Error fetching member info:', error)
      throw error
    }
  }

  async makeDeposit(subClubAddress) {
    try {
      const contract = new web3Service.provider.Contract(subClubAddress, SUBCLUB_ABI, web3Service.signer)
      const tx = await contract.makeDeposit()
      return await tx.wait()
    } catch (error) {
      console.error('Error making deposit:', error)
      throw error
    }
  }

  async requestEmergencyWithdraw(subClubAddress) {
    try {
      const emergencyModule = web3Service.getContract('emergencyModule', EMERGENCY_MODULE_ABI)
      const tx = await emergencyModule.requestEmergencyWithdraw(subClubAddress)
      return await tx.wait()
    } catch (error) {
      console.error('Error requesting emergency withdrawal:', error)
      throw error
    }
  }

  async getEmergencyStatus(subClubAddress) {
    try {
      const emergencyModule = web3Service.getContract('emergencyModule', EMERGENCY_MODULE_ABI)
      const status = await emergencyModule.getEmergencyStatus(subClubAddress)
      
      return {
        isEmergency: status[0],
        requestTime: status[1].toNumber(),
        approvers: status[2]
      }
    } catch (error) {
      console.error('Error fetching emergency status:', error)
      return { isEmergency: false, requestTime: 0, approvers: [] }
    }
  }

  async getUserSubClubs(userAddress) {
    try {
      const factory = web3Service.getContract('factory', SUBCLUB_FACTORY_ABI)
      const subClubAddresses = await factory.getSubClubsForMember(userAddress)
      
      const subClubs = await Promise.all(
        subClubAddresses.map(async (address) => {
          const info = await this.getSubClubInfo(address)
          return { address, ...info }
        })
      )
      
      return subClubs
    } catch (error) {
      console.error('Error fetching user SubClubs:', error)
      return []
    }
  }

  setupEventListener(contractName, eventName, callback) {
    try {
      const contract = web3Service.getContract(contractName, this.getAbiForContract(contractName))
      const listener = contract.on(eventName, callback)
      
      const key = `${contractName}-${eventName}`
      this.eventListeners.set(key, listener)
      
      return () => {
        contract.off(eventName, callback)
        this.eventListeners.delete(key)
      }
    } catch (error) {
      console.error('Error setting up event listener:', error)
      return () => {}
    }
  }

  removeAllEventListeners() {
    this.eventListeners.forEach((listener, key) => {
      const [contractName, eventName] = key.split('-')
      const contract = web3Service.getContract(contractName, this.getAbiForContract(contractName))
      contract.removeAllListeners(eventName)
    })
    this.eventListeners.clear()
  }

  getAbiForContract(contractName) {
    switch (contractName) {
      case 'megaVault':
        return VAULT_CONTRACT_ABI
      case 'factory':
        return SUBCLUB_FACTORY_ABI
      case 'emergencyModule':
        return EMERGENCY_MODULE_ABI
      default:
        return SUBCLUB_ABI
    }
  }
}

export const blockchainService = new BlockchainService()
