import { motion } from 'framer-motion'
import { useGomokuStore } from '../store/gameStore'

/**
 * 游戏状态组件
 * 显示当前玩家、游戏状态和比分信息
 */
const GameStatus = () => {
  const { 
    currentPlayer, 
    gameState, 
    myColor, 
    score,
    roundNumber,
    winner
  } = useGomokuStore()
  
  return (
    <>
      {/* 移动端布局 - 顶部横向显示 */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between mb-2 px-2">
          {/* 比分显示 */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <div className="w-6 h-6 bg-gradient-to-br from-gray-800 to-black rounded-full shadow-lg"></div>
              <span className="font-game text-lg text-white">{score.black}</span>
            </div>
            <div className="text-gray-500">:</div>
            <div className="flex items-center gap-1">
              <span className="font-game text-lg text-white">{score.white}</span>
              <div className="w-6 h-6 bg-gradient-to-br from-white to-gray-200 rounded-full border border-gray-400 shadow-lg"></div>
            </div>
          </div>
          
          {/* 游戏状态 */}
          <div className="flex flex-col items-center">
            <div className="text-xs text-gray-400 font-pixel">第 {roundNumber} 回合</div>
            <div className="text-xs">
              {gameState === 'waiting' && (
                <span className="text-yellow-400 font-pixel animate-pulse">等待对手...</span>
              )}
              {gameState === 'playing' && currentPlayer === myColor && (
                <span className="text-green-400 font-pixel animate-pulse">你的回合</span>
              )}
              {gameState === 'playing' && currentPlayer !== myColor && (
                <span className="text-blue-400 font-pixel">对手思考中...</span>
              )}
              {gameState === 'finished' && (
                <span className={winner === myColor ? 'text-yellow-400' : 'text-gray-400'}>
                  {winner === myColor ? '🎉 你赢了！' : '💪 再接再厉'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 桌面端布局 - 精致卡片样式 */}
      <div className="hidden sm:block">
        <div className="flex items-center justify-between mb-2 px-4">
          {/* 比分显示 */}
          <div className="flex items-center gap-4">
            <motion.div 
              className="flex items-center gap-2"
              whileHover={{ scale: 1.05 }}
            >
              <div className="w-7 h-7 bg-gradient-to-br from-gray-800 to-black rounded-full shadow-xl"></div>
              <span className="font-game text-xl text-white drop-shadow-lg">{score.black}</span>
            </motion.div>
            <div className="text-gray-500 text-xl">:</div>
            <motion.div 
              className="flex items-center gap-2"
              whileHover={{ scale: 1.05 }}
            >
              <span className="font-game text-xl text-white drop-shadow-lg">{score.white}</span>
              <div className="w-7 h-7 bg-gradient-to-br from-white to-gray-200 rounded-full border-2 border-gray-400 shadow-xl"></div>
            </motion.div>
          </div>
          
          {/* 回合数 */}
          <div className="text-gray-400 font-game bg-gray-800/50 px-3 py-1 rounded-lg text-sm">
            第 {roundNumber} 回合
          </div>
        </div>
        
        {/* 当前状态 */}
        <motion.div 
          className="pixel-container bg-gradient-to-r from-gray-800/50 to-gray-900/50 p-3"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between">
            {/* 当前玩家 */}
            <div className="flex items-center gap-3">
              <span className="text-gray-400 text-sm">当前玩家:</span>
              <motion.div 
                className="flex items-center gap-2"
                animate={currentPlayer === myColor ? { scale: [1, 1.1, 1] } : {}}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                {currentPlayer === 1 ? (
                  <div className="w-8 h-8 bg-gradient-to-br from-gray-800 to-black rounded-full shadow-xl flex items-center justify-center">
                    <div className="w-6 h-6 bg-gradient-to-br from-gray-700 to-black rounded-full"></div>
                  </div>
                ) : (
                  <div className="w-8 h-8 bg-gradient-to-br from-white to-gray-200 rounded-full border-2 border-gray-400 shadow-xl flex items-center justify-center">
                    <div className="w-6 h-6 bg-gradient-to-br from-white to-gray-100 rounded-full"></div>
                  </div>
                )}
                <span className="font-pixel text-white">
                  {currentPlayer === 1 ? '黑棋' : '白棋'}
                  {currentPlayer === myColor && ' (你)'}
                </span>
              </motion.div>
            </div>
            
            {/* 游戏状态文字 */}
            <div className="text-sm">
              {gameState === 'waiting' && (
                <motion.span 
                  className="text-yellow-400 font-pixel bg-yellow-400/10 px-3 py-1 rounded animate-pulse"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  ⏳ 等待对手加入...
                </motion.span>
              )}
              {gameState === 'playing' && currentPlayer === myColor && (
                <motion.span 
                  className="text-green-400 font-pixel bg-green-400/10 px-3 py-1 rounded animate-pulse"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  🎯 你的回合
                </motion.span>
              )}
              {gameState === 'playing' && currentPlayer !== myColor && (
                <span className="text-blue-400 font-pixel bg-blue-400/10 px-3 py-1 rounded">
                  🤔 对手思考中...
                </span>
              )}
              {gameState === 'finished' && (
                <motion.span 
                  className={`font-pixel px-3 py-1 rounded ${
                    winner === myColor 
                      ? 'text-yellow-400 bg-yellow-400/10 animate-glow' 
                      : 'text-gray-400 bg-gray-400/10'
                  }`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 10 }}
                >
                  {winner === myColor ? '🎉 恭喜你赢了！' : '💪 再接再厉！'}
                </motion.span>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </>
  )
}

export default GameStatus