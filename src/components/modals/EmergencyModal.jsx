import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setActiveModal } from '../../store/slices/uiSlice'
import { useSubClub } from '../../hooks/useSubClub'
import { X } from 'lucide-react'

const EmergencyModal = ({ onClose }) => {
  const dispatch = useDispatch()
  const { walletAddress } = useSelector(state => state.auth)
  const { userSubClubs } = useSelector(state => state.subclub)
  const { requestEmergencyWithdraw, loading } = useSubClub()

  const handleEmergencyWithdraw = async () => {
    try {
      const userSubClub = userSubClubs.find(club => 
        club.creator === walletAddress || 
        (club.members && club.members.includes(walletAddress))
      )
      
      if (!userSubClub) {
        alert('No SubClub found for emergency withdrawal')
        return
      }
      
      await requestEmergencyWithdraw(userSubClub.address)
      dispatch(setActiveModal(null))
    } catch (error) {
      console.error('Emergency withdrawal failed:', error)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-red-600">🚨 Emergency Procedures</h2>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-gray-500" />
            </button>
          </div>
          
          <div className="space-y-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-red-800 mb-2">⚠️ Emergency Withdrawal</h3>
              <p className="text-red-700 text-sm mb-4">
                Emergency withdrawals require multisig approval and incur a 10% penalty. 
                This action should only be used in critical situations.
              </p>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-red-700">Multisig Votes Required:</span>
                  <span className="font-medium">0/3</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-red-700">Penalty Applied:</span>
                  <span className="font-medium">10%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-red-700">Processing Time:</span>
                  <span className="font-medium">24-48 hours</span>
                </div>
              </div>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-800 mb-2">📞 Emergency Contacts</h3>
              <div className="space-y-2 text-sm text-yellow-700">
                <div>Technical Support: support@vaultclub.com</div>
                <div>Emergency Hotline: +1-800-VAULT-911</div>
                <div>Multisig Signers: Available 24/7</div>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button 
                onClick={handleEmergencyWithdraw}
                disabled={loading}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Request Emergency Withdrawal'}
              </button>
              <button 
                onClick={onClose}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-3 px-4 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EmergencyModal
