import { create } from 'zustand'

export type Player = 1 | 2
export type Cell = 0 | Player
export type GameState = 'waiting' | 'playing' | 'finished'

interface Position {
  row: number
  col: number
}

interface GameHistory {
  player: Player
  position: Position
  timestamp: number
}

interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  message: string
  timestamp: number
}

interface GomokuStore {
  // 游戏状态
  board: Cell[][]
  boardSize: number
  currentPlayer: Player
  myColor: Player | null
  gameState: GameState
  winner: Player | null
  lastMove: Position | null
  winningLine: Position[] | null  // 五子连线的位置
  
  // 游戏历史
  history: GameHistory[]
  canUndo: boolean
  
  // 比分记录
  score: {
    black: number
    white: number
  }
  roundNumber: number  // 当前回合数
  firstPlayer: Player  // 本回合先手玩家
  
  // 房间信息
  roomId: string | null
  isHost: boolean
  opponentName: string | null
  
  // 通知消息
  notifications: Notification[]
  
  // 动作
  initBoard: () => void
  makeMove: (row: number, col: number) => boolean
  setPlayerColor: (color: Player) => void
  setGameState: (state: GameState) => void
  setRoomInfo: (roomId: string | null, isHost: boolean) => void
  resetGame: () => void
  checkWin: (row: number, col: number, player: Player) => Position[] | null
  
  // 新增动作
  addNotification: (type: 'info' | 'success' | 'warning' | 'error', message: string) => void
  removeNotification: (id: string) => void
  updateScore: (winner: Player) => void
  nextRound: () => void
  setOpponentName: (name: string | null) => void
  addHistory: (player: Player, position: Position) => void
  setCanUndo: (canUndo: boolean) => void
  undoMove: () => void
  setWinningLine: (line: Position[] | null) => void
}

const BOARD_SIZE = 13

const createEmptyBoard = (): Cell[][] => {
  return Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(0))
}

export const useGomokuStore = create<GomokuStore>((set, get) => ({
  // 初始状态
  board: createEmptyBoard(),
  boardSize: BOARD_SIZE,
  currentPlayer: 1,
  myColor: null,
  gameState: 'waiting',
  winner: null,
  lastMove: null,
  winningLine: null,
  
  // 游戏历史
  history: [],
  canUndo: false,
  
  // 比分记录
  score: {
    black: 0,
    white: 0
  },
  roundNumber: 1,
  firstPlayer: 1,
  
  // 房间信息
  roomId: null,
  isHost: false,
  opponentName: null,
  
  // 通知消息
  notifications: [],

  // 初始化棋盘
  initBoard: () => {
    const { roundNumber } = get()
    // 交替先手：奇数回合黑棋先，偶数回合白棋先
    const firstPlayer = roundNumber % 2 === 1 ? 1 : 2
    
    set({
      board: createEmptyBoard(),
      currentPlayer: firstPlayer,
      winner: null,
      lastMove: null,
      winningLine: null,
      gameState: 'waiting',
      history: [],
      canUndo: false,
      firstPlayer
    })
  },

  // 落子
  makeMove: (row: number, col: number) => {
    const { board, currentPlayer, gameState, myColor, boardSize } = get()
    
    // 检查游戏状态
    if (gameState !== 'playing') return false
    
    // 检查是否轮到自己
    if (currentPlayer !== myColor) return false
    
    // 检查位置是否有效
    if (row < 0 || row >= boardSize || col < 0 || col >= boardSize) return false
    
    // 检查位置是否已有棋子
    if (board[row][col] !== 0) return false
    
    // 更新棋盘
    const newBoard = board.map(r => [...r])
    newBoard[row][col] = currentPlayer
    
    // 检查是否获胜
    const winLine = get().checkWin(row, col, currentPlayer)
    const isWin = winLine !== null
    
    // 添加到历史记录
    get().addHistory(currentPlayer, { row, col })
    
    set({
      board: newBoard,
      lastMove: { row, col },
      currentPlayer: currentPlayer === 1 ? 2 : 1,
      winner: isWin ? currentPlayer : null,
      winningLine: winLine,
      gameState: isWin ? 'finished' : 'playing',
      canUndo: true  // 落子后可以悔棋
    })
    
    // 如果获胜，更新比分
    if (isWin) {
      get().updateScore(currentPlayer)
    }
    
    return true
  },

  // 设置玩家颜色
  setPlayerColor: (color: Player) => {
    set({ myColor: color })
  },

  // 设置游戏状态
  setGameState: (state: GameState) => {
    set({ gameState: state })
  },

  // 设置房间信息
  setRoomInfo: (roomId: string | null, isHost: boolean) => {
    set({ roomId, isHost })
  },

  // 重置游戏
  resetGame: () => {
    set({
      board: createEmptyBoard(),
      currentPlayer: 1,
      myColor: null,
      gameState: 'waiting',
      winner: null,
      lastMove: null,
      winningLine: null,
      roomId: null,
      isHost: false,
      history: [],
      canUndo: false,
      opponentName: null,
      notifications: [],
      score: { black: 0, white: 0 },
      roundNumber: 1,
      firstPlayer: 1
    })
  },

  // 检查获胜（返回五子连线的位置数组）
  checkWin: (row: number, col: number, player: Player) => {
    const { board, boardSize } = get()
    
    // 检查四个方向
    const directions = [
      [[0, 1], [0, -1]],   // 水平
      [[1, 0], [-1, 0]],   // 垂直
      [[1, 1], [-1, -1]],  // 主对角线
      [[1, -1], [-1, 1]]   // 副对角线
    ]
    
    for (const direction of directions) {
      const line: Position[] = [{ row, col }]  // 包含当前落子位置
      
      // 检查两个方向
      for (const [dr, dc] of direction) {
        let r = row + dr
        let c = col + dc
        
        // 沿着一个方向计数
        while (
          r >= 0 && r < boardSize &&
          c >= 0 && c < boardSize &&
          board[r][c] === player
        ) {
          line.push({ row: r, col: c })
          r += dr
          c += dc
        }
      }
      
      // 五子连线获胜
      if (line.length >= 5) {
        return line
      }
    }
    
    return null
  },
  
  // 添加通知
  addNotification: (type, message) => {
    const notification: Notification = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      message,
      timestamp: Date.now()
    }
    
    set(state => ({
      notifications: [...state.notifications, notification]
    }))
    
    // 5秒后自动移除通知
    setTimeout(() => {
      get().removeNotification(notification.id)
    }, 5000)
  },
  
  // 移除通知
  removeNotification: (id) => {
    set(state => ({
      notifications: state.notifications.filter(n => n.id !== id)
    }))
  },
  
  // 更新比分
  updateScore: (winner) => {
    set(state => ({
      score: {
        ...state.score,
        [winner === 1 ? 'black' : 'white']: state.score[winner === 1 ? 'black' : 'white'] + 1
      }
    }))
  },
  
  // 下一回合
  nextRound: () => {
    set(state => {
      const newRoundNumber = state.roundNumber + 1
      // 交替先手
      const firstPlayer = newRoundNumber % 2 === 1 ? 1 : 2
      
      return {
        board: createEmptyBoard(),
        currentPlayer: firstPlayer,
        winner: null,
        lastMove: null,
        winningLine: null,
        gameState: 'playing',
        history: [],
        canUndo: false,
        roundNumber: newRoundNumber,
        firstPlayer
      }
    })
  },
  
  // 设置对手名称
  setOpponentName: (name) => {
    set({ opponentName: name })
  },
  
  // 添加历史记录
  addHistory: (player, position) => {
    set(state => ({
      history: [...state.history, {
        player,
        position,
        timestamp: Date.now()
      }]
    }))
  },
  
  // 设置是否可以悔棋
  setCanUndo: (canUndo) => {
    set({ canUndo })
  },
  
  // 悔棋
  undoMove: () => {
    const { history } = get()
    
    if (history.length < 2) return  // 至少要有两步棋才能悔棋
    
    // 移除最后两步（自己和对手各一步）
    const newHistory = history.slice(0, -2)
    
    // 重建棋盘
    const newBoard = createEmptyBoard()
    newHistory.forEach(move => {
      newBoard[move.position.row][move.position.col] = move.player
    })
    
    // 确定当前玩家
    const currentPlayer = newHistory.length > 0 
      ? (newHistory[newHistory.length - 1].player === 1 ? 2 : 1)
      : get().firstPlayer
    
    const lastMove = newHistory.length > 0 
      ? newHistory[newHistory.length - 1].position
      : null
    
    set({
      board: newBoard,
      history: newHistory,
      currentPlayer,
      lastMove,
      canUndo: false,
      winningLine: null
    })
  },
  
  // 设置获胜连线
  setWinningLine: (line) => {
    set({ winningLine: line })
  }
}))