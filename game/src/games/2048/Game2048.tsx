import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, RotateCcw, Trophy } from 'lucide-react'

type Cell = number | null
type Grid = Cell[][]
type Direction = 'up' | 'down' | 'left' | 'right'

const Game2048 = () => {
  const navigate = useNavigate()
  const [grid, setGrid] = useState<Grid>(() => initializeGrid())
  const [score, setScore] = useState(0)
  const [bestScore, setBestScore] = useState(() => {
    const saved = localStorage.getItem('2048-best-score')
    return saved ? parseInt(saved) : 0
  })
  const [gameOver, setGameOver] = useState(false)
  const [won, setWon] = useState(false)
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null)

  // 初始化网格
  function initializeGrid(): Grid {
    const newGrid = Array(4).fill(null).map(() => Array(4).fill(null))
    addNewTile(newGrid)
    addNewTile(newGrid)
    return newGrid
  }

  // 添加新方块
  function addNewTile(grid: Grid): boolean {
    const emptyCells: [number, number][] = []
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        if (grid[i][j] === null) {
          emptyCells.push([i, j])
        }
      }
    }
    
    if (emptyCells.length === 0) return false
    
    const [row, col] = emptyCells[Math.floor(Math.random() * emptyCells.length)]
    grid[row][col] = Math.random() < 0.9 ? 2 : 4
    return true
  }

  // 移动逻辑
  const move = useCallback((direction: Direction) => {
    if (gameOver || won) return

    const newGrid = grid.map(row => [...row])
    let moved = false
    let points = 0

    const moveLeft = (row: Cell[]): [Cell[], number, boolean] => {
      let newRow: Cell[] = row.filter(cell => cell !== null) as number[]
      let rowPoints = 0
      let rowMoved = false
      
      for (let i = 0; i < newRow.length - 1; i++) {
        if (newRow[i] === newRow[i + 1]) {
          newRow[i] = (newRow[i] as number) * 2
          rowPoints += newRow[i] as number
          newRow.splice(i + 1, 1)
          rowMoved = true
        }
      }
      
      while (newRow.length < 4) {
        newRow.push(null)
      }
      
      if (JSON.stringify(row) !== JSON.stringify(newRow)) {
        rowMoved = true
      }
      
      return [newRow, rowPoints, rowMoved]
    }

    if (direction === 'left') {
      for (let i = 0; i < 4; i++) {
        const [newRow, rowPoints, rowMoved] = moveLeft(newGrid[i])
        newGrid[i] = newRow
        points += rowPoints
        if (rowMoved) moved = true
      }
    } else if (direction === 'right') {
      for (let i = 0; i < 4; i++) {
        const reversed = [...newGrid[i]].reverse()
        const [newRow, rowPoints, rowMoved] = moveLeft(reversed)
        newGrid[i] = newRow.reverse()
        points += rowPoints
        if (rowMoved) moved = true
      }
    } else if (direction === 'up') {
      for (let j = 0; j < 4; j++) {
        const column = [newGrid[0][j], newGrid[1][j], newGrid[2][j], newGrid[3][j]]
        const [newColumn, colPoints, colMoved] = moveLeft(column)
        for (let i = 0; i < 4; i++) {
          newGrid[i][j] = newColumn[i]
        }
        points += colPoints
        if (colMoved) moved = true
      }
    } else if (direction === 'down') {
      for (let j = 0; j < 4; j++) {
        const column = [newGrid[3][j], newGrid[2][j], newGrid[1][j], newGrid[0][j]]
        const [newColumn, colPoints, colMoved] = moveLeft(column)
        newGrid[0][j] = newColumn[3]
        newGrid[1][j] = newColumn[2]
        newGrid[2][j] = newColumn[1]
        newGrid[3][j] = newColumn[0]
        points += colPoints
        if (colMoved) moved = true
      }
    }

    if (moved) {
      addNewTile(newGrid)
      setGrid(newGrid)
      const newScore = score + points
      setScore(newScore)
      
      if (newScore > bestScore) {
        setBestScore(newScore)
        localStorage.setItem('2048-best-score', newScore.toString())
      }

      // 检查是否获胜
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          if (newGrid[i][j] === 2048) {
            setWon(true)
            return
          }
        }
      }

      // 检查游戏是否结束
      if (!canMove(newGrid)) {
        setGameOver(true)
      }
    }
  }, [grid, score, bestScore, gameOver, won])

  // 检查是否还能移动
  function canMove(grid: Grid): boolean {
    // 检查是否有空格
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        if (grid[i][j] === null) return true
      }
    }
    
    // 检查是否有相邻的相同数字
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        const current = grid[i][j]
        if (i < 3 && current === grid[i + 1][j]) return true
        if (j < 3 && current === grid[i][j + 1]) return true
      }
    }
    
    return false
  }

  // 键盘控制
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        move('up')
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        move('down')
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        move('left')
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        move('right')
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [move])

  // 触摸控制
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    setTouchStart({ x: touch.clientX, y: touch.clientY })
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return
    
    const touch = e.changedTouches[0]
    const deltaX = touch.clientX - touchStart.x
    const deltaY = touch.clientY - touchStart.y
    const minSwipeDistance = 50
    
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (Math.abs(deltaX) > minSwipeDistance) {
        if (deltaX > 0) {
          move('right')
        } else {
          move('left')
        }
      }
    } else {
      if (Math.abs(deltaY) > minSwipeDistance) {
        if (deltaY > 0) {
          move('down')
        } else {
          move('up')
        }
      }
    }
    
    setTouchStart(null)
  }

  // 重新开始游戏
  const resetGame = () => {
    setGrid(initializeGrid())
    setScore(0)
    setGameOver(false)
    setWon(false)
  }

  // 获取方块颜色
  const getTileColor = (value: Cell) => {
    if (value === null) return 'bg-gray-700'
    const colors: { [key: number]: string } = {
      2: 'bg-gray-600',
      4: 'bg-gray-500',
      8: 'bg-orange-500',
      16: 'bg-orange-600',
      32: 'bg-red-500',
      64: 'bg-red-600',
      128: 'bg-yellow-500',
      256: 'bg-yellow-600',
      512: 'bg-green-500',
      1024: 'bg-green-600',
      2048: 'bg-purple-600',
    }
    return colors[value] || 'bg-purple-700'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-4">
      <div className="max-w-md mx-auto">
        {/* 头部 */}
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-3xl font-bold text-white font-game">2048</h1>
          <button
            onClick={resetGame}
            className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <RotateCcw size={24} />
          </button>
        </div>

        {/* 分数板 */}
        <div className="flex justify-center gap-4 mb-6">
          <div className="bg-gray-800 px-4 py-2 rounded-lg">
            <div className="text-gray-400 text-sm">得分</div>
            <div className="text-white text-2xl font-bold">{score}</div>
          </div>
          <div className="bg-gray-800 px-4 py-2 rounded-lg">
            <div className="text-gray-400 text-sm">最高分</div>
            <div className="text-white text-2xl font-bold">{bestScore}</div>
          </div>
        </div>

        {/* 游戏网格 */}
        <div 
          className="relative bg-gray-800 p-2 rounded-lg select-none"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="grid grid-cols-4 gap-2">
            {grid.map((row, i) => 
              row.map((cell, j) => (
                <div
                  key={`${i}-${j}`}
                  className="aspect-square relative"
                >
                  <div className="absolute inset-0 bg-gray-700 rounded" />
                  <AnimatePresence mode="popLayout">
                    {cell !== null && (
                      <motion.div
                        key={`tile-${i}-${j}-${cell}`}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className={`absolute inset-0 ${getTileColor(cell)} rounded flex items-center justify-center text-white font-bold ${
                          cell && cell >= 128 ? 'text-2xl' : 'text-3xl'
                        } ${cell && cell >= 1024 ? 'text-xl' : ''}`}
                      >
                        {cell}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 游戏说明 */}
        <div className="mt-6 text-center text-gray-400 text-sm">
          <p>使用方向键或滑动来移动方块</p>
          <p>相同数字的方块会合并</p>
        </div>

        {/* 游戏结束/获胜弹窗 */}
        <AnimatePresence>
          {(gameOver || won) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
            >
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.8 }}
                className="bg-gray-800 p-8 rounded-xl text-center max-w-sm w-full"
              >
                {won ? (
                  <>
                    <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                    <h2 className="text-3xl font-bold text-white mb-2">恭喜获胜！</h2>
                    <p className="text-gray-400 mb-6">你达到了2048！</p>
                  </>
                ) : (
                  <>
                    <h2 className="text-3xl font-bold text-white mb-2">游戏结束</h2>
                    <p className="text-gray-400 mb-6">最终得分：{score}</p>
                  </>
                )}
                <div className="flex gap-4">
                  <button
                    onClick={resetGame}
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    再玩一次
                  </button>
                  <button
                    onClick={() => navigate('/')}
                    className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    返回首页
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default Game2048