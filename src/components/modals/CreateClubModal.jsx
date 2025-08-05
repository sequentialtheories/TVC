import React, { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setActiveModal } from '../../store/slices/uiSlice'
import { useSubClub } from '../../hooks/useSubClub'
import { RIGOR_LEVELS } from '../../utils/constants'
import { X, Users, Clock, DollarSign } from 'lucide-react'

const CreateClubModal = ({ onClose }) => {
  const dispatch = useDispatch()
  const { walletAddress } = useSelector(state => state.auth)
  const { createSubClub, loading } = useSubClub()
  
  const [formData, setFormData] = useState({
    members: [walletAddress],
    lockPeriod: 365,
    rigor: 1,
    isCharged: false,
    memberInput: ''
  })

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const addMember = () => {
    const address = formData.memberInput.trim()
    if (address && !formData.members.includes(address)) {
      setFormData(prev => ({
        ...prev,
        members: [...prev.members, address],
        memberInput: ''
      }))
    }
  }

  const removeMember = (address) => {
    if (address !== walletAddress) {
      setFormData(prev => ({
        ...prev,
        members: prev.members.filter(member => member !== address)
      }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      const lockPeriodSeconds = formData.lockPeriod * 24 * 60 * 60
      await createSubClub(
        formData.members,
        lockPeriodSeconds,
        formData.rigor,
        formData.isCharged
      )
      
      dispatch(setActiveModal(null))
    } catch (error) {
      console.error('Failed to create SubClub:', error)
    }
  }

  const rigorOptions = [
    { value: 0, label: 'Light Rigor', description: '$100-250/month' },
    { value: 1, label: 'Medium Rigor', description: '$50-250/week' },
    { value: 2, label: 'Heavy Rigor', description: '$100-400/week' },
    { value: 3, label: 'Custom Rigor', description: 'User-defined schedule' }
  ]

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Create SubClub</h2>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-gray-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Contract Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Contract Type
              </label>
              <div className="space-y-3">
                <div
                  onClick={() => handleInputChange('isCharged', false)}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    !formData.isCharged
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Traditional Contract</div>
                      <div className="text-sm text-gray-600">1-20 years, $1.00/user/week</div>
                    </div>
                    <div className="w-4 h-4 border-2 border-indigo-500 rounded-full flex items-center justify-center">
                      {!formData.isCharged && <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>}
                    </div>
                  </div>
                </div>
                
                <div
                  onClick={() => handleInputChange('isCharged', true)}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    formData.isCharged
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Charged Contract</div>
                      <div className="text-sm text-gray-600">1-12 months, $1.25/user/week</div>
                    </div>
                    <div className="w-4 h-4 border-2 border-indigo-500 rounded-full flex items-center justify-center">
                      {formData.isCharged && <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Lock Period */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lock Period (days)
              </label>
              <input
                type="number"
                min={formData.isCharged ? 30 : 365}
                max={formData.isCharged ? 365 : 7300}
                value={formData.lockPeriod}
                onChange={(e) => handleInputChange('lockPeriod', parseInt(e.target.value))}
                className="input-field"
                required
              />
              <div className="text-sm text-gray-500 mt-1">
                {formData.isCharged 
                  ? 'Charged contracts: 30-365 days' 
                  : 'Traditional contracts: 365-7300 days (1-20 years)'
                }
              </div>
            </div>

            {/* Rigor Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Rigor Level
              </label>
              <div className="space-y-2">
                {rigorOptions.map((option) => (
                  <div
                    key={option.value}
                    onClick={() => handleInputChange('rigor', option.value)}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      formData.rigor === option.value
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-sm text-gray-600">{option.description}</div>
                      </div>
                      <div className="w-4 h-4 border-2 border-indigo-500 rounded-full flex items-center justify-center">
                        {formData.rigor === option.value && <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Members */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Members ({formData.members.length}/8)
              </label>
              
              <div className="space-y-3">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={formData.memberInput}
                    onChange={(e) => handleInputChange('memberInput', e.target.value)}
                    placeholder="0x... wallet address"
                    className="flex-1 input-field"
                  />
                  <button
                    type="button"
                    onClick={addMember}
                    disabled={!formData.memberInput.trim() || formData.members.length >= 8}
                    className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                </div>
                
                <div className="space-y-2">
                  {formData.members.map((member, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Users className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-mono">
                          {member.slice(0, 6)}...{member.slice(-4)}
                        </span>
                        {member === walletAddress && (
                          <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full">
                            You
                          </span>
                        )}
                      </div>
                      {member !== walletAddress && (
                        <button
                          type="button"
                          onClick={() => removeMember(member)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || formData.members.length === 0}
                className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create SubClub'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default CreateClubModal
