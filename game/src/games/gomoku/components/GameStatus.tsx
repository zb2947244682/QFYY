import { motion } from 'framer-motion'
import { useGomokuStore } from '../store/gameStore'
import PlayerAvatar from './PlayerAvatar'

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
  
  const opponentColor = myColor === 1 ? 2 : myColor === 2 ? 1 : null
  
  return (
    <>
      {/* 移动端布局 - 顶部横向显示 */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between mb-2 px-2">
          {/* 比分显示 - 带头像 */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <PlayerAvatar color={1} size="small" />
              <span className="font-game text-lg text-white">{score.black}</span>
            </div>
            <div className="text-gray-500">:</div>
            <div className="flex items-center gap-1.5">
              <span className="font-game text-lg text-white">{score.white}</span>
              <PlayerAvatar color={2} size="small" />
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
        <div className="pixel-container bg-gradient-to-r from-gray-800/50 to-gray-900/50 p-3">
          <div className="flex items-center justify-between">
            {/* 左侧 - 玩家信息 */}
            <div className="flex items-center gap-4">
              {/* 我的信息 */}
              <div className="flex items-center gap-2">
                <PlayerAvatar 
                  color={myColor} 
                  size="medium" 
                  isActive={gameState === 'playing' && currentPlayer === myColor}
                />
                <div className="flex flex-col">
                  <span className="text-xs text-gray-400">你</span>
                  <div className="flex items-center gap-1">
                    <div className={`w-4 h-4 rounded-full ${
                      myColor === 1 ? 'bg-gradient-to-br from-gray-800 to-black' :
                      myColor === 2 ? 'bg-gradient-to-br from-white to-gray-200 border border-gray-400' :
                      'bg-gray-600'
                    }`} />
                    <span className="text-lg font-game text-white">{myColor === 1 ? score.black : score.white}</span>
                  </div>
                </div>
              </div>
              
              {/* VS标志 */}
              <div className="text-gray-500 font-game text-xl">VS</div>
              
              {/* 对手信息 */}
              <div className="flex items-center gap-2">
                <PlayerAvatar 
                  color={opponentColor} 
                  size="medium"
                  isActive={gameState === 'playing' && currentPlayer !== myColor && currentPlayer !== null}
                />
                <div className="flex flex-col">
                  <span className="text-xs text-gray-400">对手</span>
                  <div className="flex items-center gap-1">
                    <div className={`w-4 h-4 rounded-full ${
                      opponentColor === 1 ? 'bg-gradient-to-br from-gray-800 to-black' :
                      opponentColor === 2 ? 'bg-gradient-to-br from-white to-gray-200 border border-gray-400' :
                      'bg-gray-600'
                    }`} />
                    <span className="text-lg font-game text-white">{opponentColor === 1 ? score.black : score.white}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* 右侧 - 游戏状态 */}
            <div className="flex items-center gap-4">
              {/* 回合数 */}
              <div className="text-gray-400 font-game bg-gray-800/50 px-3 py-1 rounded-lg text-sm">
                第 {roundNumber} 回合
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
          </div>
        </div>
      </div>
    </>
  )
}

export default GameStatus