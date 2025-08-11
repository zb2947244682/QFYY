import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import GameBoard from './components/GameBoard'
import RoomManager from './components/RoomManager'
import GameStatus from './components/GameStatus'
import { useGomokuStore } from './store/gameStore'
import { useSocket } from './hooks/useSocket'

/**
 * 五子棋游戏主组件
 * 优化了移动端布局和棋盘显示效果
 */
const GomokuGame = () => {
  const [isInRoom, setIsInRoom] = useState(false)
  const { 
    gameState, 
    roomId,
    resetGame,
    setRoomInfo
  } = useGomokuStore()
  
  const { socket, connected } = useSocket()

  // 调试连接状态
  console.log('GomokuGame - connected:', connected, 'isInRoom:', isInRoom)

  /**
   * 处理离开房间
   */
  const handleLeaveRoom = () => {
    if (socket && roomId) {
      socket.emit('leave-room', { roomId })
    }
    setIsInRoom(false)
    resetGame()
    setRoomInfo(null, false)
  }

  /**
   * 处理重新开始游戏
   */
  const handleRestart = () => {
    console.log('Restart requested')
    if (socket && roomId) {
      // 发送重新开始请求
      socket.emit('restart-game', { roomId })
    }
  }

  return (
    <div className="min-h-[calc(100vh-120px)] flex flex-col items-center justify-start p-1 sm:p-4">
      <AnimatePresence mode="wait">
        {!isInRoom ? (
          <motion.div
            key="room-manager"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-2xl"
          >
            <RoomManager onJoinRoom={() => setIsInRoom(true)} />
          </motion.div>
        ) : (
          <motion.div
            key="game"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-4xl"
          >
            <div className="space-y-1 sm:space-y-4">
              {/* 游戏标题 - 大幅压缩移动端高度 */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-1 sm:py-2"
              >
                <h1 className="text-lg sm:text-4xl font-game font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  五子棋对战
                </h1>
                <p className="text-gray-400 mt-0.5 sm:mt-2 text-xs sm:text-base">
                  房间ID: <span className="text-yellow-400 font-pixel">{roomId}</span>
                </p>
              </motion.div>

              {/* 游戏状态栏 - 紧凑布局 */}
              <GameStatus />

              {/* 游戏棋盘 - 优化布局确保棋盘完整显示 */}
              <div className="flex justify-center items-center w-full py-1 sm:py-2">
                <GameBoard />
              </div>

              {/* 控制按钮 - 紧凑布局 */}
              <div className="flex justify-center gap-2 sm:gap-4 pt-1 sm:pt-4">
                <button
                  onClick={handleRestart}
                  disabled={gameState !== 'finished'}
                  className="pixel-btn text-xs sm:text-sm px-2 sm:px-4 py-1.5 sm:py-3"
                >
                  <span className="hidden sm:inline">重新开始</span>
                  <span className="sm:hidden">重开</span>
                </button>
                <button
                  onClick={handleLeaveRoom}
                  className="pixel-btn bg-red-600 hover:bg-red-700 text-xs sm:text-sm px-2 sm:px-4 py-1.5 sm:py-3"
                >
                  <span className="hidden sm:inline">离开房间</span>
                  <span className="sm:hidden">离开</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 连接状态提示 - 优化移动端位置 */}
      {!connected && isInRoom && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed bottom-2 right-2 bg-orange-600 text-white px-2 py-1 rounded shadow-lg text-xs z-50"
        >
          <span className="animate-pulse">连接中...</span>
        </motion.div>
      )}
    </div>
  )
}

export default GomokuGame