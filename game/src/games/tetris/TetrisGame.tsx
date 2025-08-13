import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, RotateCcw, Pause, Play, RotateCw, ChevronDown, ChevronLeft, ChevronRight, ArrowDown } from 'lucide-react'

// 游戏配置
const BOARD_WIDTH = 10
const BOARD_HEIGHT = 20
const INITIAL_SPEED = 800
const SPEED_INCREMENT = 50

// 方块形状定义
const TETROMINOS = {
  I: {
    shape: [[1, 1, 1, 1]],
    color: 'from-cyan-400 to-cyan-600'
  },
  O: {
    shape: [[1, 1], [1, 1]],
    color: 'from-yellow-400 to-yellow-600'
  },
  T: {
    shape: [[0, 1, 0], [1, 1, 1]],
    color: 'from-purple-400 to-purple-600'
  },
  S: {
    shape: [[0, 1, 1], [1, 1, 0]],
    color: 'from-green-400 to-green-600'
  },
  Z: {
    shape: [[1, 1, 0], [0, 1, 1]],
    color: 'from-red-400 to-red-600'
  },
  J: {
    shape: [[1, 0, 0], [1, 1, 1]],
    color: 'from-blue-400 to-blue-600'
  },
  L: {
    shape: [[0, 0, 1], [1, 1, 1]],
    color: 'from-orange-400 to-orange-600'
  }
}

type TetrominoType = keyof typeof TETROMINOS
type Board = (string | null)[][]
type Position = { x: number; y: number }

const TetrisGame = () => {
  const navigate = useNavigate()
  const gameRef = useRef<HTMLDivElement>(null)
  const [board, setBoard] = useState<Board>(() => 
    Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(null))
  )
  const [currentPiece, setCurrentPiece] = useState<{
    type: TetrominoType
    position: Position
    shape: number[][]
  } | null>(null)
  const [nextPiece, setNextPiece] = useState<TetrominoType>('T')
  const [score, setScore] = useState(0)
  const [lines, setLines] = useState(0)
  const [level, setLevel] = useState(1)
  const [gameOver, setGameOver] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('tetris-high-score')
    return saved ? parseInt(saved) : 0
  })
  // 触摸控制相关状态（暂时未使用）
  // const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null)
  // const lastMoveRef = useRef<number>(0)

  // 生成随机方块
  const getRandomTetromino = (): TetrominoType => {
    const pieces = Object.keys(TETROMINOS) as TetrominoType[]
    return pieces[Math.floor(Math.random() * pieces.length)]
  }

  // 旋转矩阵
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

  // 检查碰撞
  const checkCollision = (
    board: Board,
    piece: { shape: number[][], position: Position }
  ): boolean => {
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const newX = piece.position.x + x
          const newY = piece.position.y + y
          
          if (
            newX < 0 ||
            newX >= BOARD_WIDTH ||
            newY >= BOARD_HEIGHT ||
            (newY >= 0 && board[newY][newX])
          ) {
            return true
          }
        }
      }
    }
    return false
  }

  // 合并方块到棋盘
  const mergePiece = (
    board: Board,
    piece: { type: TetrominoType, shape: number[][], position: Position }
  ): Board => {
    const newBoard = board.map(row => [...row])
    const color = TETROMINOS[piece.type].color
    
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const boardY = piece.position.y + y
          const boardX = piece.position.x + x
          if (boardY >= 0) {
            newBoard[boardY][boardX] = color
          }
        }
      }
    }
    
    return newBoard
  }

  // 清除完整的行
  const clearLines = (board: Board): { board: Board, linesCleared: number } => {
    let newBoard = [...board]
    let linesCleared = 0
    
    for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
      if (newBoard[y].every(cell => cell !== null)) {
        newBoard.splice(y, 1)
        newBoard.unshift(Array(BOARD_WIDTH).fill(null))
        linesCleared++
        y++ // 重新检查当前行
      }
    }
    
    return { board: newBoard, linesCleared }
  }

  // 创建新方块
  const spawnPiece = (type: TetrominoType): {
    type: TetrominoType
    position: Position
    shape: number[][]
  } => {
    const shape = TETROMINOS[type].shape
    return {
      type,
      shape,
      position: {
        x: Math.floor((BOARD_WIDTH - shape[0].length) / 2),
        y: 0
      }
    }
  }

  // 移动方块
  const movePiece = useCallback((dx: number, dy: number) => {
    if (!currentPiece || !isPlaying || gameOver) return false
    
    const newPosition = {
      x: currentPiece.position.x + dx,
      y: currentPiece.position.y + dy
    }
    
    const newPiece = { ...currentPiece, position: newPosition }
    
    if (!checkCollision(board, newPiece)) {
      setCurrentPiece(newPiece)
      return true
    }
    
    return false
  }, [currentPiece, board, isPlaying, gameOver])

  // 旋转方块
  const rotatePiece = useCallback(() => {
    if (!currentPiece || !isPlaying || gameOver) return
    
    const rotatedShape = rotateMatrix(currentPiece.shape)
    const rotatedPiece = {
      ...currentPiece,
      shape: rotatedShape
    }
    
    // 尝试旋转，如果碰撞则尝试墙踢
    if (!checkCollision(board, rotatedPiece)) {
      setCurrentPiece(rotatedPiece)
    } else {
      // 简单的墙踢：尝试左右移动
      for (const offset of [1, -1, 2, -2]) {
        const kickedPiece = {
          ...rotatedPiece,
          position: { ...rotatedPiece.position, x: rotatedPiece.position.x + offset }
        }
        if (!checkCollision(board, kickedPiece)) {
          setCurrentPiece(kickedPiece)
          break
        }
      }
    }
  }, [currentPiece, board, isPlaying, gameOver])

  // 硬降
  const hardDrop = useCallback(() => {
    if (!currentPiece || !isPlaying || gameOver) return
    
    let dropDistance = 0
    while (movePiece(0, 1)) {
      dropDistance++
    }
    
    // 硬降得分
    setScore(prev => prev + dropDistance * 2)
  }, [currentPiece, isPlaying, gameOver, movePiece])

  // 锁定方块
  const lockPiece = useCallback(() => {
    if (!currentPiece || !isPlaying || gameOver) return
    
    const newBoard = mergePiece(board, currentPiece)
    const { board: clearedBoard, linesCleared } = clearLines(newBoard)
    
    setBoard(clearedBoard)
    
    if (linesCleared > 0) {
      setLines(prev => prev + linesCleared)
      setScore(prev => prev + linesCleared * 100 * level)
      setLevel(Math.floor((lines + linesCleared) / 10) + 1)
    }
    
    // 生成新方块
    const newPiece = spawnPiece(nextPiece)
    
    // 检查游戏结束
    if (checkCollision(clearedBoard, newPiece)) {
      setGameOver(true)
      setIsPlaying(false)
      if (score > highScore) {
        setHighScore(score)
        localStorage.setItem('tetris-high-score', score.toString())
      }
    } else {
      setCurrentPiece(newPiece)
      setNextPiece(getRandomTetromino())
    }
  }, [currentPiece, board, isPlaying, gameOver, nextPiece, level, lines, score, highScore])

  // 游戏主循环
  useEffect(() => {
    if (!isPlaying || gameOver || !currentPiece) return
    
    const speed = Math.max(100, INITIAL_SPEED - (level - 1) * SPEED_INCREMENT)
    const interval = setInterval(() => {
      if (!movePiece(0, 1)) {
        // 方块无法下落，固定到棋盘
        lockPiece()
      }
    }, speed)
    
    return () => clearInterval(interval)
  }, [currentPiece, board, isPlaying, gameOver, movePiece, lockPiece, level])

  // 键盘控制
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isPlaying || gameOver) return
      
      switch(e.key) {
        case 'ArrowLeft':
          movePiece(-1, 0)
          break
        case 'ArrowRight':
          movePiece(1, 0)
          break
        case 'ArrowDown':
          movePiece(0, 1)
          break
        case 'ArrowUp':
          rotatePiece()
          break
        case ' ':
          hardDrop()
          break
      }
    }
    
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isPlaying, gameOver, movePiece, rotatePiece, hardDrop])

  // 移除触摸控制，改为使用按钮控制

  // 点击旋转（暂时未使用）
  // const handleTap = () => {
  //   if (isPlaying && !gameOver) {
  //     rotatePiece()
  //   }
  // }

  // 重置游戏
  const resetGame = () => {
    setBoard(Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(null)))
    setCurrentPiece(null)
    setNextPiece(getRandomTetromino())
    setScore(0)
    setLines(0)
    setLevel(1)
    setGameOver(false)
    setIsPlaying(false)
  }

  // 开始游戏（暂时未使用）
  // const startGame = () => {
  //   if (gameOver) {
  //     resetGame()
  //   }
  //   setIsPlaying(true)
  //   if (!currentPiece) {
  //     const piece = spawnPiece(nextPiece)
  //     setCurrentPiece(piece)
  //     setNextPiece(getRandomTetromino())
  //   }
  // }

  // 开始/暂停游戏
  const togglePlayPause = () => {
    if (gameOver) {
      resetGame()
      return
    }
    
    if (!isPlaying) {
      // 开始游戏
      if (!currentPiece) {
        const piece = spawnPiece(nextPiece)
        setCurrentPiece(piece)
        setNextPiece(getRandomTetromino())
      }
      setIsPlaying(true)
    } else {
      // 暂停游戏
      setIsPlaying(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex flex-col p-2 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl mx-auto flex flex-col h-screen"
      >
        {/* 游戏头部 - 精简版 */}
        <div className="bg-gray-800/50 backdrop-blur rounded-xl p-3 mb-2">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => navigate('/')}
              className="p-2 text-gray-400 hover:text-white"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-game font-bold text-white">俄罗斯方块</h1>
            <button
              onClick={resetGame}
              className="p-2 text-white"
            >
              <RotateCcw size={18} />
            </button>
          </div>

          {/* 游戏信息 - 精简 */}
          <div className="grid grid-cols-4 gap-2 text-xs">
            <div className="bg-gray-700/50 rounded p-2 text-center">
              <div className="text-gray-400">分数</div>
              <div className="text-white font-bold">{score}</div>
            </div>
            <div className="bg-gray-700/50 rounded p-2 text-center">
              <div className="text-gray-400">行数</div>
              <div className="text-white font-bold">{lines}</div>
            </div>
            <div className="bg-gray-700/50 rounded p-2 text-center">
              <div className="text-gray-400">等级</div>
              <div className="text-white font-bold">{level}</div>
            </div>
            <div className="bg-gray-700/50 rounded p-2 text-center">
              <div className="text-gray-400">最高</div>
              <div className="text-yellow-400 font-bold">{highScore}</div>
            </div>
          </div>
        </div>

        {/* 游戏主区域 */}
        <div className="flex-1 flex items-center justify-center">
          <div className="flex gap-3">
            {/* 游戏板 */}
            <div className="flex flex-col items-center">
              <div 
                ref={gameRef}
                className="relative bg-gray-800 rounded-lg p-1"
              >
                <div 
                  className="grid grid-cols-10 gap-px bg-gray-700"
                  style={{ 
                    width: `${window.innerWidth < 400 ? '200px' : '240px'}`,
                    aspectRatio: '1/2'
                  }}
                >
                  {board.map((row, y) => 
                    row.map((cell, x) => (
                      <div
                        key={`${y}-${x}`}
                        className={`aspect-square ${
                          cell ? `bg-gradient-to-br ${cell}` : 'bg-gray-900'
                        } ${cell ? 'border border-gray-600' : ''}`}
                      />
                    ))
                  )}
                  
                  {/* 当前方块 */}
                  {currentPiece && currentPiece.shape.map((row, y) =>
                    row.map((cell, x) => {
                      if (!cell) return null
                      const boardX = currentPiece.position.x + x
                      const boardY = currentPiece.position.y + y
                      if (boardY < 0) return null
                      
                      return (
                        <div
                          key={`current-${y}-${x}`}
                          className={`absolute aspect-square bg-gradient-to-br ${
                            TETROMINOS[currentPiece.type].color
                          } border border-gray-600`}
                          style={{
                            left: `${boardX * (100 / BOARD_WIDTH)}%`,
                            top: `${boardY * (100 / BOARD_HEIGHT)}%`,
                            width: `${100 / BOARD_WIDTH}%`,
                            height: `${100 / BOARD_HEIGHT}%`
                          }}
                        />
                      )
                    })
                  )}
                </div>
              </div>

              {/* 控制按钮 - 移动端优化 */}
              <div className="mt-3 w-full max-w-xs">
                {/* 上部控制 - 旋转和快速下落 */}
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button
                    onClick={rotatePiece}
                    className="p-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-lg transition-all flex items-center justify-center"
                    disabled={!isPlaying || gameOver}
                  >
                    <RotateCw size={20} />
                  </button>
                  <button
                    onClick={hardDrop}
                    className="p-3 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white rounded-lg transition-all flex items-center justify-center"
                    disabled={!isPlaying || gameOver}
                  >
                    <ArrowDown size={20} />
                  </button>
                </div>

                {/* 方向控制 */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => movePiece(-1, 0)}
                    className="p-3 bg-gray-700 hover:bg-gray-600 active:scale-95 text-white rounded-lg transition-all flex items-center justify-center"
                    disabled={!isPlaying || gameOver}
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={() => movePiece(0, 1)}
                    className="p-3 bg-gray-700 hover:bg-gray-600 active:scale-95 text-white rounded-lg transition-all flex items-center justify-center"
                    disabled={!isPlaying || gameOver}
                  >
                    <ChevronDown size={20} />
                  </button>
                  <button
                    onClick={() => movePiece(1, 0)}
                    className="p-3 bg-gray-700 hover:bg-gray-600 active:scale-95 text-white rounded-lg transition-all flex items-center justify-center"
                    disabled={!isPlaying || gameOver}
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            </div>

            {/* 侧边信息 */}
            <div className="flex flex-col gap-2">
              {/* 下一个方块 */}
              <div className="bg-gray-800 rounded-lg p-2">
                <div className="text-gray-400 text-xs mb-1 text-center">下一个</div>
                <div className="bg-gray-900 rounded p-2">
                  <div className="grid grid-cols-4 gap-px" style={{ width: '60px', height: '60px' }}>
                    {Array(4).fill(null).map((_, y) =>
                      Array(4).fill(null).map((_, x) => {
                        const shape = TETROMINOS[nextPiece].shape
                        const isActive = y < shape.length && x < shape[y].length && shape[y][x]
                        return (
                          <div
                            key={`next-${y}-${x}`}
                            className={`aspect-square ${
                              isActive 
                                ? `bg-gradient-to-br ${TETROMINOS[nextPiece].color} border border-gray-600`
                                : ''
                            }`}
                          />
                        )
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* 开始/暂停按钮 */}
              <button
                onClick={togglePlayPause}
                className={`p-3 ${
                  isPlaying ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'
                } text-white rounded-lg transition-all active:scale-95 flex items-center justify-center`}
                disabled={false}
              >
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* 游戏结束提示 */}
        {gameOver && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 text-center">
              <h2 className="text-2xl font-game font-bold text-red-400 mb-3">游戏结束!</h2>
              <div className="space-y-1 mb-4">
                <p className="text-white">
                  最终分数: <span className="text-yellow-400 font-bold">{score}</span>
                </p>
                {score > highScore && (
                  <p className="text-green-400 font-bold">🎉 新纪录!</p>
                )}
              </div>
              <button
                onClick={resetGame}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                再来一局
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}

export default TetrisGame