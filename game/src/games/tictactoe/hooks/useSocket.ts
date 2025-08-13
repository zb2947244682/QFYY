import { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'

let socketInstance: Socket | null = null
let globalConnected = false

export interface TicTacToeSocketHook {
  socket: Socket | null
  connected: boolean
  joinRoom: (roomId: string, mode: 'single' | 'online') => void
  createRoom: (mode: 'single' | 'online') => void
  makeMove: (roomId: string, row: number, col: number) => void
  requestRestart: (roomId: string) => void
  acceptRestart: (roomId: string) => void
  rejectRestart: (roomId: string) => void
  leaveRoom: (roomId: string) => void
}

export const useTicTacToeSocket = (
  onGameStart: (data: { playerSymbol: 'X' | 'O', opponentId?: string }) => void,
  onOpponentMove: (data: { row: number, col: number }) => void,
  onGameEnd: (data: { winner: 'X' | 'O' | 'draw', reason?: string }) => void,
  onRoomJoined: (data: { roomId: string, isHost: boolean }) => void,
  onPlayerJoined: (data: { playerId: string }) => void,
  onPlayerLeft: (data: { playerId: string }) => void,
  onRestartRequest: () => void,
  onGameRestart: () => void,
  onError: (message: string) => void
): TicTacToeSocketHook => {
  const [connected, setConnected] = useState(globalConnected)

  useEffect(() => {
    if (!socketInstance) {
      // 根据环境确定服务器地址
      let serverUrl: string
      
      if (import.meta.env.DEV) {
        serverUrl = 'http://localhost:9001'
      } else {
        serverUrl = 'http://socket.qingfengyueying.xyz'
      }
      
      console.log('TicTacToe - Connecting to:', serverUrl)
      
      socketInstance = io(serverUrl, {
        transports: ['websocket', 'polling'],
        upgrade: true,
        path: '/socket.io/',
        timeout: 10000,
        forceNew: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      })

      socketInstance.on('connect', () => {
        console.log('TicTacToe socket connected')
        globalConnected = true
        setConnected(true)
      })

      socketInstance.on('disconnect', () => {
        console.log('TicTacToe socket disconnected')
        globalConnected = false
        setConnected(false)
      })

      // 游戏事件监听
      socketInstance.on('ttt-game-start', (data) => {
        console.log('TicTacToe game start:', data)
        onGameStart(data)
      })

      socketInstance.on('ttt-opponent-move', (data) => {
        console.log('TicTacToe opponent move:', data)
        onOpponentMove(data)
      })

      socketInstance.on('ttt-game-end', (data) => {
        console.log('TicTacToe game end:', data)
        onGameEnd(data)
      })

      socketInstance.on('ttt-room-joined', (data) => {
        console.log('TicTacToe room joined:', data)
        onRoomJoined(data)
      })

      socketInstance.on('ttt-room-created', (data) => {
        console.log('TicTacToe room created:', data)
        onRoomJoined(data)
      })

      socketInstance.on('ttt-player-joined', (data) => {
        console.log('TicTacToe player joined:', data)
        onPlayerJoined(data)
      })

      socketInstance.on('ttt-player-left', (data) => {
        console.log('TicTacToe player left:', data)
        onPlayerLeft(data)
      })

      socketInstance.on('ttt-restart-request', () => {
        console.log('TicTacToe restart request')
        onRestartRequest()
      })

      socketInstance.on('ttt-game-restart', () => {
        console.log('TicTacToe game restart')
        onGameRestart()
      })

      socketInstance.on('ttt-error', (data: { message: string }) => {
        console.error('TicTacToe error:', data.message)
        onError(data.message)
      })
    } else {
      setConnected(globalConnected)
    }

    return () => {
      // 不要在组件卸载时断开连接
    }
  }, [onGameStart, onOpponentMove, onGameEnd, onRoomJoined, onPlayerJoined, onPlayerLeft, onRestartRequest, onGameRestart, onError])

  const joinRoom = (roomId: string, mode: 'single' | 'online') => {
    if (socketInstance && mode === 'online') {
      console.log('Joining TicTacToe room:', roomId)
      socketInstance.emit('ttt-join-room', { roomId })
    }
  }

  const createRoom = (mode: 'single' | 'online') => {
    if (socketInstance && mode === 'online') {
      console.log('Creating TicTacToe room')
      socketInstance.emit('ttt-create-room')
    }
  }

  const makeMove = (roomId: string, row: number, col: number) => {
    if (socketInstance) {
      console.log('Making TicTacToe move:', { roomId, row, col })
      socketInstance.emit('ttt-make-move', { roomId, row, col })
    }
  }

  const requestRestart = (roomId: string) => {
    if (socketInstance) {
      console.log('Requesting TicTacToe restart:', roomId)
      socketInstance.emit('ttt-request-restart', { roomId })
    }
  }

  const acceptRestart = (roomId: string) => {
    if (socketInstance) {
      console.log('Accepting TicTacToe restart:', roomId)
      socketInstance.emit('ttt-accept-restart', { roomId })
    }
  }

  const rejectRestart = (roomId: string) => {
    if (socketInstance) {
      console.log('Rejecting TicTacToe restart:', roomId)
      socketInstance.emit('ttt-reject-restart', { roomId })
    }
  }

  const leaveRoom = (roomId: string) => {
    if (socketInstance) {
      console.log('Leaving TicTacToe room:', roomId)
      socketInstance.emit('ttt-leave-room', { roomId })
    }
  }

  return {
    socket: socketInstance,
    connected,
    joinRoom,
    createRoom,
    makeMove,
    requestRestart,
    acceptRestart,
    rejectRestart,
    leaveRoom
  }
}