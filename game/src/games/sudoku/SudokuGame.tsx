import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, RotateCcw, AlertCircle, CheckCircle, Lightbulb, Eraser } from 'lucide-react'

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

  // 键盘输入
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key >= '1' && e.key <= '9') {
        handleNumberInput(parseInt(e.key))
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        handleClear()
      } else if (e.key === 'n' || e.key === 'N') {
        setNoteMode(!noteMode)
      }
    }
    
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [selectedCell, noteMode])

  // 格式化时间
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-900 to-gray-900 flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl"
      >
        {/* 游戏头部 */}
        <div className="bg-gray-800/50 backdrop-blur rounded-t-xl p-4 border-t border-l border-r border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="font-game">返回</span>
            </button>
            <h1 className="text-2xl font-game font-bold text-white">数独</h1>
            <button
              onClick={() => newGame()}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              <RotateCcw size={16} />
              <span className="font-game">新游戏</span>
            </button>
          </div>

          {/* 难度选择 */}
          <div className="flex justify-center gap-2 mb-4">
            {(['easy', 'medium', 'hard'] as Difficulty[]).map(level => (
              <button
                key={level}
                onClick={() => newGame(level)}
                className={`px-4 py-2 rounded-lg font-game transition-all ${
                  difficulty === level
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'
                }`}
              >
                {level === 'easy' ? '简单' : level === 'medium' ? '中等' : '困难'}
              </button>
            ))}
          </div>

          {/* 游戏信息 */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-700/50 rounded-lg p-3 text-center">
              <div className="text-gray-400 text-sm font-game">时间</div>
              <div className="text-xl font-bold text-white font-game">{formatTime(elapsedTime)}</div>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-3 text-center">
              <div className="text-gray-400 text-sm font-game flex items-center justify-center gap-1">
                <AlertCircle size={14} />
                错误
              </div>
              <div className="text-xl font-bold text-red-400 font-game">{mistakes}</div>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-3 text-center">
              <div className="text-gray-400 text-sm font-game flex items-center justify-center gap-1">
                <Lightbulb size={14} />
                提示
              </div>
              <div className="text-xl font-bold text-yellow-400 font-game">{hints}</div>
            </div>
          </div>
        </div>

        {/* 游戏区域 */}
        <div className="bg-gray-900 border border-gray-700 p-6 rounded-b-xl">
          <div className="flex flex-col lg:flex-row gap-6 items-center justify-center">
            {/* 数独棋盘 */}
            <div className="bg-gray-800 p-2 rounded-lg">
              <div className="grid grid-cols-9 gap-0">
                {board.map((row, rowIndex) => 
                  row.map((cell, colIndex) => (
                    <button
                      key={`${rowIndex}-${colIndex}`}
                      onClick={() => setSelectedCell({ row: rowIndex, col: colIndex })}
                      className={`
                        w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center relative
                        ${cell.isFixed ? 'bg-gray-700' : 'bg-gray-900 hover:bg-gray-800'}
                        ${selectedCell?.row === rowIndex && selectedCell?.col === colIndex ? 'bg-blue-900' : ''}
                        ${cell.isError ? 'bg-red-900/50' : ''}
                        ${colIndex % 3 === 2 && colIndex < 8 ? 'border-r-2 border-gray-600' : 'border-r border-gray-700'}
                        ${rowIndex % 3 === 2 && rowIndex < 8 ? 'border-b-2 border-gray-600' : 'border-b border-gray-700'}
                        transition-colors
                      `}
                      disabled={completed}
                    >
                      {cell.value ? (
                        <span className={`
                          text-lg sm:text-xl font-bold
                          ${cell.isFixed ? 'text-gray-400' : cell.isError ? 'text-red-400' : 'text-white'}
                        `}>
                          {cell.value}
                        </span>
                      ) : (
                        <div className="grid grid-cols-3 gap-0 text-xs text-blue-400">
                          {[1,2,3,4,5,6,7,8,9].map(n => (
                            <span key={n} className="text-[8px]">
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

            {/* 控制面板 */}
            <div className="space-y-4">
              {/* 数字按钮 */}
              <div className="grid grid-cols-3 gap-2">
                {[1,2,3,4,5,6,7,8,9].map(num => (
                  <button
                    key={num}
                    onClick={() => handleNumberInput(num)}
                    className="w-14 h-14 bg-gray-700 hover:bg-gray-600 text-white text-xl font-bold rounded-lg transition-colors"
                    disabled={completed}
                  >
                    {num}
                  </button>
                ))}
              </div>

              {/* 功能按钮 */}
              <div className="space-y-2">
                <button
                  onClick={() => setNoteMode(!noteMode)}
                  className={`w-full p-3 ${
                    noteMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-700 hover:bg-gray-600'
                  } text-white rounded-lg transition-colors flex items-center justify-center gap-2`}
                  disabled={completed}
                >
                  <span className="font-game">笔记模式</span>
                  {noteMode && <CheckCircle size={16} />}
                </button>
                
                <button
                  onClick={handleClear}
                  className="w-full p-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                  disabled={completed}
                >
                  <Eraser size={16} />
                  <span className="font-game">清除</span>
                </button>
                
                <button
                  onClick={handleHint}
                  className="w-full p-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                  disabled={completed || hints <= 0}
                >
                  <Lightbulb size={16} />
                  <span className="font-game">提示 ({hints})</span>
                </button>
              </div>
            </div>
          </div>

          {/* 完成提示 */}
          {completed && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
            >
              <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 text-center">
                <h2 className="text-3xl font-game font-bold text-green-400 mb-4">🎉 完成!</h2>
                <div className="space-y-2 mb-6">
                  <p className="text-white font-game">
                    用时: <span className="text-yellow-400">{formatTime(elapsedTime)}</span>
                  </p>
                  <p className="text-white font-game">
                    错误: <span className="text-yellow-400">{mistakes}</span>
                  </p>
                </div>
                <button
                  onClick={() => newGame()}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-game rounded-lg transition-colors"
                >
                  新游戏
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default SudokuGame