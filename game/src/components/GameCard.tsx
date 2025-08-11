import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import clsx from 'clsx'
import { Game } from '../types/game'

interface GameCardProps {
  game: Game
}

const GameCard = ({ game }: GameCardProps) => {
  const isAvailable = game.status === 'available'
  const isComingSoon = game.status === 'coming-soon'
  const isMaintenance = game.status === 'maintenance'

  const cardContent = (
    <motion.div
      whileHover={isAvailable ? { scale: 1.02 } : {}}
      whileTap={isAvailable ? { scale: 0.98 } : {}}
      className={clsx(
        'relative h-full bg-gray-800 rounded-xl border-2 overflow-hidden transition-all duration-300',
        {
          'border-gray-700 hover:border-purple-500 cursor-pointer shadow-lg hover:shadow-purple-500/20': isAvailable,
          'border-gray-700 opacity-75 cursor-not-allowed': isComingSoon,
          'border-orange-600 opacity-75 cursor-not-allowed': isMaintenance,
        }
      )}
    >
      {/* 状态标签 */}
      {(isComingSoon || isMaintenance) && (
        <div className="absolute top-2 right-2 z-10">
          <span className={clsx(
            'px-2 py-1 text-xs sm:px-3 sm:text-xs font-pixel rounded-full',
            {
              'bg-blue-600 text-white': isComingSoon,
              'bg-orange-600 text-white': isMaintenance,
            }
          )}>
            {isComingSoon ? '即将推出' : '维护中'}
          </span>
        </div>
      )}

      {/* 游戏图标 */}
      <div className="h-24 sm:h-32 bg-gradient-to-br from-purple-900/50 to-pink-900/50 flex items-center justify-center">
        <span className="text-4xl sm:text-6xl">{game.image}</span>
      </div>

      {/* 游戏信息 */}
      <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
        <h3 className="text-lg sm:text-xl font-game font-bold text-white">
          {game.title}
        </h3>
        <p className="text-xs sm:text-sm text-gray-400 line-clamp-2">
          {game.description}
        </p>

        {/* 标签 */}
        <div className="flex flex-wrap gap-1 sm:gap-2">
          {game.tags.map(tag => (
            <span
              key={tag}
              className="px-1.5 py-0.5 sm:px-2 sm:py-1 text-xs bg-gray-700 text-gray-300 rounded-md"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* 游戏详情 */}
        <div className="pt-2 sm:pt-3 border-t border-gray-700 grid grid-cols-3 gap-1 sm:gap-2 text-xs text-gray-500">
          <div className="text-center sm:text-left">
            <div className="font-semibold text-gray-400 text-xs">难度</div>
            <div className={clsx('text-xs', {
              'text-green-400': game.difficulty === '简单',
              'text-yellow-400': game.difficulty === '中等',
              'text-red-400': game.difficulty === '困难',
            })}>
              {game.difficulty}
            </div>
          </div>
          <div className="text-center sm:text-left">
            <div className="font-semibold text-gray-400 text-xs">玩家</div>
            <div className="text-xs">{game.players}</div>
          </div>
          <div className="text-center sm:text-left">
            <div className="font-semibold text-gray-400 text-xs">时长</div>
            <div className="text-xs">{game.time}</div>
          </div>
        </div>

        {/* 开始按钮 */}
        {isAvailable && (
          <button className="w-full mt-3 sm:mt-4 px-3 py-2 sm:px-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-game text-xs sm:text-sm rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all active:scale-95">
            开始游戏
          </button>
        )}
      </div>
    </motion.div>
  )

  if (isAvailable) {
    return <Link to={game.path}>{cardContent}</Link>
  }

  return cardContent
}

export default GameCard