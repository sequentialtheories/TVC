import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setActiveModal } from '../../store/slices/uiSlice'
import { useSubClub } from '../../hooks/useSubClub'
import { formatCurrency, formatAddress, formatLockPeriod } from '../../utils/formatters'
import { RIGOR_LEVELS } from '../../utils/constants'
import { Users, Plus, Clock, Shield, Share2 } from 'lucide-react'

const GroupInfoPage = () => {
  const dispatch = useDispatch()
  const { walletAddress } = useSelector(state => state.auth)
  const { userSubClubs } = useSelector(state => state.subclub)
  const { getUserSubClubs, loading } = useSubClub()
  const [subClubs, setSubClubs] = useState([])

  useEffect(() => {
    const fetchSubClubs = async () => {
      if (walletAddress) {
        const clubs = await getUserSubClubs()
        setSubClubs(clubs)
      }
    }
    fetchSubClubs()
  }, [walletAddress, getUserSubClubs])

  const handleCreateClub = () => {
    dispatch(setActiveModal('createClub'))
  }

  const handleShareClub = (clubAddress) => {
    const shareUrl = `${window.location.origin}/join/${clubAddress}`
    navigator.clipboard.writeText(shareUrl)
    alert('Club link copied to clipboard!')
  }

  if (!walletAddress) {
    return (
      <div className="p-6 pb-24">
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Connect Wallet
          </h2>
          <p className="text-gray-600">
            Connect your wallet to view and manage SubClubs
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 pb-24 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          SubClub Management
        </h1>
        <p className="text-gray-600">
          Create and manage group investment contracts
        </p>
      </div>

      {/* Create New SubClub */}
      <div className="card">
        <div className="text-center">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Plus className="w-8 h-8 text-indigo-600" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Create New SubClub</h2>
          <p className="text-gray-600 mb-6">
            Start a group investment contract with friends or colleagues
          </p>
          <button
            onClick={handleCreateClub}
            className="btn-primary"
          >
            Create SubClub
          </button>
        </div>
      </div>

      {/* Your SubClubs */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Your SubClubs</h2>
        
        {loading ? (
          <div className="card text-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading SubClubs...</p>
          </div>
        ) : subClubs.length === 0 ? (
          <div className="card text-center py-8">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="font-semibold text-gray-800 mb-2">No SubClubs Yet</h3>
            <p className="text-gray-600">
              Create your first SubClub to start group investing
            </p>
          </div>
        ) : (
          subClubs.map((club, index) => (
            <div key={index} className="card">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg">
                    SubClub #{index + 1}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {formatAddress(club.address)}
                  </p>
                </div>
                <button
                  onClick={() => handleShareClub(club.address)}
                  className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                >
                  <Share2 className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-sm text-gray-500">Total Value</div>
                  <div className="font-semibold text-lg">
                    {formatCurrency(club.totalValue)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Members</div>
                  <div className="font-semibold text-lg">
                    {club.members?.length || 0}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Rigor Level</span>
                  <span className="text-sm font-medium">
                    {RIGOR_LEVELS[club.rigor] || 'Unknown'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Lock Period</span>
                  <span className="text-sm font-medium">
                    {formatLockPeriod(club.lockPeriod)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Contract Type</span>
                  <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                    club.isCharged 
                      ? 'bg-orange-100 text-orange-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {club.isCharged ? 'Charged' : 'Traditional'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Phase</span>
                  <span className="text-sm font-medium">
                    Phase {club.currentPhase}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Status</span>
                  <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                    club.isCompleted 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {club.isCompleted ? 'Completed' : 'Active'}
                  </span>
                </div>
              </div>

              {/* Member List */}
              <div className="mt-4 pt-4 border-t">
                <div className="text-sm text-gray-600 mb-2">Members</div>
                <div className="space-y-2">
                  {club.members?.slice(0, 3).map((member, memberIndex) => (
                    <div key={memberIndex} className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium">
                          {memberIndex + 1}
                        </span>
                      </div>
                      <span className="text-sm">
                        {formatAddress(member)}
                      </span>
                      {member === walletAddress && (
                        <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full">
                          You
                        </span>
                      )}
                    </div>
                  ))}
                  {club.members?.length > 3 && (
                    <div className="text-sm text-gray-500">
                      +{club.members.length - 3} more members
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Join SubClub */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Join Existing SubClub</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              SubClub Address
            </label>
            <input
              type="text"
              placeholder="0x..."
              className="input-field"
            />
          </div>
          <button className="btn-secondary w-full">
            Join SubClub
          </button>
        </div>
      </div>
    </div>
  )
}

export default GroupInfoPage
