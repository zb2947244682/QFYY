import { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useGomokuStore } from '../store/gameStore'

let socketInstance: Socket | null = null
let globalConnected = false

export const useSocket = () => {
  const [connected, setConnected] = useState(globalConnected)
  const { setGameState, setPlayerColor, initBoard } = useGomokuStore()

  useEffect(() => {
    if (!socketInstance) {
      // 根据环境确定服务器地址
      let serverUrl: string
      
      if (import.meta.env.DEV) {
        // 开发环境直接连接后端
        serverUrl = 'http://localhost:8569'
      } else {
        // 生产环境走同源，通过 Nginx 反代到后端
        const protocol = window.location.protocol
        const hostname = window.location.hostname
        serverUrl = `${protocol}//${hostname}`
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
      })

      // 房间创建成功
      socketInstance.on('room-created', (data: { roomId: string, isHost: boolean }) => {
        console.log('Room created:', data)
      })

      // 房间加入成功
      socketInstance.on('room-joined', (data: { roomId: string, isHost: boolean }) => {
        console.log('Room joined:', data)
        // 当加入房间时，自动准备开始游戏
        if (socketInstance) {
          console.log('Auto-readying for game start...')
          socketInstance.emit('ready-to-play')
        }
      })

      // 房间错误
      socketInstance.on('room-error', (error: { message: string }) => {
        console.error('Room error:', error.message)
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
        
        const isWin = store.checkWin(data.row, data.col, store.currentPlayer)
        
        useGomokuStore.setState({
          board: newBoard,
          lastMove: { row: data.row, col: data.col },
          currentPlayer: store.currentPlayer === 1 ? 2 : 1,
          winner: isWin ? store.currentPlayer : null,
          gameState: isWin ? 'finished' : 'playing'
        })
      })

      // 重新开始游戏
      socketInstance.on('game-restart', () => {
        console.log('Game restart requested')
        // 重置游戏状态
        initBoard()
        setGameState('playing')
      })
    } else {
      // 如果socket实例已存在，同步连接状态
      setConnected(globalConnected)
    }

    return () => {
      // 不要在组件卸载时断开连接，保持全局连接
    }
  }, [setGameState, setPlayerColor, initBoard])

  // 发送落子信息的函数
  const sendMove = (roomId: string, row: number, col: number) => {
    if (socketInstance) {
      console.log('Sending move:', { roomId, row, col })
      socketInstance.emit('make-move', { roomId, row, col })
    }
  }

  return {
    socket: socketInstance,
    connected,
    sendMove
  }
}