import { motion } from 'framer-motion'
import GameCard from '@components/GameCard'
import { Game } from '../types/game'

// 游戏列表数据
const games: Game[] = [
  {
    id: 'gomoku',
    title: '五子棋',
    description: '经典双人对战游戏',
    image: '♟️',
    path: '/games/gomoku',
    tags: ['双人', '策略', 'PVP'],
    difficulty: '简单',
    players: '2人',
    time: '10-20分钟',
    status: 'available',
  },
  {
    id: 'tetris',
    title: '俄罗斯方块',
    description: '经典方块消除游戏',
    image: '🎮',
    path: '/games/tetris',
    tags: ['单人', '休闲', '经典'],
    difficulty: '中等',
    players: '1人',
    time: '无限',
    status: 'coming-soon',
  },
  {
    id: 'snake',
    title: '贪吃蛇',
    description: '经典贪吃蛇游戏',
    image: '🐍',
    path: '/games/snake',
    tags: ['单人', '休闲', '经典'],
    difficulty: '简单',
    players: '1人',
    time: '5-10分钟',
    status: 'coming-soon',
  },
  {
    id: '2048',
    title: '2048',
    description: '数字合并益智游戏',
    image: '🔢',
    path: '/games/2048',
    tags: ['单人', '益智', '策略'],
    difficulty: '中等',
    players: '1人',
    time: '10-30分钟',
    status: 'coming-soon',
  },
]

/**
 * 首页组件 - 展示游戏列表和平台特色
 * 优化了移动端响应式布局和触摸交互
 */
const HomePage = () => {
  return (
    <div className="space-y-8 sm:space-y-12">
      {/* Hero Section - 优化移动端标题和描述 */}
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center space-y-4 sm:space-y-6"
      >
        <h1 className="text-3xl sm:text-5xl md:text-7xl font-game font-bold">
          <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 bg-clip-text text-transparent">
            游戏合集
          </span>
        </h1>
        <p className="text-base sm:text-xl text-gray-400 font-game px-4">
          精选经典小游戏，随时随地享受游戏乐趣
        </p>
        
        {/* 统计信息 - 优化移动端布局 */}
        <div className="flex justify-center gap-3 sm:gap-8 mt-6 sm:mt-8 px-4">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-gray-800/50 backdrop-blur px-3 sm:px-6 py-3 sm:py-4 rounded-lg border border-gray-700 flex-1 max-w-[100px] sm:max-w-none"
          >
            <div className="text-xl sm:text-3xl font-bold text-purple-400">
              {games.filter(g => g.status === 'available').length}
            </div>
            <div className="text-xs sm:text-sm text-gray-400">可玩游戏</div>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-gray-800/50 backdrop-blur px-3 sm:px-6 py-3 sm:py-4 rounded-lg border border-gray-700 flex-1 max-w-[100px] sm:max-w-none"
          >
            <div className="text-xl sm:text-3xl font-bold text-pink-400">
              {games.filter(g => g.status === 'coming-soon').length}
            </div>
            <div className="text-xs sm:text-sm text-gray-400">即将推出</div>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-gray-800/50 backdrop-blur px-3 sm:px-6 py-3 sm:py-4 rounded-lg border border-gray-700 flex-1 max-w-[100px] sm:max-w-none"
          >
            <div className="text-xl sm:text-3xl font-bold text-blue-400">24/7</div>
            <div className="text-xs sm:text-sm text-gray-400">在线服务</div>
          </motion.div>
        </div>
      </motion.div>

      {/* 分类标签 - 优化移动端显示 */}
      <div className="flex flex-wrap justify-center gap-2 sm:gap-3 px-4">
        {['全部', '双人', '单人', '策略', '休闲', '益智'].map((tag, index) => (
          <motion.button
            key={tag}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all
              ${tag === '全部' 
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white border border-gray-700'
              }`}
          >
            {tag}
          </motion.button>
        ))}
      </div>

      {/* 游戏网格 - 优化移动端布局 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6"
      >
        {games.map((game, index) => (
          <motion.div
            key={game.id}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <GameCard game={game} />
          </motion.div>
        ))}
      </motion.div>

      {/* 特色介绍 - 优化移动端布局 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-12 sm:mt-16 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6"
      >
        <div className="text-center space-y-3 p-4 sm:p-6 bg-gray-800/30 backdrop-blur rounded-lg border border-gray-700">
          <div className="text-3xl sm:text-4xl">🎮</div>
          <h3 className="text-base sm:text-lg font-game font-semibold text-purple-400">精选游戏</h3>
          <p className="text-xs sm:text-sm text-gray-400">
            精心挑选的经典游戏，保证游戏质量和趣味性
          </p>
        </div>
        <div className="text-center space-y-3 p-4 sm:p-6 bg-gray-800/30 backdrop-blur rounded-lg border border-gray-700">
          <div className="text-3xl sm:text-4xl">🌐</div>
          <h3 className="text-base sm:text-lg font-game font-semibold text-pink-400">在线对战</h3>
          <p className="text-xs sm:text-sm text-gray-400">
            支持实时在线对战，与好友一起享受游戏乐趣
          </p>
        </div>
        <div className="text-center space-y-3 p-4 sm:p-6 bg-gray-800/30 backdrop-blur rounded-lg border border-gray-700">
          <div className="text-3xl sm:text-4xl">📱</div>
          <h3 className="text-base sm:text-lg font-game font-semibold text-blue-400">跨平台</h3>
          <p className="text-xs sm:text-sm text-gray-400">
            完美适配手机和电脑，随时随地开始游戏
          </p>
        </div>
      </motion.div>
    </div>
  )
}

export default HomePage