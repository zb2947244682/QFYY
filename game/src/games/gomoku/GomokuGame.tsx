import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'
import GameBoard from './components/GameBoard'
import RoomManager from './components/RoomManager'
import GameStatus from './components/GameStatus'
import NotificationManager from './components/NotificationManager'
import GameOverModal from './components/GameOverModal'
import ConfirmDialog from './components/ConfirmDialog'
import { useGomokuStore } from './store/gameStore'
import { useSocket } from './hooks/useSocket'

/**
 * 五子棋游戏主组件
 * 优化了移动端布局和棋盘显示效果
 */
const GomokuGame = () => {
  const [isInRoom, setIsInRoom] = useState(false)
  const [showGameOverModal, setShowGameOverModal] = useState(false)
  const [pendingRestart, setPendingRestart] = useState(false)
  const [pendingUndo, setPendingUndo] = useState(false)
  const [showRestartConfirm, setShowRestartConfirm] = useState(false)
  const [showUndoConfirm, setShowUndoConfirm] = useState(false)
  
  const { 
    gameState, 
    roomId,
    resetGame,
    setRoomInfo,
    myColor,
    currentPlayer,
    canUndo,
    winner,
    addNotification,
    history
  } = useGomokuStore()
  
  const { 
    socket, 
    connected,
    requestRestart,
    acceptRestart,
    requestUndo,
    acceptUndo,
    surrender
  } = useSocket()

  // 调试连接状态
  console.log('GomokuGame - connected:', connected, 'isInRoom:', isInRoom)

  // 监听游戏结束
  useEffect(() => {
    if (gameState === 'finished' && winner) {
      setTimeout(() => {
        setShowGameOverModal(true)
      }, 1000) // 延迟显示，让玩家先看到连线动画
    }
  }, [gameState, winner])

  // 监听重新开始请求
  useEffect(() => {
    if (!socket) return
    
    const handleRestartRequest = () => {
      setPendingRestart(true)
      setShowRestartConfirm(true)  // 显示确认对话框
    }
    
    const handleUndoRequest = () => {
      setPendingUndo(true)
      setShowUndoConfirm(true)  // 显示确认对话框
    }
    
    socket.on('restart-request', handleRestartRequest)
    socket.on('undo-request', handleUndoRequest)
    
    return () => {
      socket.off('restart-request', handleRestartRequest)
      socket.off('undo-request', handleUndoRequest)
    }
  }, [socket])

  /**
   * 处理同意重新开始
   */
  const handleAcceptRestart = () => {
    if (roomId) {
      acceptRestart(roomId)
      setPendingRestart(false)
      setShowRestartConfirm(false)
    }
  }

  /**
   * 处理拒绝重新开始
   */
  const handleRejectRestart = () => {
    setPendingRestart(false)
    setShowRestartConfirm(false)
    addNotification('info', '已拒绝重新开始请求')
  }

  /**
   * 处理同意悔棋
   */
  const handleAcceptUndo = () => {
    if (roomId) {
      acceptUndo(roomId)
      setPendingUndo(false)
      setShowUndoConfirm(false)
    }
  }

  /**
   * 处理拒绝悔棋
   */
  const handleRejectUndo = () => {
    setPendingUndo(false)
    setShowUndoConfirm(false)
    addNotification('info', '已拒绝悔棋请求')
  }

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
      if (gameState === 'finished') {
        // 游戏结束后可以直接重新开始
        requestRestart(roomId)
        setShowGameOverModal(false)
      } else {
        // 游戏进行中需要对手同意
        requestRestart(roomId)
        addNotification('info', '已发送重新开始请求，等待对手确认...')
      }
    }
  }

  /**
   * 处理悔棋
   */
  const handleUndo = () => {
    // 检查是否可以悔棋
    if (!canUndo || currentPlayer !== myColor || history.length < 2) {
      addNotification('warning', '当前不能悔棋')
      return
    }
    
    if (socket && roomId) {
      requestUndo(roomId)
      addNotification('info', '已发送悔棋请求，等待对手确认...')
    }
  }

  /**
   * 处理认输
   */
  const handleSurrender = () => {
    if (gameState !== 'playing') {
      addNotification('warning', '游戏未在进行中')
      return
    }
    
    // 确认认输
    const confirmSurrender = window.confirm('确定要认输吗？')
    if (confirmSurrender && socket && roomId) {
      surrender(roomId)
      // 更新本地状态
      useGomokuStore.setState({
        gameState: 'finished',
        winner: myColor === 1 ? 2 : 1
      })
      useGomokuStore.getState().updateScore(myColor === 1 ? 2 : 1)
      addNotification('info', '你认输了')
    }
  }

  // 判断悔棋按钮是否应该禁用
  const isUndoDisabled = !canUndo || 
                         currentPlayer !== myColor || 
                         gameState !== 'playing' || 
                         pendingUndo || 
                         history.length < 2

  return (
    <div className="min-h-[calc(100vh-120px)] relative overflow-x-hidden">
      {/* 动态背景 */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        {/* 动态光斑效果 */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-20 w-96 h-96 bg-purple-500 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-500 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }}></div>
        </div>
        
        {/* 网格背景 - 使用CSS渐变代替SVG */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `linear-gradient(rgba(156, 146, 172, 0.1) 2px, transparent 2px),
                             linear-gradient(90deg, rgba(156, 146, 172, 0.1) 2px, transparent 2px)`,
            backgroundSize: '50px 50px',
            backgroundPosition: '-1px -1px'
          }}
        ></div>
      </div>
      
      {/* 主内容区 */}
      <div className="relative z-10 flex flex-col items-center justify-start p-1 sm:p-4">
        {/* 通知管理器 */}
        <NotificationManager />
        
        {/* 游戏结束弹窗 */}
        <GameOverModal 
          isOpen={showGameOverModal}
          onRestart={handleRestart}
          onClose={() => setShowGameOverModal(false)}
        />
        
        {/* 重新开始确认对话框 */}
        <ConfirmDialog
          isOpen={showRestartConfirm}
          title="重新开始请求"
          message="对手请求重新开始游戏，是否同意？"
          confirmText="同意"
          cancelText="拒绝"
          onConfirm={handleAcceptRestart}
          onCancel={handleRejectRestart}
        />
        
        {/* 悔棋确认对话框 */}
        <ConfirmDialog
          isOpen={showUndoConfirm}
          title="悔棋请求"
          message="对手请求悔棋，是否同意？"
          confirmText="同意"
          cancelText="拒绝"
          onConfirm={handleAcceptUndo}
          onCancel={handleRejectUndo}
        />
        
        <AnimatePresence mode="wait">
          {!isInRoom ? (
            <motion.div
              key="room-manager"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-2xl px-2"
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
              className="w-full max-w-4xl px-2"
            >
              <div className="space-y-1 sm:space-y-4">
                {/* 游戏标题 - 大幅压缩移动端高度 */}
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-1 sm:py-2"
                >
                  <h1 className="text-lg sm:text-4xl font-game font-bold bg-gradient-to-r from-yellow-400 via-pink-400 to-purple-400 bg-clip-text text-transparent animate-gradient">
                    五子棋对战
                  </h1>
                  <p className="text-gray-300 mt-0.5 sm:mt-2 text-xs sm:text-base">
                    房间ID: <span className="text-yellow-400 font-pixel px-2 py-1 bg-yellow-400/10 rounded">{roomId}</span>
                  </p>
                </motion.div>

                {/* 游戏状态栏 - 紧凑布局 */}
                <GameStatus />

                {/* 游戏棋盘 - 优化布局确保棋盘完整显示 */}
                <div className="flex justify-center items-center w-full py-1 sm:py-2">
                  <GameBoard />
                </div>

                {/* 控制按钮 - 增强功能 */}
                <div className="flex flex-wrap justify-center gap-2 sm:gap-4 pt-1 sm:pt-4">
                  <button
                    onClick={handleRestart}
                    disabled={pendingRestart}
                    className={clsx(
                      "pixel-btn text-xs sm:text-sm px-2 sm:px-4 py-1.5 sm:py-3 transition-all",
                      pendingRestart && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <span className="hidden sm:inline">
                      {pendingRestart ? '等待确认...' : '重新开始'}
                    </span>
                    <span className="sm:hidden">
                      {pendingRestart ? '等待...' : '重开'}
                    </span>
                  </button>
                  
                  <button
                    onClick={handleUndo}
                    disabled={isUndoDisabled}
                    className={clsx(
                      "pixel-btn bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm px-2 sm:px-4 py-1.5 sm:py-3 transition-all",
                      isUndoDisabled && "opacity-50 cursor-not-allowed hover:bg-blue-600"
                    )}
                  >
                    <span className="hidden sm:inline">
                      {pendingUndo ? '等待确认...' : '悔棋'}
                    </span>
                    <span className="sm:hidden">
                      {pendingUndo ? '等待...' : '悔棋'}
                    </span>
                  </button>
                  
                  <button
                    onClick={handleSurrender}
                    disabled={gameState !== 'playing'}
                    className={clsx(
                      "pixel-btn bg-yellow-600 hover:bg-yellow-700 text-xs sm:text-sm px-2 sm:px-4 py-1.5 sm:py-3 transition-all",
                      gameState !== 'playing' && "opacity-50 cursor-not-allowed hover:bg-yellow-600"
                    )}
                  >
                    <span className="hidden sm:inline">认输</span>
                    <span className="sm:hidden">认输</span>
                  </button>
                  
                  <button
                    onClick={handleLeaveRoom}
                    className="pixel-btn bg-red-600 hover:bg-red-700 text-xs sm:text-sm px-2 sm:px-4 py-1.5 sm:py-3 transition-all"
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
    </div>
  )
}

export default GomokuGame