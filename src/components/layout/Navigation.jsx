import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setCurrentPage } from '../../store/slices/uiSlice'
import { 
  Home, 
  Database, 
  User, 
  Users, 
  MessageSquare, 
  TrendingUp 
} from 'lucide-react'

const Navigation = () => {
  const dispatch = useDispatch()
  const { currentPage } = useSelector(state => state.ui)

  const navItems = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'dataset', icon: Database, label: 'Data' },
    { id: 'personal', icon: User, label: 'Personal' },
    { id: 'group', icon: Users, label: 'Group' },
    { id: 'forum', icon: MessageSquare, label: 'Forum' },
    { id: 'simulation', icon: TrendingUp, label: 'Future' }
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
      <div className="flex justify-around items-center py-2 px-4 max-w-md mx-auto">
        {navItems.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => dispatch(setCurrentPage(id))}
            className="flex flex-col items-center space-y-1 p-2 rounded-lg transition-all duration-200"
          >
            <div className={`p-2 rounded-full transition-all duration-200 ${
              currentPage === id 
                ? 'bg-indigo-600 text-white shadow-lg' 
                : 'text-slate-600'
            }`}>
              <Icon className="w-5 h-5" />
            </div>
            <span className={`text-xs font-medium ${
              currentPage === id 
                ? 'text-indigo-600' 
                : 'text-slate-500'
            }`}>
              {label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  )
}

export default Navigation
