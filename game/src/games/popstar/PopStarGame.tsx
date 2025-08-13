import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, RotateCcw, Trophy, Star, Sparkles } from 'lucide-react'

// 游戏配置
const BOARD_SIZE = 10
const COLORS = [
  'bg-red-500',
  'bg-blue-500',
  'bg-green-500',
  'bg-yellow-500',
  'bg-purple-500'
]

const COLOR_GRADIENTS: Record<string, string> = {
  'bg-red-500': 'from-red-400 to-red-600',
  'bg-blue-500': 'from-blue-400 to-blue-600',
  'bg-green-500': 'from-green-400 to-green-600',
  'bg-yellow-500': 'from-yellow-400 to-yellow-600',
  'bg-purple-500': 'from-purple-400 to-purple-600'
}

type Cell = {
  id: string
  color: string | null
  isSelected: boolean
  willBeRemoved: boolean
}

type Board = Cell[][]

const PopStarGame = () => {
  const navigate = useNavigate()
  const [board, setBoard] = useState<Board>([])
  const [score, setScore] = useState(0)
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set())
  const [gameOver, setGameOver] = useState(false)
  const [showScore, setShowScore] = useState<{ value: number; position: { x: number; y: number } } | null>(null)
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('popstar-high-score')
    return saved ? parseInt(saved) : 0
  })
  const [moves, setMoves] = useState(0)
  const [remainingStars, setRemainingStars] = useState(BOARD_SIZE * BOARD_SIZE)

  // 初始化棋盘
  const initBoard = useCallback(() => {
    const newBoard: Board = []
    for (let i = 0; i < BOARD_SIZE; i++) {
      const row: Cell[] = []
      for (let j = 0; j < BOARD_SIZE; j++) {
        row.push({
          id: `${i}-${j}`,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          isSelected: false,
          willBeRemoved: false
        })
      }
      newBoard.push(row)
    }
    return newBoard
  }, [])

  // 初始化游戏
  const initGame = () => {
    setBoard(initBoard())
    setScore(0)
    setSelectedCells(new Set())
    setGameOver(false)
    setMoves(0)
    setRemainingStars(BOARD_SIZE * BOARD_SIZE)
    setShowScore(null)
  }

  // 获取相邻的同色方块
  const getConnectedCells = (board: Board, row: number, col: number, color: string): Set<string> => {
    const connected = new Set<string>()
    const stack = [[row, col]]
    const visited = new Set<string>()

    while (stack.length > 0) {
      const [r, c] = stack.pop()!
      const key = `${r}-${c}`
      
      if (visited.has(key)) continue
      visited.add(key)

      if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) continue
      if (!board[r][c].color || board[r][c].color !== color) continue

      connected.add(key)

      // 检查上下左右
      stack.push([r - 1, c])
      stack.push([r + 1, c])
      stack.push([r, c - 1])
      stack.push([r, c + 1])
    }

    return connected
  }

  // 处理点击
  const handleCellClick = (row: number, col: number, event: React.MouseEvent) => {
    if (gameOver) return
    
    const cell = board[row][col]
    if (!cell.color) return

    const connected = getConnectedCells(board, row, col, cell.color)
    
    // 如果已经选中了这些方块，则消除它们
    if (selectedCells.size > 0 && selectedCells.has(`${row}-${col}`)) {
      if (connected.size >= 2) {
        removeSelectedCells(connected, event)
      }
    } else {
      // 否则选中新的方块组
      if (connected.size >= 2) {
        setSelectedCells(connected)
        updateBoardSelection(connected)
      } else {
        // 单个方块，清除选择
        setSelectedCells(new Set())
        updateBoardSelection(new Set())
      }
    }
  }

  // 更新棋盘选择状态
  const updateBoardSelection = (selected: Set<string>) => {
    setBoard(prevBoard => 
      prevBoard.map((row, i) =>
        row.map((cell, j) => ({
          ...cell,
          isSelected: selected.has(`${i}-${j}`)
        }))
      )
    )
  }

  // 移除选中的方块
  const removeSelectedCells = (cells: Set<string>, event: React.MouseEvent) => {
    const cellCount = cells.size
    const points = calculateScore(cellCount)
    
    // 显示得分动画
    const rect = (event.target as HTMLElement).getBoundingClientRect()
    setShowScore({
      value: points,
      position: { x: rect.left + rect.width / 2, y: rect.top }
    })
    
    setTimeout(() => setShowScore(null), 1000)

    // 标记要移除的方块
    const newBoard = board.map((row, i) =>
      row.map((cell, j) => ({
        ...cell,
        willBeRemoved: cells.has(`${i}-${j}`)
      }))
    )
    setBoard(newBoard)

    // 延迟后执行移除和下落
    setTimeout(() => {
      applyGravity(cells)
      setScore(prev => prev + points)
      setMoves(prev => prev + 1)
      setRemainingStars(prev => prev - cellCount)
      setSelectedCells(new Set())
    }, 300)
  }

  // 计算得分
  const calculateScore = (count: number): number => {
    return count * count * 5
  }

  // 应用重力效果
  const applyGravity = (removedCells: Set<string>) => {
    setBoard(prevBoard => {
      const newBoard = prevBoard.map(row => [...row])
      
      // 将要移除的方块设为null
      removedCells.forEach(key => {
        const [row, col] = key.split('-').map(Number)
        newBoard[row][col] = { ...newBoard[row][col], color: null, willBeRemoved: false }
      })

      // 垂直下落
      for (let col = 0; col < BOARD_SIZE; col++) {
        let writePos = BOARD_SIZE - 1
        for (let row = BOARD_SIZE - 1; row >= 0; row--) {
          if (newBoard[row][col].color !== null) {
            if (row !== writePos) {
              newBoard[writePos][col] = newBoard[row][col]
              newBoard[row][col] = { ...newBoard[row][col], color: null }
            }
            writePos--
          }
        }
      }

      // 水平移动（将空列向左移动）
      let writeCol = 0
      for (let col = 0; col < BOARD_SIZE; col++) {
        // 检查这一列是否为空
        const isEmpty = newBoard.every(row => row[col].color === null)
        
        if (!isEmpty) {
          if (col !== writeCol) {
            for (let row = 0; row < BOARD_SIZE; row++) {
              newBoard[row][writeCol] = newBoard[row][col]
              newBoard[row][col] = { ...newBoard[row][col], color: null }
            }
          }
          writeCol++
        }
      }

      return newBoard.map((row) =>
        row.map((cell) => ({
          ...cell,
          isSelected: false
        }))
      )
    })
  }

  // 检查游戏是否结束
  const checkGameOver = () => {
    for (let i = 0; i < BOARD_SIZE; i++) {
      for (let j = 0; j < BOARD_SIZE; j++) {
        const cellColor = board[i][j].color
        if (cellColor) {
          const connected = getConnectedCells(board, i, j, cellColor)
          if (connected.size >= 2) {
            return false
          }
        }
      }
    }
    return true
  }

  // 计算奖励分数
  const calculateBonus = (): number => {
    if (remainingStars === 0) return 2000
    if (remainingStars <= 5) return 1000
    if (remainingStars <= 10) return 500
    return 0
  }

  useEffect(() => {
    initGame()
  }, [])

  useEffect(() => {
    if (board.length > 0) {
      const isOver = checkGameOver()
      if (isOver && !gameOver) {
        const bonus = calculateBonus()
        const finalScore = score + bonus
        setScore(finalScore)
        setGameOver(true)
        
        if (finalScore > highScore) {
          setHighScore(finalScore)
          localStorage.setItem('popstar-high-score', finalScore.toString())
        }
      }
    }
  }, [board, score, gameOver, highScore, remainingStars])

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4">
      {/* 游戏头部 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md mb-4"
      >
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
            消灭星星
          </h1>
          
          <button
            onClick={initGame}
            className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>

        {/* 游戏统计 */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="bg-gray-800 rounded-lg p-2 text-center">
            <div className="text-xs text-gray-400">得分</div>
            <div className="text-lg font-bold text-yellow-400">{score}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-2 text-center">
            <div className="text-xs text-gray-400">最高分</div>
            <div className="text-lg font-bold text-purple-400">{highScore}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-2 text-center">
            <div className="text-xs text-gray-400">步数</div>
            <div className="text-lg font-bold text-blue-400">{moves}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-2 text-center">
            <div className="text-xs text-gray-400">剩余</div>
            <div className="text-lg font-bold text-green-400">{remainingStars}</div>
          </div>
        </div>

        {/* 选中提示 */}
        {selectedCells.size > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-800 rounded-lg p-2 mb-2 text-center"
          >
            <span className="text-sm text-gray-400">选中 </span>
            <span className="text-lg font-bold text-yellow-400">{selectedCells.size}</span>
            <span className="text-sm text-gray-400"> 个方块，得分 </span>
            <span className="text-lg font-bold text-green-400">{calculateScore(selectedCells.size)}</span>
          </motion.div>
        )}
      </motion.div>

      {/* 游戏棋盘 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-gray-800 p-2 rounded-lg"
      >
        <div className="grid grid-cols-10 gap-1" style={{ width: 'min(90vw, 400px)' }}>
          {board.map((row, i) =>
            row.map((cell, j) => (
              <motion.button
                key={`${i}-${j}`}
                initial={false}
                animate={{
                  scale: cell.isSelected ? 1.1 : 1,
                  opacity: cell.willBeRemoved ? 0 : cell.color ? 1 : 0,
                }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 20
                }}
                className={`
                  aspect-square rounded-md relative
                  ${cell.color ? `bg-gradient-to-br ${COLOR_GRADIENTS[cell.color]}` : 'bg-transparent'}
                  ${cell.isSelected ? 'ring-2 ring-white ring-opacity-70' : ''}
                  ${cell.color ? 'cursor-pointer hover:brightness-110' : 'cursor-default'}
                  transition-all duration-200
                `}
                onClick={(e) => handleCellClick(i, j, e)}
                style={{
                  width: 'calc((min(90vw, 400px) - 36px) / 10)',
                  height: 'calc((min(90vw, 400px) - 36px) / 10)',
                }}
              >
                {cell.color && (
                  <Star 
                    className="w-full h-full p-1 text-white opacity-50"
                    fill="currentColor"
                  />
                )}
                {cell.isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <Sparkles className="w-4 h-4 text-white" />
                  </motion.div>
                )}
              </motion.button>
            ))
          )}
        </div>
      </motion.div>

      {/* 得分动画 */}
      <AnimatePresence>
        {showScore && (
          <motion.div
            initial={{ opacity: 0, y: 0, scale: 0.5 }}
            animate={{ opacity: 1, y: -50, scale: 1 }}
            exit={{ opacity: 0, y: -100 }}
            className="fixed pointer-events-none z-50"
            style={{
              left: showScore.position.x,
              top: showScore.position.y,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div className="text-3xl font-bold text-yellow-400 drop-shadow-lg">
              +{showScore.value}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 游戏结束弹窗 */}
      <AnimatePresence>
        {gameOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-gray-800 rounded-lg p-6 max-w-sm w-full"
            >
              <div className="text-center">
                <Trophy className="w-16 h-16 mx-auto mb-4 text-yellow-400" />
                <h2 className="text-2xl font-bold mb-2">游戏结束!</h2>
                
                {remainingStars === 0 && (
                  <div className="text-yellow-400 mb-2">
                    完美通关！奖励 2000 分！
                  </div>
                )}
                
                <div className="space-y-2 mb-4">
                  <div className="text-lg">
                    最终得分: <span className="text-yellow-400 font-bold">{score}</span>
                  </div>
                  <div className="text-lg">
                    步数: <span className="text-blue-400 font-bold">{moves}</span>
                  </div>
                  <div className="text-lg">
                    剩余星星: <span className="text-green-400 font-bold">{remainingStars}</span>
                  </div>
                  {score > highScore && (
                    <div className="text-purple-400 font-bold">
                      🎉 新纪录！
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={initGame}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:brightness-110 transition-all"
                  >
                    再玩一次
                  </button>
                  <button
                    onClick={() => navigate('/')}
                    className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-all"
                  >
                    返回首页
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default PopStarGame