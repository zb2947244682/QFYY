import { motion } from 'framer-motion'
import { useGomokuStore } from '../store/gameStore'
import PlayerAvatar from './PlayerAvatar'

interface GameStatusProps {
  side?: 'left' | 'right'
}

/**
 * 游戏状态组件
 * 显示当前玩家、游戏状态和比分信息
 */
const GameStatus = ({ side }: GameStatusProps) => {
  const { 
    currentPlayer, 
    gameState, 
    myColor, 
    score,
    roundNumber,
    winner
  } = useGomokuStore()
  
  const opponentColor = myColor === 1 ? 2 : myColor === 2 ? 1 : null
  
  // PC端左右分栏显示
  if (side === 'left') {
    // 左侧显示我的信息
    return (
      <div className="pixel-container bg-gradient-to-b from-gray-800/50 to-gray-900/50 p-2 w-44">
        <div className="flex flex-col items-center gap-1">
          <div className="text-xs font-bold text-white bg-green-600/20 px-2 py-0.5 rounded">
            你的棋子
          </div>
          
          <PlayerAvatar 
            color={myColor} 
            size="medium" 
            isActive={gameState === 'playing' && currentPlayer === myColor}
          />
          
          <div className="flex items-center gap-1">
            <div className={`w-4 h-4 rounded-full shadow-lg ${
              myColor === 1 ? 'bg-gradient-to-br from-gray-800 to-black' :
              myColor === 2 ? 'bg-gradient-to-br from-white to-gray-200 border border-gray-400' :
              'bg-gray-600'
            }`} />
            <span className="text-sm font-game text-white">
              {myColor === 1 ? '黑棋' : myColor === 2 ? '白棋' : '未定'}
            </span>
          </div>
          
          <div className="text-xs text-gray-300">
            得分: <span className="text-yellow-400 font-bold">
              {myColor === 1 ? score.black : myColor === 2 ? score.white : 0}
            </span>
          </div>
          
          {gameState === 'playing' && currentPlayer === myColor && (
            <motion.div 
              className="text-green-400 font-pixel text-xs bg-green-400/10 px-2 py-0.5 rounded animate-pulse"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              🎯 你的回合
            </motion.div>
          )}
        </div>
      </div>
    )
  }
  
  if (side === 'right') {
    // 右侧显示对手信息和游戏状态
    return (
      <div className="pixel-container bg-gradient-to-b from-gray-800/50 to-gray-900/50 p-2 w-44">
        <div className="flex flex-col items-center gap-1">
          <div className="text-xs text-gray-400">
            对手棋子
          </div>
          
          <PlayerAvatar 
            color={opponentColor} 
            size="medium"
            isActive={gameState === 'playing' && currentPlayer !== myColor && currentPlayer !== null}
          />
          
          <div className="flex items-center gap-1">
            <div className={`w-4 h-4 rounded-full shadow-lg ${
              opponentColor === 1 ? 'bg-gradient-to-br from-gray-800 to-black' :
              opponentColor === 2 ? 'bg-gradient-to-br from-white to-gray-200 border border-gray-400' :
              'bg-gray-600'
            }`} />
            <span className="text-sm font-game text-white">
              {opponentColor === 1 ? '黑棋' : opponentColor === 2 ? '白棋' : '未定'}
            </span>
          </div>
          
          <div className="text-xs text-gray-300">
            得分: <span className="text-yellow-400 font-bold">
              {opponentColor === 1 ? score.black : opponentColor === 2 ? score.white : 0}
            </span>
          </div>
          
          {/* 游戏状态 */}
          <div className="text-gray-400 font-game bg-gray-800/50 px-2 py-0.5 rounded text-xs">
            第 {roundNumber} 回合
          </div>
          
          {gameState === 'waiting' && (
            <motion.span 
              className="text-yellow-400 font-pixel text-xs bg-yellow-400/10 px-2 py-0.5 rounded animate-pulse"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              等待对手...
            </motion.span>
          )}
          
          {gameState === 'playing' && currentPlayer !== myColor && (
            <span className="text-blue-400 font-pixel text-xs bg-blue-400/10 px-2 py-0.5 rounded">
              对手思考中...
            </span>
          )}
          
          {gameState === 'finished' && (
            <motion.span 
              className={`font-pixel text-xs px-2 py-0.5 rounded ${
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
    )
  }
  
  // 移动端布局 - 更紧凑
  return (
    <>
      {/* 移动端布局 - 顶部横向显示 */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between px-1 py-0.5">
          {/* 左侧 - 我的信息 */}
          <div className="flex items-center gap-0.5">
            <PlayerAvatar 
              color={myColor} 
              size="small" 
              isActive={gameState === 'playing' && currentPlayer === myColor}
            />
            <div className="flex flex-col">
              <span className="text-[8px] text-gray-400">你</span>
              <div className="flex items-center gap-0.5">
                <span className="font-game text-xs text-white">
                  {myColor === 1 ? '黑' : myColor === 2 ? '白' : '-'}
                </span>
                <span className="text-[10px] text-gray-400">
                  ({myColor === 1 ? score.black : myColor === 2 ? score.white : 0})
                </span>
              </div>
            </div>
          </div>
          
          {/* 中间 - 回合和状态 */}
          <div className="flex flex-col items-center">
            <div className="text-[9px] text-gray-400 font-pixel">第{roundNumber}回合</div>
            <div className="text-[9px] mt-0">
              {gameState === 'waiting' && (
                <span className="text-yellow-400 font-pixel animate-pulse">等待对手</span>
              )}
              {gameState === 'playing' && currentPlayer === myColor && (
                <span className="text-green-400 font-pixel animate-pulse">你的回合</span>
              )}
              {gameState === 'playing' && currentPlayer !== myColor && (
                <span className="text-blue-400 font-pixel">对手思考</span>
              )}
              {gameState === 'finished' && (
                <span className={winner === myColor ? 'text-yellow-400' : 'text-gray-400'}>
                  {winner === myColor ? '你赢了' : '再接再厉'}
                </span>
              )}
            </div>
          </div>
          
          {/* 右侧 - 对手信息 */}
          <div className="flex items-center gap-0.5">
            <div className="flex flex-col items-end">
              <span className="text-[8px] text-gray-400">对手</span>
              <div className="flex items-center gap-0.5">
                <span className="text-[10px] text-gray-400">
                  ({opponentColor === 1 ? score.black : opponentColor === 2 ? score.white : 0})
                </span>
                <span className="font-game text-xs text-white">
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
    </>
  )
}

export default GameStatus