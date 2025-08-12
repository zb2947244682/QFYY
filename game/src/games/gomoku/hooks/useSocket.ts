import { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useGomokuStore } from '../store/gameStore'

let socketInstance: Socket | null = null
let globalConnected = false

export const useSocket = () => {
  const [connected, setConnected] = useState(globalConnected)
  const { 
    setGameState, 
    setPlayerColor, 
    initBoard,
    addNotification,
    nextRound,
    undoMove,
    setCanUndo,
    setWinningLine,
    setUserRole,
    userRole
  } = useGomokuStore()

  useEffect(() => {
    if (!socketInstance) {
      // 根据环境确定服务器地址
      let serverUrl: string
      
      if (import.meta.env.DEV) {
        // 开发环境连接本地独立Socket服务
        serverUrl = 'http://localhost:9001'
      } else {
        // 生产环境连接独立Socket服务域名（使用HTTP，因为服务器没有SSL证书）
        serverUrl = 'http://socket.qingfengyueying.xyz'
      }
      
      console.log('Attempting to connect to:', serverUrl)
      
      socketInstance = io(serverUrl, {
        transports: ['websocket', 'polling'], // 允许降级到polling
        upgrade: true,
        path: '/socket.io/', // 明确指定Socket.IO路径
        timeout: 10000, // 增加超时时间
        forceNew: true, // 强制创建新连接
        reconnection: true, // 启用重连
        reconnectionAttempts: 5, // 重连尝试次数
        reconnectionDelay: 1000 // 重连延迟
      })

      socketInstance.on('connect', () => {
        console.log('Socket connected to:', serverUrl)
        globalConnected = true
        setConnected(true)
      })

      socketInstance.on('disconnect', () => {
        console.log('Socket disconnected')
        globalConnected = false
        setConnected(false)
        addNotification('warning', '与服务器断开连接')
      })

      socketInstance.on('connect_error', (error) => {
        console.error('Socket connection error:', error)
        globalConnected = false
        setConnected(false)
      })

      socketInstance.on('reconnect', (attemptNumber) => {
        console.log('Socket reconnected after', attemptNumber, 'attempts')
        globalConnected = true
        setConnected(true)
        addNotification('success', '重新连接成功')
      })

      socketInstance.on('reconnect_error', (error) => {
        console.error('Socket reconnection error:', error)
        globalConnected = false
        setConnected(false)
      })

      // 游戏开始（玩家）
      socketInstance.on('game-start', (data: { playerColor: 1 | 2, opponentId: string }) => {
        console.log('Game started, my color:', data.playerColor, 'opponent:', data.opponentId)
        console.log('Before state update - gameState:', useGomokuStore.getState().gameState)
        
        setPlayerColor(data.playerColor)
        // 先重置棋盘（该函数会把 gameState 置为 waiting）
        initBoard()
        // 再显式设置为 playing，避免被上面的重置覆盖
        setGameState('playing')
        addNotification('success', '🎯 游戏开始！')
        
        console.log('After state update - gameState:', useGomokuStore.getState().gameState)
        console.log('After state update - myColor:', useGomokuStore.getState().myColor)
      })
      
      // 游戏开始（观众）
      socketInstance.on('game-start-spectator', (data: { blackPlayer: string, whitePlayer: string }) => {
        console.log('Game started for spectator, black:', data.blackPlayer, 'white:', data.whitePlayer)
        initBoard()
        setGameState('playing')
        addNotification('info', '🎯 游戏已开始，你正在观战')
      })
      
      // 角色变更成功
      socketInstance.on('role-changed', (data: { role: 'player' | 'spectator', roomId: string }) => {
        console.log('Role changed to:', data.role)
        setUserRole(data.role)
        
        if (data.role === 'spectator') {
          setPlayerColor(null) // 观众没有颜色
          addNotification('info', '👁️ 你现在是观众')
        } else {
          addNotification('success', '🎮  你现在是玩家')
        }
      })
      
      // 其他用户角色变更通知
      socketInstance.on('user-role-changed', (data: { userId: string, role: 'player' | 'spectator', wasSurrender?: boolean }) => {
        if (data.wasSurrender) {
          addNotification('info', '🏳️ 一位玩家认输并成为观众')
        } else if (data.role === 'player') {
          addNotification('info', '👥 一位观众成为了玩家')
        } else {
          addNotification('info', '👁️ 一位玩家成为了观众')
        }
      })
      
      // 角色变更错误
      socketInstance.on('role-change-error', (data: { message: string }) => {
        console.error('Role change error:', data.message)
        addNotification('error', `❌ ${data.message}`)
      })
      
      // 提示准备游戏（当房间有2个玩家时）
      socketInstance.on('ready-prompt', () => {
        console.log('Ready prompt received')
        if (socketInstance) {
          socketInstance.emit('ready-to-play')
        }
      })
      
      // 游戏移动（观众接收）
      socketInstance.on('game-move', (data: { row: number, col: number, playerId: string }) => {
        console.log('Game move for spectator:', data)
        const store = useGomokuStore.getState()
        
        // 只有观众处理这个事件
        if (store.userRole !== 'spectator') return
        
        const newBoard = store.board.map(r => [...r])
        newBoard[data.row][data.col] = store.currentPlayer
        
        const winLine = store.checkWin(data.row, data.col, store.currentPlayer)
        const isWin = winLine !== null
        
        store.addHistory(store.currentPlayer, { row: data.row, col: data.col })
        
        useGomokuStore.setState({
          board: newBoard,
          lastMove: { row: data.row, col: data.col },
          currentPlayer: store.currentPlayer === 1 ? 2 : 1,
          winner: isWin ? store.currentPlayer : null,
          winningLine: winLine,
          gameState: isWin ? 'finished' : 'playing'
        })
        
        if (isWin) {
          store.updateScore(store.currentPlayer)
        }
      })

      // 注意：以下事件已在GomokuGame组件中处理，这里不再重复处理
      // - player-joined
      // - player-left  
      // - restart-request
      // - undo-request
      // - opponent-surrender
      
      // 房间创建成功
      socketInstance.on('room-created', (data: { roomId: string, isHost: boolean }) => {
        console.log('Room created:', data)
        addNotification('success', `✅ 房间 ${data.roomId} 创建成功`)
      })

      // 房间加入成功
      socketInstance.on('room-joined', (data: { roomId: string, isHost: boolean }) => {
        console.log('Room joined:', data)
        addNotification('success', `✅ 已加入房间 ${data.roomId}`)
        // 当加入房间时，自动准备开始游戏
        if (socketInstance) {
          console.log('Auto-readying for game start...')
          socketInstance.emit('ready-to-play')
        }
      })
      
      // 以观众身份加入成功
      socketInstance.on('spectator-joined', (data: { roomId: string, isHost: boolean }) => {
        console.log('Joined as spectator:', data)
        addNotification('info', `👁️ 已以观众身份加入房间 ${data.roomId}`)
      })

      // 房间错误
      socketInstance.on('room-error', (error: { message: string }) => {
        console.error('Room error:', error.message)
        addNotification('error', `❌ ${error.message}`)
      })

      // 房间列表更新
      socketInstance.on('room-list', (roomList: any[]) => {
        console.log('Room list updated:', roomList)
      })

      // 对手落子
      socketInstance.on('opponent-move', (data: { row: number, col: number }) => {
        console.log('Opponent made move:', data)
        const store = useGomokuStore.getState()
        
        // 只有玩家处理这个事件
        if (store.userRole !== 'player') return
        
        const newBoard = store.board.map(r => [...r])
        newBoard[data.row][data.col] = store.currentPlayer
        
        const winLine = store.checkWin(data.row, data.col, store.currentPlayer)
        const isWin = winLine !== null
        
        // 添加到历史记录
        store.addHistory(store.currentPlayer, { row: data.row, col: data.col })
        
        useGomokuStore.setState({
          board: newBoard,
          lastMove: { row: data.row, col: data.col },
          currentPlayer: store.currentPlayer === 1 ? 2 : 1,
          winner: isWin ? store.currentPlayer : null,
          winningLine: winLine,
          gameState: isWin ? 'finished' : 'playing',
          canUndo: true
        })
        
        // 如果对手获胜，更新比分
        if (isWin) {
          store.updateScore(store.currentPlayer)
        }
      })

      // 游戏重新开始（双方都同意后的事件）
      socketInstance.on('game-restart', () => {
        console.log('Game restart - both players agreed')
        nextRound()
        setGameState('playing')
        addNotification('success', '🎮 游戏已重新开始')
      })

      // 悔棋（双方都同意后的事件）
      socketInstance.on('undo-move', () => {
        console.log('Undo move - both players agreed')
        undoMove()
        addNotification('info', '↩️ 已悔棋')
      })
      
      // 注意：opponent-surrender 事件已在GomokuGame组件中处理
    } else {
      // 如果socket实例已存在，同步连接状态
      setConnected(globalConnected)
    }

    return () => {
      // 不要在组件卸载时断开连接，保持全局连接
    }
  }, [setGameState, setPlayerColor, initBoard, addNotification, nextRound, undoMove, setCanUndo, setWinningLine, setUserRole, userRole])

  // 发送落子信息的函数
  const sendMove = (roomId: string, row: number, col: number) => {
    if (socketInstance) {
      console.log('Sending move:', { roomId, row, col })
      socketInstance.emit('make-move', { roomId, row, col })
    }
  }

  // 请求重新开始
  const requestRestart = (roomId: string) => {
    if (socketInstance) {
      console.log('Requesting restart:', roomId)
      socketInstance.emit('request-restart', { roomId })
    }
  }

  // 同意重新开始
  const acceptRestart = (roomId: string) => {
    if (socketInstance) {
      console.log('Accepting restart:', roomId)
      socketInstance.emit('accept-restart', { roomId })
    }
  }

  // 请求悔棋
  const requestUndo = (roomId: string) => {
    if (socketInstance) {
      console.log('Requesting undo:', roomId)
      socketInstance.emit('request-undo', { roomId })
    }
  }

  // 同意悔棋
  const acceptUndo = (roomId: string) => {
    if (socketInstance) {
      console.log('Accepting undo:', roomId)
      socketInstance.emit('accept-undo', { roomId })
    }
  }

  // 认输
  const surrender = (roomId: string, myColor: number) => {
    if (socketInstance) {
      console.log('Surrendering:', roomId, 'myColor:', myColor)
      socketInstance.emit('surrender', { roomId, surrenderColor: myColor })
    }
  }

  // 发送聊天消息
  const sendChatMessage = (roomId: string, message: string) => {
    if (socketInstance) {
      console.log('Sending chat message:', { roomId, message })
      socketInstance.emit('chat-message', { roomId, message })
    }
  }
  
  // 拒绝重新开始
  const rejectRestart = (roomId: string) => {
    if (socketInstance) {
      console.log('Rejecting restart:', roomId)
      socketInstance.emit('reject-restart', { roomId })
    }
  }
  
  // 拒绝悔棋
  const rejectUndo = (roomId: string) => {
    if (socketInstance) {
      console.log('Rejecting undo:', roomId)
      socketInstance.emit('reject-undo', { roomId })
    }
  }

  // 从观众转换为玩家
  const spectatorToPlayer = () => {
    if (socketInstance) {
      console.log('Requesting to become player')
      socketInstance.emit('spectator-to-player')
    }
  }
  
  // 从玩家转换为观众（到观众席）
  const playerToSpectator = () => {
    if (socketInstance) {
      console.log('Requesting to become spectator')
      socketInstance.emit('player-to-spectator')
    }
  }

  return {
    socket: socketInstance,
    connected,
    sendMove,
    requestRestart,
    acceptRestart,
    rejectRestart,
    requestUndo,
    acceptUndo,
    rejectUndo,
    surrender,
    sendChatMessage,
    spectatorToPlayer,
    playerToSpectator
  }
}