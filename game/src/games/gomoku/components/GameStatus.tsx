import { motion } from 'framer-motion'
import { useGomokuStore } from '../store/gameStore'
import clsx from 'clsx'

const GameStatus = () => {
  const { 
    myColor, 
    currentPlayer, 
    gameState, 
    winner 
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
      className="bg-gray-800 rounded-lg p-2 sm:p-3"
    >
      {/* 移动端：紧凑的单行布局 */}
      <div className="block sm:hidden">
        <div className="flex items-center justify-between text-xs">
          {/* 我的棋子 */}
          <div className="flex items-center gap-1">
            <div 
              className={clsx(
                'w-4 h-4 rounded',
                myColor === 1 ? 'bg-black' : myColor === 2 ? 'bg-white border border-gray-400' : 'bg-gray-600'
              )}
            />
            <span className="font-game text-xs">{myColorText}</span>
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
                    'w-4 h-4 rounded',
                    currentPlayer === 1 ? 'bg-black' : 'bg-white border border-gray-400'
                  )}
                />
                <span className="font-game text-xs">{currentPlayerText}</span>
              </>
            )}
            {gameState !== 'playing' && (
              <span className="text-gray-500 text-xs">-</span>
            )}
          </div>
        </div>
      </div>

      {/* 桌面端：保持原有的三列布局 */}
      <div className="hidden sm:grid grid-cols-3 gap-4">
        {/* 我的颜色 */}
        <div className="text-center">
          <div className="text-sm text-gray-400 mb-1">你的棋子</div>
          <div className="flex items-center justify-center gap-2">
            <div 
              className={clsx(
                'w-6 h-6 rounded',
                myColor === 1 ? 'bg-black' : myColor === 2 ? 'bg-white border-2 border-gray-400' : 'bg-gray-600'
              )}
            />
            <span className="font-game text-lg">{myColorText}</span>
          </div>
        </div>

        {/* 游戏状态 */}
        <div className="text-center">
          <div className="text-sm text-gray-400 mb-1">游戏状态</div>
          <div className={clsx(
            'font-game text-lg',
            gameState === 'waiting' && 'text-yellow-400',
            gameState === 'playing' && isMyTurn && 'text-green-400 animate-pulse',
            gameState === 'playing' && !isMyTurn && 'text-blue-400',
            gameState === 'finished' && winner === myColor && 'text-green-400',
            gameState === 'finished' && winner !== myColor && 'text-red-400'
          )}>
            {statusText}
          </div>
        </div>

        {/* 当前回合 */}
        <div className="text-center">
          <div className="text-sm text-gray-400 mb-1">当前回合</div>
          <div className="flex items-center justify-center gap-2">
            {gameState === 'playing' && (
              <>
                <div 
                  className={clsx(
                    'w-6 h-6 rounded',
                    currentPlayer === 1 ? 'bg-black' : 'bg-white border-2 border-gray-400'
                  )}
                />
                <span className="font-game text-lg">{currentPlayerText}</span>
              </>
            )}
            {gameState !== 'playing' && (
              <span className="text-gray-500">-</span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default GameStatus