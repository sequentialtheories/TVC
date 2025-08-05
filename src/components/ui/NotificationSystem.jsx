import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { removeNotification } from '../../store/slices/uiSlice'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'

const NotificationSystem = () => {
  const dispatch = useDispatch()
  const { notifications } = useSelector(state => state.ui)

  useEffect(() => {
    notifications.forEach(notification => {
      if (notification.duration) {
        const timer = setTimeout(() => {
          dispatch(removeNotification(notification.id))
        }, notification.duration)

        return () => clearTimeout(timer)
      }
    })
  }, [notifications, dispatch])

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return CheckCircle
      case 'error':
        return AlertCircle
      case 'warning':
        return AlertTriangle
      case 'info':
      default:
        return Info
    }
  }

  const getNotificationStyles = (type) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800'
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800'
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800'
    }
  }

  if (notifications.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map((notification) => {
        const Icon = getNotificationIcon(notification.type)
        const styles = getNotificationStyles(notification.type)

        return (
          <div
            key={notification.id}
            className={`p-4 rounded-lg border shadow-lg transition-all duration-300 ${styles}`}
          >
            <div className="flex items-start space-x-3">
              <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                {notification.title && (
                  <h4 className="font-semibold mb-1">{notification.title}</h4>
                )}
                <p className="text-sm">{notification.message}</p>
              </div>
              <button
                onClick={() => dispatch(removeNotification(notification.id))}
                className="p-1 hover:bg-black/10 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default NotificationSystem
