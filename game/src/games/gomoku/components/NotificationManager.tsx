import { motion, AnimatePresence } from 'framer-motion'
import { useGomokuStore } from '../store/gameStore'
import clsx from 'clsx'

const NotificationManager = () => {
  const { notifications, removeNotification } = useGomokuStore()
  
  return (
    <div className="fixed top-20 right-4 z-50 space-y-2 pointer-events-none">
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 100, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.8 }}
            transition={{ duration: 0.3 }}
            className={clsx(
              'pixel-container p-3 min-w-[200px] max-w-[300px] pointer-events-auto cursor-pointer',
              'backdrop-blur-sm shadow-lg',
              {
                'bg-blue-600/90 border-blue-400': notification.type === 'info',
                'bg-green-600/90 border-green-400': notification.type === 'success',
                'bg-yellow-600/90 border-yellow-400': notification.type === 'warning',
                'bg-red-600/90 border-red-400': notification.type === 'error'
              }
            )}
            onClick={() => removeNotification(notification.id)}
          >
            <div className="flex items-start gap-2">
              <div className="text-white">
                {notification.type === 'info' && '📢'}
                {notification.type === 'success' && '✅'}
                {notification.type === 'warning' && '⚠️'}
                {notification.type === 'error' && '❌'}
              </div>
              <p className="text-white text-sm font-game flex-1">
                {notification.message}
              </p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

export default NotificationManager