import { motion } from 'framer-motion'
import clsx from 'clsx'

interface PlayerAvatarProps {
  color: 1 | 2 | null
  size?: 'small' | 'medium' | 'large'
  isActive?: boolean
  className?: string
}

const PlayerAvatar = ({ color, size = 'medium', isActive = false, className = '' }: PlayerAvatarProps) => {
  const sizeClasses = {
    small: 'w-8 h-8 text-xs',
    medium: 'w-10 h-10 text-sm',
    large: 'w-12 h-12 text-base'
  }
  
  const getAvatarEmoji = (color: 1 | 2 | null) => {
    if (color === 1) return '🐼' // 黑棋 - 熊猫
    if (color === 2) return '🦊' // 白棋 - 狐狸
    return '👤' // 未分配
  }
  
  const getAvatarStyle = (color: 1 | 2 | null) => {
    if (color === 1) {
      return 'bg-gradient-to-br from-gray-800 to-black text-white'
    }
    if (color === 2) {
      return 'bg-gradient-to-br from-white to-gray-200 text-gray-800 border-2 border-gray-400'
    }
    return 'bg-gray-600 text-gray-400'
  }
  
  return (
    <motion.div
      className={clsx(
        sizeClasses[size],
        getAvatarStyle(color),
        'rounded-full flex items-center justify-center shadow-lg font-bold relative',
        className
      )}
      animate={isActive ? { scale: [1, 1.1, 1] } : {}}
      transition={isActive ? { repeat: Infinity, duration: 2 } : {}}
    >
      <span className="text-lg">{getAvatarEmoji(color)}</span>
      
      {/* 活跃状态指示器 */}
      {isActive && (
        <motion.div
          className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-gray-900"
          animate={{ scale: [0.8, 1.2, 0.8] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        />
      )}
      
      {/* 棋子颜色指示 */}
      <div className={clsx(
        'absolute -top-1 -right-1 w-4 h-4 rounded-full shadow-md',
        color === 1 ? 'bg-gradient-to-br from-gray-700 to-black' :
        color === 2 ? 'bg-gradient-to-br from-white to-gray-300 border border-gray-400' :
        'hidden'
      )} />
    </motion.div>
  )
}

export default PlayerAvatar