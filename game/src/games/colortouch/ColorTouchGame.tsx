import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, RotateCcw, Trophy, Target, Sparkles } from 'lucide-react'

type Cell = {
  color: string
  id: number
}

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#FFD93D']
const GRID_SIZE = 8
const MIN_GROUP_SIZE = 2

const ColorTouchGame = () => {
  const navigate = useNavigate()
  const [grid, setGrid] = useState<(Cell | null)[][]>([])
  const [score, setScore] = useState(0)
  const [moves, setMoves] = useState(0)
  const [targetScore, setTargetScore] = useState(1000)
  const [level, setLevel] = useState(1)
  const [gameOver, setGameOver] = useState(false)
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set())
  const [combo, setCombo] = useState(0)
  const [showCombo, setShowCombo] = useState(false)
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('colortouch-high-score')
    return saved ? parseInt(saved) : 0
  })
  const nextId = useRef(0)

  // 初始化网格
  const initializeGrid = useCallback(() => {
    const newGrid: Cell[][] = []
    for (let row = 0; row < GRID_SIZE; row++) {
      newGrid[row] = []
      for (let col = 0; col < GRID_SIZE; col++) {
        newGrid[row][col] = {
          color: COLORS[Math.floor(Math.random() * Math.min(3 + Math.floor(level / 2), COLORS.length))],
          id: nextId.current++
        }
      }
    }
    return newGrid
  }, [level])

  // 初始化游戏
  const initGame = useCallback(() => {
    setGrid(initializeGrid())
    setScore(0)
    setMoves(0)
    setTargetScore(1000 * level)
    setGameOver(false)
    setSelectedCells(new Set())
    setCombo(0)
  }, [initializeGrid, level])

  useEffect(() => {
    initGame()
  }, [initGame])

  // 查找相连的同色方块
  const findConnectedCells = useCallback((row: number, col: number, color: string, visited: Set<string>): string[] => {
    const key = `${row}-${col}`
    if (
      row < 0 || row >= GRID_SIZE ||
      col < 0 || col >= GRID_SIZE ||
      visited.has(key) ||
      !grid[row]?.[col] ||
      grid[row][col]?.color !== color
    ) {
      return []
    }

    visited.add(key)
    const result = [key]

    // 检查四个方向
    result.push(...findConnectedCells(row - 1, col, color, visited))
    result.push(...findConnectedCells(row + 1, col, color, visited))
    result.push(...findConnectedCells(row, col - 1, color, visited))
    result.push(...findConnectedCells(row, col + 1, color, visited))

    return result
  }, [grid])

  // 处理方块点击
  const handleCellClick = useCallback((row: number, col: number) => {
    if (gameOver || !grid[row]?.[col]) return

    const color = grid[row][col]!.color
    const visited = new Set<string>()
    const connected = findConnectedCells(row, col, color, visited)

    if (connected.length >= MIN_GROUP_SIZE) {
      // 显示选中效果
      setSelectedCells(new Set(connected))
      
      // 延迟后执行消除
      setTimeout(() => {
        const newGrid = grid.map(row => [...row])
        
        // 标记要消除的方块
        connected.forEach(key => {
          const [r, c] = key.split('-').map(Number)
          newGrid[r][c] = null
        })

        // 计算得分
        const points = connected.length * connected.length * 10
        setScore(prev => prev + points)
        setMoves(prev => prev + 1)

        // 更新连击
        if (connected.length >= 5) {
          setCombo(prev => prev + 1)
          setShowCombo(true)
          setTimeout(() => setShowCombo(false), 1000)
        }

        // 方块下落
        for (let col = 0; col < GRID_SIZE; col++) {
          const column: (Cell | null)[] = []
          for (let row = GRID_SIZE - 1; row >= 0; row--) {
            if (newGrid[row][col]) {
              column.push(newGrid[row][col])
            }
          }
          
          // 填充新方块
          while (column.length < GRID_SIZE) {
            column.push({
              color: COLORS[Math.floor(Math.random() * Math.min(3 + Math.floor(level / 2), COLORS.length))],
              id: nextId.current++
            })
          }
          
          // 更新列
          for (let row = 0; row < GRID_SIZE; row++) {
            newGrid[GRID_SIZE - 1 - row][col] = column[row]
          }
        }

        setGrid(newGrid)
        setSelectedCells(new Set())

        // 检查游戏状态
        checkGameState(newGrid)
      }, 300)
    }
  }, [grid, gameOver, findConnectedCells, level])

  // 检查游戏状态
  const checkGameState = useCallback((currentGrid: (Cell | null)[][]) => {
    // 检查是否达到目标分数
    if (score >= targetScore) {
      setLevel(prev => prev + 1)
      setTargetScore(prev => prev + 1000)
      return
    }

    // 检查是否还有可消除的方块
    let hasValidMove = false
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        if (currentGrid[row]?.[col]) {
          const color = currentGrid[row][col]!.color
          const visited = new Set<string>()
          const connected = findConnectedCells(row, col, color, visited)
          if (connected.length >= MIN_GROUP_SIZE) {
            hasValidMove = true
            break
          }
        }
      }
      if (hasValidMove) break
    }

    if (!hasValidMove) {
      setGameOver(true)
      if (score > highScore) {
        setHighScore(score)
        localStorage.setItem('colortouch-high-score', score.toString())
      }
    }
  }, [score, targetScore, highScore, findConnectedCells])

  // 重新开始游戏
  const resetGame = () => {
    setLevel(1)
    initGame()
  }

  // 提示功能
  const showHint = useCallback(() => {
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        if (grid[row]?.[col]) {
          const color = grid[row][col]!.color
          const visited = new Set<string>()
          const connected = findConnectedCells(row, col, color, visited)
          if (connected.length >= MIN_GROUP_SIZE) {
            setSelectedCells(new Set(connected))
            setTimeout(() => setSelectedCells(new Set()), 1000)
            return
          }
        }
      }
    }
  }, [grid, findConnectedCells])

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-800 to-orange-700 flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* 游戏头部 */}
        <div className="bg-white/10 backdrop-blur-md rounded-t-2xl p-4 border-t border-l border-r border-white/20">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="font-game">返回</span>
            </button>
            <h1 className="text-2xl font-game font-bold text-white">颜色消消乐</h1>
            <button
              onClick={resetGame}
              className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
            >
              <RotateCcw size={18} />
            </button>
          </div>

          {/* 分数和关卡信息 */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white/10 rounded-lg p-2 text-center">
              <div className="text-white/60 text-xs font-game">得分</div>
              <div className="text-xl font-bold text-white font-game">{score}</div>
            </div>
            <div className="bg-white/10 rounded-lg p-2 text-center">
              <div className="text-white/60 text-xs font-game flex items-center justify-center gap-1">
                <Target size={10} />
                目标
              </div>
              <div className="text-xl font-bold text-yellow-300 font-game">{targetScore}</div>
            </div>
            <div className="bg-white/10 rounded-lg p-2 text-center">
              <div className="text-white/60 text-xs font-game flex items-center justify-center gap-1">
                <Trophy size={10} />
                最高
              </div>
              <div className="text-xl font-bold text-orange-300 font-game">{highScore}</div>
            </div>
          </div>

          {/* 进度条 */}
          <div className="mt-3">
            <div className="bg-white/10 rounded-full h-3 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-yellow-400 to-orange-400"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((score / targetScore) * 100, 100)}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-xs text-white/60 font-game">关卡 {level}</span>
              <span className="text-xs text-white/60 font-game">步数 {moves}</span>
            </div>
          </div>
        </div>

        {/* 游戏区域 */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/20 p-4 rounded-b-2xl relative">
          {/* 连击提示 */}
          <AnimatePresence>
            {showCombo && (
              <motion.div
                initial={{ scale: 0, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0, y: -20 }}
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50"
              >
                <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 py-3 rounded-full font-game font-bold text-xl flex items-center gap-2">
                  <Sparkles size={24} />
                  连击 x{combo}!
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 游戏网格 */}
          <div className="grid grid-cols-8 gap-1 bg-white/10 p-2 rounded-lg">
            {grid.map((row, rowIndex) => (
              row.map((cell, colIndex) => (
                <motion.button
                  key={`${rowIndex}-${colIndex}`}
                  initial={{ scale: 0 }}
                  animate={{ 
                    scale: selectedCells.has(`${rowIndex}-${colIndex}`) ? 0.8 : 1,
                    opacity: cell ? 1 : 0
                  }}
                  whileHover={{ scale: cell ? 1.1 : 1 }}
                  whileTap={{ scale: cell ? 0.9 : 1 }}
                  onClick={() => handleCellClick(rowIndex, colIndex)}
                  className={`aspect-square rounded-md transition-all ${
                    cell ? 'cursor-pointer' : 'cursor-default'
                  }`}
                  style={{
                    backgroundColor: cell?.color || 'transparent',
                    boxShadow: cell ? '0 2px 8px rgba(0,0,0,0.3)' : 'none'
                  }}
                  disabled={!cell || gameOver}
                />
              ))
            ))}
          </div>

          {/* 提示按钮 */}
          <div className="mt-4 flex justify-center">
            <button
              onClick={showHint}
              className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-game rounded-full hover:scale-105 transition-transform flex items-center gap-2"
              disabled={gameOver}
            >
              <Sparkles size={16} />
              提示
            </button>
          </div>

          {/* 游戏结束覆盖层 */}
          {gameOver && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm rounded-b-2xl flex items-center justify-center"
            >
              <div className="text-center p-6">
                <h2 className="text-3xl font-game font-bold text-white mb-2">游戏结束!</h2>
                <p className="text-xl font-game text-white/80 mb-1">最终得分</p>
                <p className="text-4xl font-game font-bold text-yellow-400 mb-4">{score}</p>
                {score > highScore && (
                  <p className="text-lg font-game text-orange-400 mb-4">🎉 新纪录!</p>
                )}
                <div className="space-y-2">
                  <button
                    onClick={resetGame}
                    className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-game rounded-lg hover:scale-105 transition-transform"
                  >
                    再玩一次
                  </button>
                  <button
                    onClick={() => navigate('/')}
                    className="w-full px-6 py-3 bg-white/20 text-white font-game rounded-lg hover:bg-white/30 transition-colors"
                  >
                    返回主页
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* 游戏说明 */}
        <div className="mt-4 text-center text-white/60 text-sm font-game">
          <p>点击相同颜色的相邻方块进行消除</p>
          <p>连续消除更多方块获得高分!</p>
        </div>
      </motion.div>
    </div>
  )
}

export default ColorTouchGame