import { motion } from 'framer-motion'
import { useGomokuStore } from '../store/gameStore'
import clsx from 'clsx'

const GameStatus = () => {
  const { 
    myColor, 
    currentPlayer, 
    gameState, 
    winner,
    score,
    roundNumber
  } = useGomokuStore()

  // 调试日志
  console.log('GameStatus render - gameState:', gameState, 'myColor:', myColor, 'currentPlayer:', currentPlayer, 'winner:', winner)

  const isMyTurn = currentPlayer === myColor
  const myColorText = myColor === 1 ? '黑子' : myColor === 2 ? '白子' : '未分配'
  const currentPlayerText = currentPlayer === 1 ? '黑子' : '白子'
  
  const getStatusText = () => {
    if (gameState === 'waiting') {
      return '等待对手加入...'
    }
    if (gameState === 'finished') {
      console.log('Game finished - winner:', winner, 'myColor:', myColor, 'winner === myColor:', winner === myColor)
      if (winner === myColor) {
        return '🎉 恭喜你获胜！'
      } else {
        return '😔 很遗憾，你输了'
      }
    }
    if (isMyTurn) {
      return '轮到你了'
    } else {
      return '等待对手落子...'
    }
  }

  const statusText = getStatusText()

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="pixel-container p-2 sm:p-3"
    >
      {/* 移动端：紧凑的布局 */}
      <div className="block sm:hidden">
        {/* 比分显示 */}
        <div className="flex items-center justify-between mb-2 px-2">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-gradient-to-br from-gray-800 to-black rounded-full shadow-lg"></div>
            <span className="font-game text-xs text-white font-bold">{score.black}</span>
          </div>
          <div className="text-gray-400 text-xs font-pixel">第{roundNumber}回合</div>
          <div className="flex items-center gap-1">
            <span className="font-game text-xs text-white font-bold">{score.white}</span>
            <div className="w-4 h-4 bg-gradient-to-br from-white to-gray-200 rounded-full border border-gray-400 shadow-lg"></div>
          </div>
        </div>
        
        {/* 游戏状态 */}
        <div className="flex items-center justify-between text-xs">
          {/* 我的棋子 */}
          <div className="flex items-center gap-1">
            <div 
              className={clsx(
                'w-4 h-4 rounded-full shadow-md',
                myColor === 1 ? 'bg-gradient-to-br from-gray-800 to-black' : 
                myColor === 2 ? 'bg-gradient-to-br from-white to-gray-200 border border-gray-400' : 
                'bg-gray-600'
              )}
            />
            <span className="font-game text-xs text-gray-300">{myColorText}</span>
          </div>
          
          {/* 游戏状态 */}
          <div className={clsx(
            'font-game text-xs px-2 py-1 rounded',
            gameState === 'waiting' && 'text-yellow-400 bg-yellow-400/10',
            gameState === 'playing' && isMyTurn && 'text-green-400 bg-green-400/10 animate-pulse',
            gameState === 'playing' && !isMyTurn && 'text-blue-400 bg-blue-400/10',
            gameState === 'finished' && winner === myColor && 'text-green-400 bg-green-400/10',
            gameState === 'finished' && winner !== myColor && 'text-red-400 bg-red-400/10'
          )}>
            {statusText}
          </div>
          
          {/* 当前回合 */}
          <div className="flex items-center gap-1">
            {gameState === 'playing' && (
              <>
                <div 
                  className={clsx(
                    'w-4 h-4 rounded-full shadow-md',
                    currentPlayer === 1 ? 'bg-gradient-to-br from-gray-800 to-black' : 
                    'bg-gradient-to-br from-white to-gray-200 border border-gray-400'
                  )}
                />
                <span className="font-game text-xs text-gray-300">{currentPlayerText}</span>
              </>
            )}
            {gameState !== 'playing' && (
              <span className="text-gray-500 text-xs">-</span>
            )}
          </div>
        </div>
      </div>

      {/* 桌面端：保持原有的布局加上比分 */}
      <div className="hidden sm:block">
        {/* 比分和回合 */}
        <div className="flex items-center justify-between mb-3 px-4">
          <div className="flex items-center gap-4">
            <motion.div 
              className="flex items-center gap-2"
              whileHover={{ scale: 1.05 }}
            >
              <div className="w-8 h-8 bg-gradient-to-br from-gray-800 to-black rounded-full shadow-xl"></div>
              <span className="font-game text-2xl text-white drop-shadow-lg">{score.black}</span>
            </motion.div>
            <div className="text-gray-500 text-2xl">:</div>
            <motion.div 
              className="flex items-center gap-2"
              whileHover={{ scale: 1.05 }}
            >
              <span className="font-game text-2xl text-white drop-shadow-lg">{score.white}</span>
              <div className="w-8 h-8 bg-gradient-to-br from-white to-gray-200 rounded-full border-2 border-gray-400 shadow-xl"></div>
            </motion.div>
          </div>
          <div className="text-gray-400 font-game bg-gray-800/50 px-3 py-1 rounded-lg">
            第 {roundNumber} 回合
          </div>
        </div>
        
        {/* 原有的三列布局 */}
        <div className="grid grid-cols-3 gap-4 bg-gray-800/30 rounded-lg p-3">
          {/* 我的颜色 */}
          <div className="text-center">
            <div className="text-sm text-gray-400 mb-2">你的棋子</div>
            <motion.div 
              className="flex items-center justify-center gap-2"
              whileHover={{ scale: 1.1 }}
            >
              <div 
                className={clsx(
                  'w-8 h-8 rounded-full shadow-lg',
                  myColor === 1 ? 'bg-gradient-to-br from-gray-800 to-black' : 
                  myColor === 2 ? 'bg-gradient-to-br from-white to-gray-200 border-2 border-gray-400' : 
                  'bg-gray-600'
                )}
              />
              <span className="font-game text-lg text-white">{myColorText}</span>
            </motion.div>
          </div>

          {/* 游戏状态 */}
          <div className="text-center">
            <div className="text-sm text-gray-400 mb-2">游戏状态</div>
            <div className={clsx(
              'font-game text-lg px-3 py-1 rounded-lg inline-block',
              gameState === 'waiting' && 'text-yellow-400 bg-yellow-400/10',
              gameState === 'playing' && isMyTurn && 'text-green-400 bg-green-400/10 animate-pulse',
              gameState === 'playing' && !isMyTurn && 'text-blue-400 bg-blue-400/10',
              gameState === 'finished' && winner === myColor && 'text-green-400 bg-green-400/10 animate-glow',
              gameState === 'finished' && winner !== myColor && 'text-red-400 bg-red-400/10'
            )}>
              {statusText}
            </div>
          </div>

          {/* 当前回合 */}
          <div className="text-center">
            <div className="text-sm text-gray-400 mb-2">当前回合</div>
            <motion.div 
              className="flex items-center justify-center gap-2"
              animate={gameState === 'playing' ? { scale: [1, 1.05, 1] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {gameState === 'playing' && (
                <>
                  <div 
                    className={clsx(
                      'w-8 h-8 rounded-full shadow-lg',
                      currentPlayer === 1 ? 'bg-gradient-to-br from-gray-800 to-black' : 
                      'bg-gradient-to-br from-white to-gray-200 border-2 border-gray-400'
                    )}
                  />
                  <span className="font-game text-lg text-white">{currentPlayerText}</span>
                </>
              )}
              {gameState !== 'playing' && (
                <span className="text-gray-500">-</span>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default GameStatus