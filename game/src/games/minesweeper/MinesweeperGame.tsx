import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, RotateCcw, Bomb, Clock, Trophy } from 'lucide-react'

type Cell = {
  isMine: boolean
  isRevealed: boolean
  isFlagged: boolean
  adjacentMines: number
}

type Board = Cell[][]
type Difficulty = 'easy' | 'medium' | 'hard'

const DIFFICULTIES = {
  easy: { rows: 9, cols: 9, mines: 10 },
  medium: { rows: 16, cols: 16, mines: 40 },
  hard: { rows: 16, cols: 30, mines: 99 }
}

const MinesweeperGame = () => {
  const navigate = useNavigate()
  const [difficulty, setDifficulty] = useState<Difficulty>('easy')
  const [board, setBoard] = useState<Board>([])
  const [gameStatus, setGameStatus] = useState<'playing' | 'won' | 'lost'>('playing')
  const [flagsCount, setFlagsCount] = useState(0)
  const [revealedCount, setRevealedCount] = useState(0)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [firstClick, setFirstClick] = useState(true)
  const [longPressTimer, setLongPressTimer] = useState<ReturnType<typeof setTimeout> | null>(null)

  const { rows, cols, mines } = DIFFICULTIES[difficulty]



  // 在第一次点击后生成地雷
  const generateMines = useCallback((board: Board, excludeRow: number, excludeCol: number): Board => {
    const newBoard = board.map(row => row.map(cell => ({ ...cell })))
    let minesPlaced = 0
    
    while (minesPlaced < mines) {
      const row = Math.floor(Math.random() * rows)
      const col = Math.floor(Math.random() * cols)
      
      // 确保第一次点击的位置及其周围不会有地雷
      const isExcluded = Math.abs(row - excludeRow) <= 1 && Math.abs(col - excludeCol) <= 1
      
      if (!newBoard[row][col].isMine && !isExcluded) {
        newBoard[row][col].isMine = true
        minesPlaced++
        
        // 更新周围格子的相邻地雷数
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue
            const newRow = row + dr
            const newCol = col + dc
            if (newRow >= 0 && newRow < rows && newCol >= 0 && newCol < cols) {
              newBoard[newRow][newCol].adjacentMines++
            }
          }
        }
      }
    }
    
    return newBoard
  }, [rows, cols, mines])

  // 递归揭示空白格子
  const revealEmptyCells = useCallback((board: Board, row: number, col: number): Board => {
    const newBoard = board.map(r => r.map(c => ({ ...c })))
    const toReveal: [number, number][] = [[row, col]]
    const revealed = new Set<string>()
    
    while (toReveal.length > 0) {
      const [currentRow, currentCol] = toReveal.pop()!
      const key = `${currentRow},${currentCol}`
      
      if (revealed.has(key)) continue
      revealed.add(key)
      
      if (currentRow < 0 || currentRow >= rows || currentCol < 0 || currentCol >= cols) continue
      if (newBoard[currentRow][currentCol].isRevealed || newBoard[currentRow][currentCol].isFlagged) continue
      
      newBoard[currentRow][currentCol].isRevealed = true
      
      if (newBoard[currentRow][currentCol].adjacentMines === 0 && !newBoard[currentRow][currentCol].isMine) {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue
            toReveal.push([currentRow + dr, currentCol + dc])
          }
        }
      }
    }
    
    return newBoard
  }, [rows, cols])

  // 处理格子点击
  const handleCellClick = useCallback((row: number, col: number) => {
    if (gameStatus !== 'playing') return
    if (board[row][col].isRevealed || board[row][col].isFlagged) return
    
    let newBoard = board
    
    // 第一次点击时生成地雷
    if (firstClick) {
      newBoard = generateMines(board, row, col)
      setFirstClick(false)
      setStartTime(Date.now())
    }
    
    const cell = newBoard[row][col]
    
    if (cell.isMine) {
      // 游戏结束 - 显示所有地雷
      newBoard = newBoard.map(r => r.map(c => ({
        ...c,
        isRevealed: c.isMine ? true : c.isRevealed
      })))
      setBoard(newBoard)
      setGameStatus('lost')
    } else {
      // 揭示格子
      if (cell.adjacentMines === 0) {
        newBoard = revealEmptyCells(newBoard, row, col)
      } else {
        newBoard = newBoard.map((r, ri) => 
          r.map((c, ci) => ri === row && ci === col ? { ...c, isRevealed: true } : c)
        )
      }
      
      // 计算已揭示的格子数
      const revealed = newBoard.flat().filter(c => c.isRevealed && !c.isMine).length
      setRevealedCount(revealed)
      
      // 检查是否获胜
      if (revealed === rows * cols - mines) {
        setGameStatus('won')
      }
      
      setBoard(newBoard)
    }
  }, [board, firstClick, gameStatus, generateMines, revealEmptyCells, rows, cols, mines])

  // 处理右键点击（标记）
  const handleRightClick = useCallback((e: React.MouseEvent, row: number, col: number) => {
    e.preventDefault()
    
    if (gameStatus !== 'playing') return
    if (board[row][col].isRevealed) return
    
    const newBoard = board.map((r, ri) =>
      r.map((c, ci) => {
        if (ri === row && ci === col) {
          const isFlagged = !c.isFlagged
          return { ...c, isFlagged }
        }
        return c
      })
    )
    
    const flags = newBoard.flat().filter(c => c.isFlagged).length
    setFlagsCount(flags)
    setBoard(newBoard)
  }, [board, gameStatus])

  // 处理长按（移动端标记）
  const handleTouchStart = useCallback((row: number, col: number) => {
    const timer = setTimeout(() => {
      handleRightClick({ preventDefault: () => {} } as any, row, col)
    }, 500)
    setLongPressTimer(timer)
  }, [handleRightClick])

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }
  }, [longPressTimer])

  // 新游戏
  const startNewGame = useCallback((newDifficulty?: Difficulty) => {
    const diff = newDifficulty || difficulty
    if (newDifficulty) setDifficulty(diff)
    
    const { rows: newRows, cols: newCols } = DIFFICULTIES[diff]
    setBoard(Array(newRows).fill(null).map(() =>
      Array(newCols).fill(null).map(() => ({
        isMine: false,
        isRevealed: false,
        isFlagged: false,
        adjacentMines: 0
      }))
    ))
    setGameStatus('playing')
    setFlagsCount(0)
    setRevealedCount(0)
    setStartTime(null)
    setElapsedTime(0)
    setFirstClick(true)
  }, [difficulty])

  // 初始化游戏
  useEffect(() => {
    startNewGame()
  }, [])

  // 计时器
  useEffect(() => {
    if (startTime && gameStatus === 'playing') {
      const interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000))
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [startTime, gameStatus])

  // 格式化时间
  const formatTime = (seconds: number): string => {
    return seconds.toString().padStart(3, '0')
  }

  // 获取格子内容
  const getCellContent = (cell: Cell) => {
    if (cell.isFlagged) return '🚩'
    if (!cell.isRevealed) return ''
    if (cell.isMine) return '💣'
    if (cell.adjacentMines === 0) return ''
    return cell.adjacentMines.toString()
  }

  // 获取格子颜色
  const getCellTextColor = (cell: Cell) => {
    if (!cell.isRevealed || cell.adjacentMines === 0) return ''
    const colors = [
      '', 'text-blue-500', 'text-green-500', 'text-red-500',
      'text-purple-500', 'text-yellow-500', 'text-pink-500',
      'text-gray-300', 'text-gray-100'
    ]
    return colors[cell.adjacentMines] || ''
  }

  // 计算格子大小
  const getCellSize = () => {
    if (typeof window === 'undefined') return 30
    const screenWidth = window.innerWidth
    const screenHeight = window.innerHeight
    const maxWidth = screenWidth - 48
    const maxHeight = screenHeight - 250
    
    if (difficulty === 'easy') {
      return Math.min(40, Math.floor(Math.min(maxWidth / 9, maxHeight / 9)))
    } else if (difficulty === 'medium') {
      return Math.min(30, Math.floor(Math.min(maxWidth / 16, maxHeight / 16)))
    } else {
      return Math.min(25, Math.floor(Math.min(maxWidth / 30, maxHeight / 16)))
    }
  }

  const cellSize = getCellSize()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex flex-col">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-6xl mx-auto flex flex-col min-h-screen p-4"
      >
        {/* 游戏头部 */}
        <div className="bg-gray-800/50 backdrop-blur rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => navigate('/')}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-2xl font-game font-bold text-white">扫雷</h1>
            <button
              onClick={() => startNewGame()}
              className="p-2 text-white hover:text-blue-400 transition-colors"
            >
              <RotateCcw size={20} />
            </button>
          </div>

          {/* 游戏信息 */}
          <div className="flex justify-between items-center">
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Bomb size={18} className="text-red-400" />
                <span className="font-mono text-white text-lg">
                  {mines - flagsCount}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={18} className="text-yellow-400" />
                <span className="font-mono text-white text-lg">
                  {formatTime(elapsedTime)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Trophy size={18} className="text-green-400" />
                <span className="font-mono text-white text-lg">
                  {revealedCount}/{rows * cols - mines}
                </span>
              </div>
            </div>

            {/* 难度选择 */}
            <div className="flex gap-2">
              {(['easy', 'medium', 'hard'] as Difficulty[]).map(level => (
                <button
                  key={level}
                  onClick={() => startNewGame(level)}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    difficulty === level
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'
                  }`}
                >
                  {level === 'easy' ? '简单' : level === 'medium' ? '中等' : '困难'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 游戏区域 */}
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-gray-800 p-2 rounded-lg">
            <div 
              className="grid gap-[1px] bg-gray-600"
              style={{
                gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
                gridTemplateRows: `repeat(${rows}, ${cellSize}px)`
              }}
            >
              {board.map((row, rowIndex) =>
                row.map((cell, colIndex) => (
                  <button
                    key={`${rowIndex}-${colIndex}`}
                    className={`
                      flex items-center justify-center font-bold transition-all
                      ${cell.isRevealed 
                        ? cell.isMine 
                          ? 'bg-red-600' 
                          : 'bg-gray-200'
                        : 'bg-gray-700 hover:bg-gray-600 active:scale-95'
                      }
                      ${cell.isFlagged && !cell.isRevealed ? 'bg-yellow-700' : ''}
                      ${getCellTextColor(cell)}
                    `}
                    style={{
                      width: `${cellSize}px`,
                      height: `${cellSize}px`,
                      fontSize: `${cellSize * 0.5}px`
                    }}
                    onClick={() => handleCellClick(rowIndex, colIndex)}
                    onContextMenu={(e) => handleRightClick(e, rowIndex, colIndex)}
                    onTouchStart={() => handleTouchStart(rowIndex, colIndex)}
                    onTouchEnd={handleTouchEnd}
                    disabled={gameStatus !== 'playing' && !cell.isMine}
                  >
                    {getCellContent(cell)}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 游戏结束提示 */}
        {gameStatus !== 'playing' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 text-center">
              <h2 className="text-3xl font-game font-bold mb-4">
                {gameStatus === 'won' ? (
                  <span className="text-green-400">🎉 胜利!</span>
                ) : (
                  <span className="text-red-400">💣 游戏结束</span>
                )}
              </h2>
              <div className="space-y-2 mb-6">
                <p className="text-white">
                  用时: <span className="text-yellow-400">{formatTime(elapsedTime)} 秒</span>
                </p>
                {gameStatus === 'won' && (
                  <p className="text-white">
                    难度: <span className="text-blue-400">
                      {difficulty === 'easy' ? '简单' : difficulty === 'medium' ? '中等' : '困难'}
                    </span>
                  </p>
                )}
              </div>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => startNewGame()}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  再来一局
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  返回首页
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* 操作提示（桌面端） */}
        <div className="mt-4 text-center text-gray-400 text-sm">
          <p className="hidden sm:block">左键点击揭示 | 右键标记地雷 | 数字表示周围地雷数</p>
          <p className="sm:hidden">点击揭示 | 长按标记地雷</p>
        </div>
      </motion.div>
    </div>
  )
}

export default MinesweeperGame