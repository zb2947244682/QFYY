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
          {/* 左侧 - 我的信息 */}
          <div className="flex items-center gap-1.5">
            <PlayerAvatar 
              color={myColor} 
              size="small" 
              isActive={gameState === 'playing' && currentPlayer === myColor}
            />
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-400">你</span>
              <div className="flex items-center gap-1">
                <span className="font-game text-base text-white">
                  {myColor === 1 ? '黑' : myColor === 2 ? '白' : '-'}
                </span>
                <span className="text-sm text-gray-400">
                  ({myColor === 1 ? score.black : myColor === 2 ? score.white : 0})
                </span>
              </div>
            </div>
          </div>
          
          {/* 中间 - 回合和状态 */}
          <div className="flex flex-col items-center">
            <div className="text-xs text-gray-400 font-pixel">第 {roundNumber} 回合</div>
            <div className="text-xs mt-0.5">
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
                  {winner === myColor ? '你赢了！' : '再接再厉'}
                </span>
              )}
            </div>
          </div>
          
          {/* 右侧 - 对手信息 */}
          <div className="flex items-center gap-1.5">
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-gray-400">对手</span>
              <div className="flex items-center gap-1">
                <span className="text-sm text-gray-400">
                  ({opponentColor === 1 ? score.black : opponentColor === 2 ? score.white : 0})
                </span>
                <span className="font-game text-base text-white">
                  {opponentColor === 1 ? '黑' : opponentColor === 2 ? '白' : '-'}
                </span>
              </div>
            </div>
            <PlayerAvatar 
              color={opponentColor} 
              size="small"
              isActive={gameState === 'playing' && currentPlayer !== myColor && currentPlayer !== null}
            />
          </div>
        </div>
      </div>

      {/* 桌面端布局 - 精致卡片样式 */}
      <div className="hidden sm:block">
        <div className="pixel-container bg-gradient-to-r from-gray-800/50 to-gray-900/50 p-2">
          <div className="flex items-center justify-between">
            {/* 左侧 - 我的信息（明确标识） */}
            <div className="flex items-center gap-3">
              <PlayerAvatar 
                color={myColor} 
                size="medium" 
                isActive={gameState === 'playing' && currentPlayer === myColor}
              />
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white bg-green-600/20 px-2 py-0.5 rounded">
                    你的棋子
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`w-5 h-5 rounded-full shadow-lg ${
                    myColor === 1 ? 'bg-gradient-to-br from-gray-800 to-black' :
                    myColor === 2 ? 'bg-gradient-to-br from-white to-gray-200 border border-gray-400' :
                    'bg-gray-600'
                  }`} />
                  <span className="text-lg font-game text-white">
                    {myColor === 1 ? '黑棋' : myColor === 2 ? '白棋' : '未定'}
                  </span>
                  <span className="text-base text-gray-400">
                    ({myColor === 1 ? score.black : myColor === 2 ? score.white : 0}分)
                  </span>
                </div>
              </div>
            </div>
            
            {/* 中间 - 回合和状态 */}
            <div className="flex flex-col items-center gap-1">
              <div className="text-gray-400 font-game bg-gray-800/50 px-3 py-0.5 rounded text-sm">
                第 {roundNumber} 回合
              </div>
              <div className="text-sm">
                {gameState === 'waiting' && (
                  <motion.span 
                    className="text-yellow-400 font-pixel bg-yellow-400/10 px-3 py-0.5 rounded animate-pulse"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  >
                    等待对手...
                  </motion.span>
                )}
                {gameState === 'playing' && currentPlayer === myColor && (
                  <motion.span 
                    className="text-green-400 font-pixel bg-green-400/10 px-3 py-0.5 rounded animate-pulse"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  >
                    🎯 你的回合
                  </motion.span>
                )}
                {gameState === 'playing' && currentPlayer !== myColor && (
                  <span className="text-blue-400 font-pixel bg-blue-400/10 px-3 py-0.5 rounded">
                    等待对手...
                  </span>
                )}
                {gameState === 'finished' && (
                  <motion.span 
                    className={`font-pixel px-3 py-0.5 rounded ${
                      winner === myColor 
                        ? 'text-yellow-400 bg-yellow-400/10 animate-glow' 
                        : 'text-gray-400 bg-gray-400/10'
                    }`}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 10 }}
                  >
                    {winner === myColor ? '🎉 你赢了！' : '💪 再接再厉'}
                  </motion.span>
                )}
              </div>
            </div>
            
            {/* 右侧 - 对手信息 */}
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">对手棋子</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-base text-gray-400">
                    ({opponentColor === 1 ? score.black : opponentColor === 2 ? score.white : 0}分)
                  </span>
                  <span className="text-lg font-game text-white">
                    {opponentColor === 1 ? '黑棋' : opponentColor === 2 ? '白棋' : '未定'}
                  </span>
                  <div className={`w-5 h-5 rounded-full shadow-lg ${
                    opponentColor === 1 ? 'bg-gradient-to-br from-gray-800 to-black' :
                    opponentColor === 2 ? 'bg-gradient-to-br from-white to-gray-200 border border-gray-400' :
                    'bg-gray-600'
                  }`} />
                </div>
              </div>
              <PlayerAvatar 
                color={opponentColor} 
                size="medium"
                isActive={gameState === 'playing' && currentPlayer !== myColor && currentPlayer !== null}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default GameStatus