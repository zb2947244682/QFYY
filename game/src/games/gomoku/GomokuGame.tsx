import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'
import GameBoard from './components/GameBoard'
import RoomManager from './components/RoomManager'
import GameStatus from './components/GameStatus'
import NotificationManager from './components/NotificationManager'
import GameOverModal from './components/GameOverModal'
import ConfirmDialog from './components/ConfirmDialog'
import QuickChat from './components/QuickChat'
import ChatBubble from './components/ChatBubble'
import VoiceControl from './components/VoiceControl'
import { useGomokuStore } from './store/gameStore'
import { useSocket } from './hooks/useSocket'

interface ChatMessage {
  id: string
  content: string
  isOpponent: boolean
  timestamp: number
}

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
  const [showSurrenderConfirm, setShowSurrenderConfirm] = useState(false)
  const [showRealSurrenderConfirm, setShowRealSurrenderConfirm] = useState(false) // 新增：真正认输的确认对话框
  const [waitingForOpponentRestart, setWaitingForOpponentRestart] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  
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
    history,
    userRole  // 添加用户角色
  } = useGomokuStore()
  
  const { 
    socket, 
    connected,
    requestRestart,
    acceptRestart,
    rejectRestart,
    requestUndo,
    acceptUndo,
    rejectUndo,
    surrender,          // 添加认输方法
    sendChatMessage,
    spectatorToPlayer,  // 添加角色转换方法
    playerToSpectator   // 添加角色转换方法
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

  // 监听重新开始请求和其他游戏事件
  useEffect(() => {
    if (!socket) return
    
    const handleRestartRequest = () => {
      // 如果是游戏结束后的请求，显示等待状态
      if (gameState === 'finished') {
        setWaitingForOpponentRestart(false)
        setShowGameOverModal(false)
        // 自动同意重新开始
        if (roomId) {
          acceptRestart(roomId)
        }
        addNotification('info', '双方同意，游戏即将重新开始')
      } else {
        // 游戏进行中的重新开始请求，需要确认
        setPendingRestart(true)
        setShowRestartConfirm(true)
      }
    }
    
    const handleRestartRejected = () => {
      setWaitingForOpponentRestart(false)
      setPendingRestart(false)
      addNotification('warning', '❌ 对手拒绝了重新开始请求')
    }
    
    const handleUndoRequest = () => {
      setPendingUndo(true)
      setShowUndoConfirm(true)
    }
    
    const handleUndoRejected = () => {
      setPendingUndo(false)
      addNotification('warning', '❌ 对手拒绝了悔棋请求')
    }
    
    const handleGameRestart = () => {
      // 游戏重新开始
      setShowGameOverModal(false)
      setWaitingForOpponentRestart(false)
      setPendingRestart(false)
      setShowRestartConfirm(false)
      // 清空聊天消息
      setChatMessages([])
    }
    
    const handlePlayerJoined = (data: { playerId: string }) => {
      console.log('Player joined room:', data.playerId)
      addNotification('success', '🎮 对手已加入房间')
      // 当有玩家加入时，自动准备开始游戏
      if (socket) {
        console.log('Auto-readying for game start...')
        socket.emit('ready-to-play')
      }
    }
    
    const handlePlayerLeft = (data: { playerId: string }) => {
      console.log('Player left room:', data.playerId)
      // 设置游戏状态为等待
      useGomokuStore.setState({ gameState: 'waiting' })
      addNotification('warning', '⚠️ 对手已离开房间')
    }
    
    const handleOpponentSurrender = (data: { winner: 1 | 2 }) => {
      console.log('Opponent surrendered, winner:', data.winner, 'myColor:', myColor)
      // 确认winner应该是我的颜色
      if (data.winner !== myColor) {
        console.error('Winner color mismatch! Expected:', myColor, 'Got:', data.winner)
      }
      // 更新游戏状态 - winner应该是我的颜色
      useGomokuStore.setState({
        gameState: 'finished',
        winner: data.winner  // 这应该等于myColor
      })
      // 更新比分
      useGomokuStore.getState().updateScore(data.winner)
      addNotification('success', '🏳️ 对手认输，你赢了！')
      // 立即显示游戏结束弹窗
      setTimeout(() => {
        setShowGameOverModal(true)
      }, 500)
    }
    
    const handleChatMessage = (data: { message: string, from: string }) => {
      console.log('Received chat message:', data)
      const newMessage: ChatMessage = {
        id: Math.random().toString(36).substr(2, 9),
        content: data.message,
        isOpponent: true,
        timestamp: Date.now()
      }
      setChatMessages(prev => [...prev, newMessage])
    }
    
    socket.on('restart-request', handleRestartRequest)
    socket.on('restart-rejected', handleRestartRejected)
    socket.on('undo-request', handleUndoRequest)
    socket.on('undo-rejected', handleUndoRejected)
    socket.on('game-restart', handleGameRestart)
    socket.on('player-joined', handlePlayerJoined)
    socket.on('player-left', handlePlayerLeft)
    socket.on('opponent-surrender', handleOpponentSurrender)
    socket.on('chat-message', handleChatMessage)
    
    return () => {
      socket.off('restart-request', handleRestartRequest)
      socket.off('restart-rejected', handleRestartRejected)
      socket.off('undo-request', handleUndoRequest)
      socket.off('undo-rejected', handleUndoRejected)
      socket.off('game-restart', handleGameRestart)
      socket.off('player-joined', handlePlayerJoined)
      socket.off('player-left', handlePlayerLeft)
      socket.off('opponent-surrender', handleOpponentSurrender)
      socket.off('chat-message', handleChatMessage)
    }
  }, [socket, roomId, acceptRestart, addNotification, gameState, myColor])

  /**
   * 处理发送聊天消息
   */
  const handleSendMessage = (message: string) => {
    if (!roomId) return
    
    // 发送消息
    sendChatMessage(roomId, message)
    
    // 添加到本地消息列表
    const newMessage: ChatMessage = {
      id: Math.random().toString(36).substr(2, 9),
      content: message,
      isOpponent: false,
      timestamp: Date.now()
    }
    setChatMessages(prev => [...prev, newMessage])
  }

  /**
   * 处理同意重新开始
   */
  const handleAcceptRestart = () => {
    if (roomId) {
      acceptRestart(roomId)
      setPendingRestart(false)
      setShowRestartConfirm(false)
      addNotification('success', '✅ 已同意重新开始')
    }
  }

  /**
   * 处理拒绝重新开始
   */
  const handleRejectRestart = () => {
    if (roomId) {
      rejectRestart(roomId)
    }
    setPendingRestart(false)
    setShowRestartConfirm(false)
    addNotification('info', '❌ 已拒绝重新开始请求')
  }

  /**
   * 处理同意悔棋
   */
  const handleAcceptUndo = () => {
    if (roomId) {
      acceptUndo(roomId)
      setPendingUndo(false)
      setShowUndoConfirm(false)
      addNotification('success', '✅ 已同意悔棋')
    }
  }

  /**
   * 处理拒绝悔棋
   */
  const handleRejectUndo = () => {
    if (roomId) {
      rejectUndo(roomId)
    }
    setPendingUndo(false)
    setShowUndoConfirm(false)
    addNotification('info', '❌ 已拒绝悔棋请求')
  }

  /**
   * 处理离开房间
   */
  const handleLeaveRoom = () => {
    console.log('Leaving room:', roomId)
    
    if (socket && roomId) {
      socket.emit('leave-room', { roomId })
      // 确保socket也离开对应的房间
      socket.emit('socket-leave-room', { roomId })
    }
    
    // 重置所有本地状态
    setIsInRoom(false)
    setShowGameOverModal(false)
    setPendingRestart(false)
    setPendingUndo(false)
    setShowRestartConfirm(false)
    setShowUndoConfirm(false)
    setShowSurrenderConfirm(false)
    setShowRealSurrenderConfirm(false)
    setWaitingForOpponentRestart(false)
    setChatMessages([])
    
    // 重置游戏状态
    resetGame()
    setRoomInfo(null, false)
    
    addNotification('info', '👋 已离开房间')
  }

  /**
   * 处理重新开始游戏
   */
  const handleRestart = () => {
    console.log('Restart requested, gameState:', gameState, 'waitingForOpponentRestart:', waitingForOpponentRestart)
    
    // 防止重复请求
    if (waitingForOpponentRestart) {
      addNotification('info', '⏳ 正在等待对手同意...')
      return
    }
    
    if (socket && roomId) {
      if (gameState === 'finished') {
        // 游戏结束后的重新开始
        setWaitingForOpponentRestart(true)
        requestRestart(roomId)
        addNotification('info', '⏳ 等待对手同意再来一局...')
      } else {
        // 游戏进行中的重新开始
        requestRestart(roomId)
        addNotification('info', '📨 已发送重新开始请求')
      }
    }
  }

  /**
   * 处理悔棋
   */
  const handleUndo = () => {
    // 检查是否可以悔棋 - 只能在对方回合悔棋（撤回自己刚下的棋）
    if (!canUndo || currentPlayer === myColor || history.length < 2) {
      addNotification('warning', '⚠️ 当前不能悔棋')
      return
    }
    
    if (socket && roomId) {
      requestUndo(roomId)
      addNotification('info', '📨 已发送悔棋请求，等待对手确认...')
    }
  }

  /**
   * 处理到观众席
   */
  const handleToSpectator = () => {
    if (userRole !== 'player') {
      addNotification('warning', '⚠️ 你已经是观众了')
      return
    }
    
    // 显示确认对话框
    setShowSurrenderConfirm(true)
  }
  
  /**
   * 确认到观众席
   */
  const handleConfirmToSpectator = () => {
    // 玩家转为观众
    playerToSpectator()
    setShowSurrenderConfirm(false)
    addNotification('info', '👁️ 你已转为观众')
  }
  
  /**
   * 取消到观众席
   */
  const handleCancelToSpectator = () => {
    setShowSurrenderConfirm(false)
  }
  
  /**
   * 处理认输
   */
  const handleSurrender = () => {
    if (gameState !== 'playing' || userRole !== 'player') {
      addNotification('warning', '⚠️ 当前不能认输')
      return
    }
    
    // 显示认输确认对话框
    setShowRealSurrenderConfirm(true)
  }

  /**
   * 确认认输
   */
  const handleConfirmSurrender = () => {
    if (roomId && myColor) {
      // 使用socket的surrender方法
      surrender(roomId, myColor)
      addNotification('info', '🏳️ 你已认输')
    }
    setShowRealSurrenderConfirm(false)
  }

  /**
   * 取消认输
   */
  const handleCancelSurrender = () => {
    setShowRealSurrenderConfirm(false)
  }

  /**
   * 处理成为玩家
   */
  const handleBecomePlayer = () => {
    spectatorToPlayer()
  }

  // 判断悔棋按钮是否应该禁用 - 只能在对方回合悔棋
  const isUndoDisabled = !canUndo || 
                         currentPlayer === myColor ||  // 自己回合时禁用
                         gameState !== 'playing' || 
                         pendingUndo || 
                         history.length < 2

  return (
    <div className="relative">
      {/* 通知管理器 */}
      <NotificationManager />
      
      {/* 聊天气泡 */}
      {isInRoom && <ChatBubble messages={chatMessages} />}
      
      {/* 游戏结束弹窗 */}
      <GameOverModal 
        isOpen={showGameOverModal}
        onRestart={handleRestart}
        onClose={() => setShowGameOverModal(false)}
        waitingForOpponent={waitingForOpponentRestart}
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
      
      {/* 到观众席确认对话框 */}
      <ConfirmDialog
        isOpen={showSurrenderConfirm}
        title="到观众席确认"
        message="确定要到观众席吗？你将成为观众。"
        confirmText="确认"
        cancelText="取消"
        onConfirm={handleConfirmToSpectator}
        onCancel={handleCancelToSpectator}
      />

      {/* 认输确认对话框 */}
      <ConfirmDialog
        isOpen={showRealSurrenderConfirm}
        title="认输确认"
        message="确定要认输吗？你将输掉当前游戏。"
        confirmText="确认认输"
        cancelText="取消"
        onConfirm={handleConfirmSurrender}
        onCancel={handleCancelSurrender}
      />

      <AnimatePresence mode="wait">
        {!isInRoom ? (
          <motion.div
            key="room-manager"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className="flex items-center justify-center px-4 py-2"
          >
            <div className="w-full max-w-2xl">
              <RoomManager onJoinRoom={() => setIsInRoom(true)} />
            </div>
          </motion.div>
        ) : (
            <motion.div
              key="game"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col"
            >
              {/* PC端布局 - 紧凑文档流布局 */}
              <div className="hidden sm:flex flex-col">
                {/* 顶部标题栏 - 极简高度 */}
                <div className="text-center py-0.5">
                  <h1 className="text-base font-game font-bold bg-gradient-to-r from-yellow-400 via-pink-400 to-purple-400 bg-clip-text text-transparent inline-flex items-center gap-2">
                    五子棋对战
                    {userRole === 'spectator' && (
                      <span className="text-sm font-normal text-yellow-400">（观战模式）</span>
                    )}
                  </h1>
                  <p className="text-gray-300 text-xs">
                    房间: <span className="text-yellow-400 font-pixel">{roomId}</span>
                  </p>
                </div>
                
                {/* 主游戏区域 - 使用自然高度，不强制占满 */}
                <div className="flex justify-center px-4 pt-1">
                  {/* 左侧信息栏 */}
                  <div className="flex-shrink-0">
                    <GameStatus side="left" />
                  </div>
                  
                  {/* 中央棋盘和按钮 */}
                  <div className="mx-3 flex flex-col">
                    {/* 棋盘 */}
                    <GameBoard />
                    
                    {/* 控制按钮 - 紧贴棋盘，分组显示 */}
                    <div className="flex flex-col gap-2 mt-2 pb-2">
                      {userRole === 'player' ? (
                        <>
                          {/* 第一行：游戏控制 */}
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={handleRestart}
                              disabled={pendingRestart || waitingForOpponentRestart}
                              className={clsx(
                                "pixel-btn bg-green-600 hover:bg-green-700 transition-all",
                                (pendingRestart || waitingForOpponentRestart) && "opacity-50 cursor-not-allowed"
                              )}
                            >
                              {waitingForOpponentRestart ? '⏳ 等待对手...' : pendingRestart ? '⏳ 等待确认...' : '🔄 重新开始'}
                            </button>
                            
                            <button
                              onClick={handleUndo}
                              disabled={isUndoDisabled}
                              className={clsx(
                                "pixel-btn bg-blue-600 hover:bg-blue-700 transition-all",
                                isUndoDisabled && "opacity-50 cursor-not-allowed hover:bg-blue-600"
                              )}
                            >
                              {pendingUndo ? '⏳ 等待确认...' : '↩️ 悔棋'}
                            </button>
                            
                            <button
                              onClick={handleSurrender}
                              disabled={gameState !== 'playing'}
                              className={clsx(
                                "pixel-btn bg-red-600 hover:bg-red-700 transition-all",
                                gameState !== 'playing' && "opacity-50 cursor-not-allowed hover:bg-red-600"
                              )}
                            >
                              🏳️ 认输
                            </button>
                          </div>
                          
                          {/* 第二行：互动功能 */}
                          <div className="flex justify-center gap-2">
                            <QuickChat onSendMessage={handleSendMessage} userRole={userRole} />
                            <VoiceControl />
                            
                            <div className="border-l-2 border-gray-600 mx-1"></div>
                            
                            <button
                              onClick={handleToSpectator}
                              className="pixel-btn bg-yellow-600 hover:bg-yellow-700 transition-all"
                            >
                              👁️ 到观众席
                            </button>
                            
                            <button
                              onClick={handleLeaveRoom}
                              className="pixel-btn bg-gray-600 hover:bg-gray-700 transition-all"
                            >
                              🚪 离开房间
                            </button>
                          </div>
                        </>
                      ) : userRole === 'spectator' ? (
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={handleBecomePlayer}
                            className="pixel-btn bg-green-600 hover:bg-green-700 transition-all"
                          >
                            🎮 成为玩家
                          </button>
                          
                          <QuickChat onSendMessage={handleSendMessage} userRole={userRole} />
                          <VoiceControl />
                          
                          <span className="text-yellow-400 px-3 py-2 flex items-center">
                            👁️ 观战模式
                          </span>
                          
                          <button
                            onClick={handleLeaveRoom}
                            className="pixel-btn bg-gray-600 hover:bg-gray-700 transition-all"
                          >
                            🚪 离开房间
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  
                  {/* 右侧信息栏 */}
                  <div className="flex-shrink-0">
                    <GameStatus side="right" />
                  </div>
                </div>
              </div>

              {/* 移动端布局 - 紧凑文档流 */}
              <div className="sm:hidden flex flex-col">
                {/* 游戏标题 - 最小化 */}
                <div className="text-center py-0.5">
                  <h1 className="text-xs font-game font-bold text-yellow-400">
                    五子棋{userRole === 'spectator' && '(观战)'} - {roomId}
                  </h1>
                </div>

                {/* 游戏状态栏 - 紧凑 */}
                <div className="px-1">
                  <GameStatus />
                </div>

                {/* 游戏内容区 - 使用自然高度 */}
                <div className="flex flex-col items-center pt-0.5">
                  {/* 游戏棋盘 */}
                  <GameBoard />
                  
                  {/* 控制按钮 - 紧贴棋盘，分两行显示 */}
                  <div className="flex flex-col gap-1 mt-1 px-2 pb-2">
                    {userRole === 'player' ? (
                      <>
                        {/* 第一行：核心游戏控制 */}
                        <div className="flex justify-center gap-1">
                          <button
                            onClick={handleRestart}
                            disabled={pendingRestart || waitingForOpponentRestart}
                            className={clsx(
                              "pixel-btn bg-green-600 text-[10px] px-2 py-1 transition-all",
                              (pendingRestart || waitingForOpponentRestart) && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            {waitingForOpponentRestart || pendingRestart ? '⏳' : '🔄'} 重开
                          </button>
                          
                          <button
                            onClick={handleUndo}
                            disabled={isUndoDisabled}
                            className={clsx(
                              "pixel-btn bg-blue-600 text-[10px] px-2 py-1 transition-all",
                              isUndoDisabled && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            {pendingUndo ? '⏳' : '↩️'} 悔棋
                          </button>
                          
                          <button
                            onClick={handleSurrender}
                            disabled={gameState !== 'playing'}
                            className={clsx(
                              "pixel-btn bg-red-600 text-[10px] px-2 py-1 transition-all",
                              gameState !== 'playing' && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            🏳️ 认输
                          </button>
                        </div>
                        
                        {/* 第二行：互动和其他功能 */}
                        <div className="flex justify-center gap-1">
                          <QuickChat onSendMessage={handleSendMessage} userRole={userRole} />
                          <VoiceControl />
                          
                          <button
                            onClick={handleToSpectator}
                            className="pixel-btn bg-yellow-600 text-[10px] px-2 py-1 transition-all"
                          >
                            👁️ 观战
                          </button>
                          
                          <button
                            onClick={handleLeaveRoom}
                            className="pixel-btn bg-gray-600 text-[10px] px-2 py-1 transition-all"
                          >
                            🚪 离开
                          </button>
                        </div>
                      </>
                    ) : userRole === 'spectator' ? (
                      <div className="flex justify-center gap-1">
                        <button
                          onClick={handleBecomePlayer}
                          className="pixel-btn bg-green-600 text-[10px] px-2 py-1 transition-all"
                        >
                          🎮 玩家
                        </button>
                        
                        <QuickChat onSendMessage={handleSendMessage} userRole={userRole} />
                        <VoiceControl />
                        
                        <button
                          onClick={handleLeaveRoom}
                          className="pixel-btn bg-gray-600 text-[10px] px-2 py-1 transition-all"
                        >
                          🚪 离开
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 连接状态提示 */}
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