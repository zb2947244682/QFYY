import { create } from 'zustand'

export type Player = 1 | 2
export type Cell = 0 | Player
export type GameState = 'waiting' | 'playing' | 'finished'

interface Position {
  row: number
  col: number
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
  
  // 房间信息
  roomId: string | null
  isHost: boolean
  
  // 动作
  initBoard: () => void
  makeMove: (row: number, col: number) => boolean
  setPlayerColor: (color: Player) => void
  setGameState: (state: GameState) => void
  setRoomInfo: (roomId: string | null, isHost: boolean) => void
  resetGame: () => void
  checkWin: (row: number, col: number, player: Player) => boolean
}

const BOARD_SIZE = 9

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
  roomId: null,
  isHost: false,

  // 初始化棋盘
  initBoard: () => {
    set({
      board: createEmptyBoard(),
      currentPlayer: 1,
      winner: null,
      lastMove: null,
      gameState: 'waiting'
    })
  },

  // 落子
  makeMove: (row: number, col: number) => {
    const { board, currentPlayer, gameState, myColor } = get()
    
    // 检查游戏状态
    if (gameState !== 'playing') return false
    
    // 检查是否轮到自己
    if (currentPlayer !== myColor) return false
    
    // 检查位置是否有效
    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return false
    
    // 检查位置是否已有棋子
    if (board[row][col] !== 0) return false
    
    // 更新棋盘
    const newBoard = board.map(r => [...r])
    newBoard[row][col] = currentPlayer
    
    // 检查是否获胜
    const isWin = get().checkWin(row, col, currentPlayer)
    
    set({
      board: newBoard,
      lastMove: { row, col },
      currentPlayer: currentPlayer === 1 ? 2 : 1,
      winner: isWin ? currentPlayer : null,
      gameState: isWin ? 'finished' : 'playing'
    })
    
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
      roomId: null,
      isHost: false
    })
  },

  // 检查获胜
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
      let count = 1 // 包含当前落子位置
      
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
          count++
          r += dr
          c += dc
        }
      }
      
      // 五子连线获胜
      if (count >= 5) {
        return true
      }
    }
    
    return false
  }
}))