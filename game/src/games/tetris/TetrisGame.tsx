import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, RotateCcw, Play, Pause, ChevronDown, ChevronLeft, ChevronRight, RotateCw } from 'lucide-react'

// 方块形状定义
const SHAPES = {
  I: [[1,1,1,1]],
  O: [[1,1],[1,1]],
  T: [[0,1,0],[1,1,1]],
  S: [[0,1,1],[1,1,0]],
  Z: [[1,1,0],[0,1,1]],
  J: [[1,0,0],[1,1,1]],
  L: [[0,0,1],[1,1,1]]
}

// 方块颜色
const COLORS = {
  I: '#00f0f0',
  O: '#f0f000',
  T: '#a000f0',
  S: '#00f000',
  Z: '#f00000',
  J: '#0000f0',
  L: '#f0a000'
}

type ShapeType = keyof typeof SHAPES
type Board = number[][]
type Piece = {
  shape: number[][]
  x: number
  y: number
  type: ShapeType
}

const BOARD_WIDTH = 10
const BOARD_HEIGHT = 20

const TetrisGame = () => {
  const navigate = useNavigate()
  const gameLoopRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [board, setBoard] = useState<Board>(() => 
    Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(0))
  )
  const [currentPiece, setCurrentPiece] = useState<Piece | null>(null)
  const [nextPiece, setNextPiece] = useState<ShapeType>('T')
  const [score, setScore] = useState(0)
  const [lines, setLines] = useState(0)
  const [level, setLevel] = useState(1)
  const [gameOver, setGameOver] = useState(false)
  const [paused, setPaused] = useState(false)
  const [dropTime, setDropTime] = useState(1000)

  // 旋转方块
  const rotateMatrix = (matrix: number[][]): number[][] => {
    const rows = matrix.length
    const cols = matrix[0].length
    const rotated = Array(cols).fill(null).map(() => Array(rows).fill(0))
    
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        rotated[j][rows - 1 - i] = matrix[i][j]
      }
    }
    
    return rotated
  }

  // 生成随机方块
  const generateRandomPiece = (): ShapeType => {
    const types = Object.keys(SHAPES) as ShapeType[]
    return types[Math.floor(Math.random() * types.length)]
  }

  // 创建新方块
  const createPiece = (type: ShapeType): Piece => {
    const shape = SHAPES[type].map(row => [...row])
    return {
      shape,
      x: Math.floor((BOARD_WIDTH - shape[0].length) / 2),
      y: 0,
      type
    }
  }

  // 检查碰撞
  const checkCollision = (piece: Piece, board: Board, offsetX = 0, offsetY = 0): boolean => {
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const newX = piece.x + x + offsetX
          const newY = piece.y + y + offsetY
          
          if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT) {
            return true
          }
          
          if (newY >= 0 && board[newY][newX]) {
            return true
          }
        }
      }
    }
    return false
  }

  // 合并方块到游戏板
  const mergePiece = (piece: Piece, board: Board): Board => {
    const newBoard = board.map(row => [...row])
    
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const boardY = piece.y + y
          const boardX = piece.x + x
          if (boardY >= 0) {
            newBoard[boardY][boardX] = COLORS[piece.type] as any
          }
        }
      }
    }
    
    return newBoard
  }

  // 清除完成的行
  const clearLines = (board: Board): { newBoard: Board; clearedLines: number } => {
    let newBoard = [...board]
    let clearedLines = 0
    
    for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
      if (newBoard[y].every(cell => cell !== 0)) {
        newBoard.splice(y, 1)
        newBoard.unshift(Array(BOARD_WIDTH).fill(0))
        clearedLines++
        y++ // 重新检查当前行
      }
    }
    
    return { newBoard, clearedLines }
  }

  // 移动方块
  const movePiece = useCallback((direction: 'left' | 'right' | 'down') => {
    if (!currentPiece || paused || gameOver) return
    
    const offsetX = direction === 'left' ? -1 : direction === 'right' ? 1 : 0
    const offsetY = direction === 'down' ? 1 : 0
    
    if (!checkCollision(currentPiece, board, offsetX, offsetY)) {
      setCurrentPiece({
        ...currentPiece,
        x: currentPiece.x + offsetX,
        y: currentPiece.y + offsetY
      })
      return true
    }
    
    return false
  }, [currentPiece, board, paused, gameOver])

  // 旋转当前方块
  const rotatePiece = useCallback(() => {
    if (!currentPiece || paused || gameOver) return
    
    const rotated = {
      ...currentPiece,
      shape: rotateMatrix(currentPiece.shape)
    }
    
    if (!checkCollision(rotated, board)) {
      setCurrentPiece(rotated)
    }
  }, [currentPiece, board, paused, gameOver])

  // 硬降
  const hardDrop = useCallback(() => {
    if (!currentPiece || paused || gameOver) return
    
    let dropDistance = 0
    while (!checkCollision(currentPiece, board, 0, dropDistance + 1)) {
      dropDistance++
    }
    
    setCurrentPiece({
      ...currentPiece,
      y: currentPiece.y + dropDistance
    })
    
    // 立即锁定方块
    setTimeout(() => {
      lockPiece()
    }, 0)
  }, [currentPiece, board, paused, gameOver])

  // 锁定方块
  const lockPiece = useCallback(() => {
    if (!currentPiece) return
    
    const newBoard = mergePiece(currentPiece, board)
    const { newBoard: clearedBoard, clearedLines } = clearLines(newBoard)
    
    setBoard(clearedBoard)
    
    // 更新分数和等级
    if (clearedLines > 0) {
      const points = [0, 100, 300, 500, 800][clearedLines] * level
      setScore(prev => prev + points)
      setLines(prev => {
        const newLines = prev + clearedLines
        const newLevel = Math.floor(newLines / 10) + 1
        if (newLevel !== level) {
          setLevel(newLevel)
          setDropTime(Math.max(100, 1000 - (newLevel - 1) * 100))
        }
        return newLines
      })
    }
    
    // 生成新方块
    const newPiece = createPiece(nextPiece)
    
    if (checkCollision(newPiece, clearedBoard)) {
      setGameOver(true)
    } else {
      setCurrentPiece(newPiece)
      setNextPiece(generateRandomPiece())
    }
  }, [currentPiece, board, nextPiece, level])

  // 游戏循环
  useEffect(() => {
    if (!currentPiece || paused || gameOver) return
    
    gameLoopRef.current = setTimeout(() => {
      if (!movePiece('down')) {
        lockPiece()
      }
    }, dropTime)
    
    return () => {
      if (gameLoopRef.current) {
        clearTimeout(gameLoopRef.current)
      }
    }
  }, [currentPiece, board, paused, gameOver, dropTime, movePiece, lockPiece])

  // 键盘控制
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (gameOver) return
      
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          movePiece('left')
          break
        case 'ArrowRight':
          e.preventDefault()
          movePiece('right')
          break
        case 'ArrowDown':
          e.preventDefault()
          movePiece('down')
          break
        case 'ArrowUp':
          e.preventDefault()
          rotatePiece()
          break
        case ' ':
          e.preventDefault()
          hardDrop()
          break
        case 'p':
        case 'P':
          setPaused(prev => !prev)
          break
      }
    }
    
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [movePiece, rotatePiece, hardDrop, gameOver])

  // 开始新游戏
  const startNewGame = () => {
    setBoard(Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(0)))
    setCurrentPiece(createPiece(generateRandomPiece()))
    setNextPiece(generateRandomPiece())
    setScore(0)
    setLines(0)
    setLevel(1)
    setDropTime(1000)
    setGameOver(false)
    setPaused(false)
  }

  // 初始化游戏
  useEffect(() => {
    startNewGame()
  }, [])

  // 触摸控制（用于移动端）
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null)
  
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    setTouchStart({ x: touch.clientX, y: touch.clientY })
  }
  
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return
    
    const touch = e.changedTouches[0]
    const deltaX = touch.clientX - touchStart.x
    const deltaY = touch.clientY - touchStart.y
    
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX > 30) {
        movePiece('right')
      } else if (deltaX < -30) {
        movePiece('left')
      }
    } else {
      if (deltaY > 30) {
        movePiece('down')
      } else if (deltaY < -30) {
        rotatePiece()
      }
    }
    
    setTouchStart(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex flex-col">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl mx-auto flex flex-col min-h-screen p-4"
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
            <h1 className="text-2xl font-game font-bold text-white">俄罗斯方块</h1>
            <button
              onClick={startNewGame}
              className="p-2 text-white hover:text-purple-400 transition-colors"
            >
              <RotateCcw size={20} />
            </button>
          </div>
          
          {/* 游戏信息 */}
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-gray-400 text-xs">分数</div>
              <div className="text-white font-bold">{score}</div>
            </div>
            <div>
              <div className="text-gray-400 text-xs">行数</div>
              <div className="text-white font-bold">{lines}</div>
            </div>
            <div>
              <div className="text-gray-400 text-xs">等级</div>
              <div className="text-white font-bold">{level}</div>
            </div>
            <div>
              <button
                onClick={() => setPaused(!paused)}
                className="flex flex-col items-center justify-center w-full"
                disabled={gameOver}
              >
                <div className="text-gray-400 text-xs mb-1">状态</div>
                <div className="text-white">
                  {gameOver ? '结束' : paused ? <Play size={16} /> : <Pause size={16} />}
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* 游戏区域 */}
        <div className="flex-1 flex items-center justify-center gap-4">
          {/* 游戏板 */}
          <div
            className="relative bg-gray-900 border-2 border-gray-700 rounded-lg p-2"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div className="grid grid-cols-10 gap-[1px] bg-gray-800">
              {board.map((row, y) =>
                row.map((cell, x) => (
                  <div
                    key={`${y}-${x}`}
                    className="aspect-square border border-gray-700"
                    style={{
                      backgroundColor: cell ? String(cell) : 'transparent',
                      width: '20px',
                      height: '20px'
                    }}
                  />
                ))
              )}
              
              {/* 当前方块 */}
              {currentPiece && !gameOver && (
                <>
                  {currentPiece.shape.map((row, y) =>
                    row.map((cell, x) => {
                      if (!cell) return null
                      const boardX = currentPiece.x + x
                      const boardY = currentPiece.y + y
                      if (boardY < 0) return null
                      
                      return (
                        <div
                          key={`piece-${y}-${x}`}
                          className="absolute border border-gray-600"
                          style={{
                            backgroundColor: COLORS[currentPiece.type],
                            left: `${boardX * 21 + 8}px`,
                            top: `${boardY * 21 + 8}px`,
                            width: '20px',
                            height: '20px'
                          }}
                        />
                      )
                    })
                  )}
                </>
              )}
            </div>
            
            {/* 暂停/游戏结束覆盖层 */}
            {(paused || gameOver) && (
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center rounded-lg">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-white mb-2">
                    {gameOver ? '游戏结束' : '暂停'}
                  </h2>
                  {gameOver && (
                    <>
                      <p className="text-gray-300 mb-1">最终分数: {score}</p>
                      <p className="text-gray-300 mb-4">消除行数: {lines}</p>
                    </>
                  )}
                  <button
                    onClick={gameOver ? startNewGame : () => setPaused(false)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                  >
                    {gameOver ? '新游戏' : '继续'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 侧边信息和控制 */}
          <div className="flex flex-col gap-4">
            {/* 下一个方块 */}
            <div className="bg-gray-800/50 backdrop-blur rounded-lg p-3">
              <div className="text-gray-400 text-sm mb-2">下一个</div>
              <div className="grid grid-cols-4 gap-[1px] bg-gray-900 p-2">
                {Array(4).fill(null).map((_, y) =>
                  Array(4).fill(null).map((_, x) => {
                    const shape = SHAPES[nextPiece]
                    const isBlock = shape[y] && shape[y][x - Math.floor((4 - shape[0].length) / 2)]
                    return (
                      <div
                        key={`next-${y}-${x}`}
                        className="aspect-square"
                        style={{
                          backgroundColor: isBlock ? COLORS[nextPiece] : 'transparent',
                          width: '15px',
                          height: '15px'
                        }}
                      />
                    )
                  })
                )}
              </div>
            </div>

            {/* 移动端控制按钮 */}
            <div className="sm:hidden bg-gray-800/50 backdrop-blur rounded-lg p-3">
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => movePiece('left')}
                  className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg active:scale-95"
                  disabled={paused || gameOver}
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={() => rotatePiece()}
                  className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg active:scale-95"
                  disabled={paused || gameOver}
                >
                  <RotateCw size={20} />
                </button>
                <button
                  onClick={() => movePiece('right')}
                  className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg active:scale-95"
                  disabled={paused || gameOver}
                >
                  <ChevronRight size={20} />
                </button>
                <button
                  onClick={() => hardDrop()}
                  className="col-span-3 p-3 bg-purple-600 hover:bg-purple-700 rounded-lg active:scale-95"
                  disabled={paused || gameOver}
                >
                  <ChevronDown size={20} className="mx-auto" />
                </button>
              </div>
            </div>

            {/* 操作说明 */}
            <div className="hidden sm:block bg-gray-800/50 backdrop-blur rounded-lg p-3">
              <div className="text-gray-400 text-sm space-y-1">
                <div>← → 移动</div>
                <div>↑ 旋转</div>
                <div>↓ 加速下落</div>
                <div>空格 直接下落</div>
                <div>P 暂停</div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default TetrisGame