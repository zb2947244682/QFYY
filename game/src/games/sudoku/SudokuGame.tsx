import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, RotateCcw, AlertCircle, Lightbulb, Eraser } from 'lucide-react'

type Cell = {
  value: number | null
  isFixed: boolean
  isError: boolean
  notes: number[]
}

type Board = Cell[][]
type Difficulty = 'easy' | 'medium' | 'hard'

// 简化的数独谜题生成
const generatePuzzle = (difficulty: Difficulty): Board => {
  // 完整的数独解决方案（示例）
  const solution = [
    [5,3,4,6,7,8,9,1,2],
    [6,7,2,1,9,5,3,4,8],
    [1,9,8,3,4,2,5,6,7],
    [8,5,9,7,6,1,4,2,3],
    [4,2,6,8,5,3,7,9,1],
    [7,1,3,9,2,4,8,5,6],
    [9,6,1,5,3,7,2,8,4],
    [2,8,7,4,1,9,6,3,5],
    [3,4,5,2,8,6,1,7,9]
  ]
  
  // 根据难度删除不同数量的数字
  const cellsToRemove = difficulty === 'easy' ? 30 : difficulty === 'medium' ? 40 : 50
  
  const board: Board = solution.map(row => 
    row.map(value => ({
      value,
      isFixed: true,
      isError: false,
      notes: []
    }))
  )
  
  // 随机删除数字
  let removed = 0
  while (removed < cellsToRemove) {
    const row = Math.floor(Math.random() * 9)
    const col = Math.floor(Math.random() * 9)
    if (board[row][col].value !== null) {
      board[row][col] = {
        value: null,
        isFixed: false,
        isError: false,
        notes: []
      }
      removed++
    }
  }
  
  return board
}

const SudokuGame = () => {
  const navigate = useNavigate()
  const [board, setBoard] = useState<Board>(() => generatePuzzle('easy'))
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null)
  const [difficulty, setDifficulty] = useState<Difficulty>('easy')
  const [mistakes, setMistakes] = useState(0)
  const [hints, setHints] = useState(3)
  const [noteMode, setNoteMode] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [startTime] = useState(Date.now())
  const [elapsedTime, setElapsedTime] = useState(0)

  // 检查数字是否有效
  const isValidMove = (board: Board, row: number, col: number, num: number): boolean => {
    // 检查行
    for (let x = 0; x < 9; x++) {
      if (x !== col && board[row][x].value === num) {
        return false
      }
    }
    
    // 检查列
    for (let x = 0; x < 9; x++) {
      if (x !== row && board[x][col].value === num) {
        return false
      }
    }
    
    // 检查3x3方格
    const boxRow = Math.floor(row / 3) * 3
    const boxCol = Math.floor(col / 3) * 3
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (boxRow + i !== row || boxCol + j !== col) {
          if (board[boxRow + i][boxCol + j].value === num) {
            return false
          }
        }
      }
    }
    
    return true
  }

  // 处理数字输入
  const handleNumberInput = (num: number) => {
    if (!selectedCell || board[selectedCell.row][selectedCell.col].isFixed) return
    
    const newBoard = board.map(row => row.map(cell => ({ ...cell })))
    const cell = newBoard[selectedCell.row][selectedCell.col]
    
    if (noteMode) {
      // 笔记模式
      if (cell.notes.includes(num)) {
        cell.notes = cell.notes.filter(n => n !== num)
      } else {
        cell.notes.push(num)
      }
      cell.value = null
    } else {
      // 普通模式
      const isValid = isValidMove(newBoard, selectedCell.row, selectedCell.col, num)
      cell.value = num
      cell.notes = []
      cell.isError = !isValid
      
      if (!isValid) {
        setMistakes(mistakes + 1)
      }
    }
    
    setBoard(newBoard)
    checkCompletion(newBoard)
  }

  // 清除选中格子
  const handleClear = () => {
    if (!selectedCell || board[selectedCell.row][selectedCell.col].isFixed) return
    
    const newBoard = board.map(row => row.map(cell => ({ ...cell })))
    newBoard[selectedCell.row][selectedCell.col] = {
      value: null,
      isFixed: false,
      isError: false,
      notes: []
    }
    
    setBoard(newBoard)
  }

  // 使用提示
  const handleHint = () => {
    if (hints <= 0 || !selectedCell || board[selectedCell.row][selectedCell.col].isFixed) return
    
    // 简单的提示：填入正确答案
    const solution = [
      [5,3,4,6,7,8,9,1,2],
      [6,7,2,1,9,5,3,4,8],
      [1,9,8,3,4,2,5,6,7],
      [8,5,9,7,6,1,4,2,3],
      [4,2,6,8,5,3,7,9,1],
      [7,1,3,9,2,4,8,5,6],
      [9,6,1,5,3,7,2,8,4],
      [2,8,7,4,1,9,6,3,5],
      [3,4,5,2,8,6,1,7,9]
    ]
    
    const newBoard = board.map(row => row.map(cell => ({ ...cell })))
    newBoard[selectedCell.row][selectedCell.col] = {
      value: solution[selectedCell.row][selectedCell.col],
      isFixed: false,
      isError: false,
      notes: []
    }
    
    setBoard(newBoard)
    setHints(hints - 1)
    checkCompletion(newBoard)
  }

  // 检查游戏是否完成
  const checkCompletion = (board: Board) => {
    const isComplete = board.every((row, i) => 
      row.every((cell, j) => 
        cell.value !== null && !cell.isError && isValidMove(board, i, j, cell.value)
      )
    )
    
    if (isComplete) {
      setCompleted(true)
    }
  }

  // 新游戏
  const newGame = (newDifficulty?: Difficulty) => {
    const diff = newDifficulty || difficulty
    setBoard(generatePuzzle(diff))
    setSelectedCell(null)
    setMistakes(0)
    setHints(3)
    setNoteMode(false)
    setCompleted(false)
    if (newDifficulty) {
      setDifficulty(newDifficulty)
    }
  }

  // 计时器
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)
    
    return () => clearInterval(interval)
  }, [startTime])

  // 格式化时间
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // 获取单元格大小（根据屏幕尺寸自适应）
  const getCellSize = () => {
    if (typeof window !== 'undefined') {
      const screenWidth = window.innerWidth
      const screenHeight = window.innerHeight
      const isMobile = screenWidth < 768
      
      if (isMobile) {
        // 移动端优化：更小的格子，留出更多空间给控制按钮
        const maxBoardSize = Math.min(screenWidth - 32, screenHeight * 0.35, 320)
        return Math.floor(maxBoardSize / 9)
      } else {
        // 桌面端：较大的格子
        const maxBoardSize = Math.min(screenWidth - 40, screenHeight * 0.5, 450)
        return Math.floor(maxBoardSize / 9)
      }
    }
    return 40
  }

  const [cellSize, setCellSize] = useState(getCellSize())

  useEffect(() => {
    const handleResize = () => {
      setCellSize(getCellSize())
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-900 to-gray-900 flex flex-col">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg mx-auto flex flex-col min-h-screen px-2 py-2"
      >
        {/* 游戏头部 - 精简版 */}
        <div className="bg-gray-800/50 backdrop-blur rounded-xl p-2 sm:p-3 mb-2">
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <button
              onClick={() => navigate('/')}
              className="p-1.5 sm:p-2 text-gray-400 hover:text-white"
            >
              <ArrowLeft size={18} className="sm:w-5 sm:h-5" />
            </button>
            <h1 className="text-lg sm:text-xl font-game font-bold text-white">数独</h1>
            <button
              onClick={() => newGame()}
              className="p-1.5 sm:p-2 text-white"
            >
              <RotateCcw size={16} className="sm:w-[18px] sm:h-[18px]" />
            </button>
          </div>

          {/* 游戏信息 - 精简 */}
          <div className="flex justify-between text-xs sm:text-sm">
            <div className="flex items-center gap-2 sm:gap-4">
              <span className="text-gray-400">{formatTime(elapsedTime)}</span>
              <span className="text-red-400 flex items-center gap-0.5 sm:gap-1">
                <AlertCircle size={12} className="sm:w-[14px] sm:h-[14px]" />
                {mistakes}
              </span>
              <span className="text-yellow-400 flex items-center gap-0.5 sm:gap-1">
                <Lightbulb size={12} className="sm:w-[14px] sm:h-[14px]" />
                {hints}
              </span>
            </div>
            <div className="flex gap-0.5 sm:gap-1">
              {(['easy', 'medium', 'hard'] as Difficulty[]).map(level => (
                <button
                  key={level}
                  onClick={() => newGame(level)}
                  className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs ${
                    difficulty === level
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  {level === 'easy' ? '易' : level === 'medium' ? '中' : '难'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 游戏区域 - 调整布局以适应移动端 */}
        <div className="flex-1 flex flex-col items-center justify-start">
          {/* 数独棋盘 */}
          <div className="bg-gray-800 p-0.5 sm:p-1 rounded-lg mb-2 sm:mb-3">
            <div 
              className="grid grid-cols-9"
              style={{
                width: `${cellSize * 9 + 8}px`,
                height: `${cellSize * 9 + 8}px`,
                gap: '0'
              }}
            >
              {board.map((row, rowIndex) => 
                row.map((cell, colIndex) => (
                  <button
                    key={`${rowIndex}-${colIndex}`}
                    onClick={() => setSelectedCell({ row: rowIndex, col: colIndex })}
                    className={`
                      flex items-center justify-center relative transition-all
                      ${cell.isFixed ? 'bg-gray-700' : 'bg-gray-900 active:scale-95'}
                      ${selectedCell?.row === rowIndex && selectedCell?.col === colIndex ? 'bg-blue-800 ring-1 sm:ring-2 ring-blue-400 z-10' : ''}
                      ${cell.isError ? 'bg-red-900/50' : ''}
                    `}
                    style={{
                      width: `${cellSize}px`,
                      height: `${cellSize}px`,
                      borderRight: colIndex % 3 === 2 && colIndex < 8 ? '2px solid #4B5563' : colIndex < 8 ? '1px solid #1F2937' : 'none',
                      borderBottom: rowIndex % 3 === 2 && rowIndex < 8 ? '2px solid #4B5563' : rowIndex < 8 ? '1px solid #1F2937' : 'none',
                      borderTop: rowIndex === 0 ? '1px solid #1F2937' : 'none',
                      borderLeft: colIndex === 0 ? '1px solid #1F2937' : 'none'
                    }}
                    disabled={completed}
                  >
                    {cell.value ? (
                      <span className={`
                        font-bold
                        ${cell.isFixed ? 'text-gray-400' : cell.isError ? 'text-red-400' : 'text-white'}
                      `}
                      style={{ fontSize: `${cellSize * 0.5}px` }}
                      >
                        {cell.value}
                      </span>
                    ) : (
                      <div className="grid grid-cols-3 gap-0 p-0.5">
                        {[1,2,3,4,5,6,7,8,9].map(n => (
                          <span 
                            key={n} 
                            className="text-blue-400 leading-none"
                            style={{ fontSize: `${cellSize * 0.2}px` }}
                          >
                            {cell.notes.includes(n) ? n : ''}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* 控制面板 - 优化移动端布局 */}
          <div className="w-full max-w-sm px-2">
            {/* 数字按钮 - 调整为两行布局 */}
            <div className="mb-2">
              <div className="grid grid-cols-5 gap-1 mb-1">
                {[1,2,3,4,5].map(num => (
                  <button
                    key={num}
                    onClick={() => handleNumberInput(num)}
                    className="h-10 sm:h-12 bg-gray-700 hover:bg-gray-600 active:scale-95 text-white font-bold rounded-lg transition-all text-sm sm:text-base"
                    disabled={completed}
                  >
                    {num}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-1">
                {[6,7,8,9].map(num => (
                  <button
                    key={num}
                    onClick={() => handleNumberInput(num)}
                    className="h-10 sm:h-12 bg-gray-700 hover:bg-gray-600 active:scale-95 text-white font-bold rounded-lg transition-all text-sm sm:text-base"
                    disabled={completed}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* 功能按钮 */}
            <div className="grid grid-cols-3 gap-1">
              <button
                onClick={() => setNoteMode(!noteMode)}
                className={`h-10 sm:h-12 ${
                  noteMode ? 'bg-blue-600' : 'bg-gray-700'
                } text-white rounded-lg transition-all active:scale-95 text-xs sm:text-sm`}
                disabled={completed}
              >
                笔记
              </button>
              
              <button
                onClick={handleClear}
                className="h-10 sm:h-12 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all active:scale-95 flex items-center justify-center"
                disabled={completed}
              >
                <Eraser size={16} className="sm:w-4 sm:h-4" />
              </button>
              
              <button
                onClick={handleHint}
                className="h-10 sm:h-12 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-all active:scale-95 text-xs sm:text-sm"
                disabled={completed || hints <= 0}
              >
                提示
              </button>
            </div>
          </div>
        </div>

        {/* 完成提示 */}
        {completed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 text-center">
              <h2 className="text-2xl font-game font-bold text-green-400 mb-3">🎉 完成!</h2>
              <div className="space-y-1 mb-4">
                <p className="text-white text-sm">
                  用时: <span className="text-yellow-400">{formatTime(elapsedTime)}</span>
                </p>
                <p className="text-white text-sm">
                  错误: <span className="text-yellow-400">{mistakes}</span>
                </p>
              </div>
              <button
                onClick={() => newGame()}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                新游戏
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}

export default SudokuGame