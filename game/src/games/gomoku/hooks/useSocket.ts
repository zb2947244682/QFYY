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
    setWinningLine
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

      // 游戏开始
      socketInstance.on('game-start', (data: { playerColor: 1 | 2, opponentId: string }) => {
        console.log('Game started, my color:', data.playerColor, 'opponent:', data.opponentId)
        console.log('Before state update - gameState:', useGomokuStore.getState().gameState)
        
        setPlayerColor(data.playerColor)
        // 先重置棋盘（该函数会把 gameState 置为 waiting）
        initBoard()
        // 再显式设置为 playing，避免被上面的重置覆盖
        setGameState('playing')
        
        console.log('After state update - gameState:', useGomokuStore.getState().gameState)
        console.log('After state update - myColor:', useGomokuStore.getState().myColor)
      })

      // 玩家加入
      socketInstance.on('player-joined', (data: { playerId: string }) => {
        console.log('Player joined room:', data.playerId)
        addNotification('info', '对手已加入房间')
        // 当有玩家加入时，自动准备开始游戏
        if (socketInstance) {
          console.log('Auto-readying for game start...')
          socketInstance.emit('ready-to-play')
        }
      })

      // 玩家离开
      socketInstance.on('player-left', (data: { playerId: string }) => {
        console.log('Player left room:', data.playerId)
        setGameState('waiting')
        addNotification('warning', '对手已离开房间')
      })

      // 房间创建成功
      socketInstance.on('room-created', (data: { roomId: string, isHost: boolean }) => {
        console.log('Room created:', data)
        addNotification('success', `房间 ${data.roomId} 创建成功`)
      })

      // 房间加入成功
      socketInstance.on('room-joined', (data: { roomId: string, isHost: boolean }) => {
        console.log('Room joined:', data)
        addNotification('success', `已加入房间 ${data.roomId}`)
        // 当加入房间时，自动准备开始游戏
        if (socketInstance) {
          console.log('Auto-readying for game start...')
          socketInstance.emit('ready-to-play')
        }
      })

      // 房间错误
      socketInstance.on('room-error', (error: { message: string }) => {
        console.error('Room error:', error.message)
        addNotification('error', error.message)
      })

      // 房间列表更新
      socketInstance.on('room-list', (roomList: any[]) => {
        console.log('Room list updated:', roomList)
      })

      // 对手落子
      socketInstance.on('opponent-move', (data: { row: number, col: number }) => {
        console.log('Opponent made move:', data)
        // 更新游戏状态
        const store = useGomokuStore.getState()
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

      // 重新开始游戏请求
      socketInstance.on('restart-request', (data: { from: string }) => {
        console.log('Restart request from:', data.from)
        addNotification('info', '对手请求重新开始游戏')
        // 这里可以弹出确认框让用户确认
      })

      // 重新开始游戏
      socketInstance.on('game-restart', () => {
        console.log('Game restart')
        nextRound()
        setGameState('playing')
        addNotification('success', '游戏已重新开始')
      })

      // 悔棋请求
      socketInstance.on('undo-request', (data: { from: string }) => {
        console.log('Undo request from:', data.from)
        addNotification('info', '对手请求悔棋')
        // 这里可以弹出确认框让用户确认
      })

      // 悔棋
      socketInstance.on('undo-move', () => {
        console.log('Undo move')
        undoMove()
        addNotification('info', '已悔棋')
      })

      // 认输
      socketInstance.on('opponent-surrender', (data: { winner: 1 | 2 }) => {
        console.log('Opponent surrendered, winner:', data.winner)
        const store = useGomokuStore.getState()
        
        useGomokuStore.setState({
          gameState: 'finished',
          winner: data.winner
        })
        
        store.updateScore(data.winner)
        addNotification('success', '对手认输，你赢了！')
      })
    } else {
      // 如果socket实例已存在，同步连接状态
      setConnected(globalConnected)
    }

    return () => {
      // 不要在组件卸载时断开连接，保持全局连接
    }
  }, [setGameState, setPlayerColor, initBoard, addNotification, nextRound, undoMove, setCanUndo, setWinningLine])

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
  const surrender = (roomId: string) => {
    if (socketInstance) {
      console.log('Surrendering:', roomId)
      socketInstance.emit('surrender', { roomId })
    }
  }

  return {
    socket: socketInstance,
    connected,
    sendMove,
    requestRestart,
    acceptRestart,
    requestUndo,
    acceptUndo,
    surrender
  }
}