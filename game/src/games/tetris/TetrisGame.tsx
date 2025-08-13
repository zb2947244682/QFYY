import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, RotateCcw, Trophy, Pause, Play, RotateCw, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'

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
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null)
  const lastMoveRef = useRef<number>(0)

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
    
    const movedPiece = {
      ...currentPiece,
      position: newPosition
    }
    
    if (!checkCollision(board, movedPiece)) {
      setCurrentPiece(movedPiece)
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

  // 游戏主循环
  useEffect(() => {
    if (!isPlaying || gameOver || !currentPiece) return
    
    const speed = Math.max(100, INITIAL_SPEED - (level - 1) * SPEED_INCREMENT)
    const interval = setInterval(() => {
      if (!movePiece(0, 1)) {
        // 方块无法下落，固定到棋盘
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
      }
    }, speed)
    
    return () => clearInterval(interval)
  }, [currentPiece, board, isPlaying, gameOver, nextPiece, movePiece, level, lines, score, highScore])

  // 键盘控制
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isPlaying || gameOver) {
        if (e.key === ' ') {
          e.preventDefault()
          if (gameOver) {
            resetGame()
          } else {
            startGame()
          }
        }
        return
      }
      
      const now = Date.now()
      const timeSinceLastMove = now - lastMoveRef.current
      
      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (timeSinceLastMove > 50) {
            movePiece(-1, 0)
            lastMoveRef.current = now
          }
          break
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (timeSinceLastMove > 50) {
            movePiece(1, 0)
            lastMoveRef.current = now
          }
          break
        case 'ArrowDown':
        case 's':
        case 'S':
          movePiece(0, 1)
          setScore(prev => prev + 1)
          break
        case 'ArrowUp':
        case 'w':
        case 'W':
          rotatePiece()
          break
        case ' ':
          e.preventDefault()
          hardDrop()
          break
        case 'p':
        case 'P':
          setIsPlaying(prev => !prev)
          break
      }
    }
    
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isPlaying, gameOver, movePiece, rotatePiece, hardDrop])

  // 触摸控制
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    setTouchStart({ x: touch.clientX, y: touch.clientY })
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart || !isPlaying || gameOver) return
    
    const touch = e.changedTouches[0]
    const deltaX = touch.clientX - touchStart.x
    const deltaY = touch.clientY - touchStart.y
    
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // 水平滑动
      if (Math.abs(deltaX) > 30) {
        if (deltaX > 0) {
          movePiece(1, 0)
        } else {
          movePiece(-1, 0)
        }
      }
    } else {
      // 垂直滑动
      if (deltaY > 50) {
        // 下滑加速
        movePiece(0, 1)
        setScore(prev => prev + 1)
      } else if (deltaY < -30) {
        // 上滑旋转
        rotatePiece()
      }
    }
    
    setTouchStart(null)
  }

  // 点击旋转
  const handleTap = () => {
    if (isPlaying && !gameOver) {
      rotatePiece()
    }
  }

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

  // 开始游戏
  const startGame = () => {
    if (gameOver) {
      resetGame()
    }
    setIsPlaying(true)
    if (!currentPiece) {
      const piece = spawnPiece(nextPiece)
      setCurrentPiece(piece)
      setNextPiece(getRandomTetromino())
    }
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
            <h1 className="text-2xl font-game font-bold text-white">俄罗斯方块</h1>
            <button
              onClick={resetGame}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              <RotateCcw size={16} />
              <span className="font-game">重置</span>
            </button>
          </div>
        </div>

        {/* 游戏主体 */}
        <div className="bg-gray-900 border border-gray-700 p-4 rounded-b-xl">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* 游戏板 */}
            <div 
              ref={gameRef}
              className="relative bg-gray-800 rounded-lg p-2"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onClick={handleTap}
            >
              <div className="grid grid-cols-10 gap-px bg-gray-700" style={{ width: '240px' }}>
                {board.map((row, y) => 
                  row.map((cell, x) => (
                    <div
                      key={`${y}-${x}`}
                      className={`w-6 h-6 ${
                        cell ? `bg-gradient-to-br ${cell}` : 'bg-gray-900'
                      } ${cell ? 'border border-gray-600' : ''}`}
                    />
                  ))
                )}
                
                {/* 当前方块 */}
                {currentPiece && currentPiece.shape.map((row, y) =>
                  row.map((cell, x) => {
                    if (!cell) return null
                    const boardY = currentPiece.position.y + y
                    const boardX = currentPiece.position.x + x
                    if (boardY < 0 || boardY >= BOARD_HEIGHT || boardX < 0 || boardX >= BOARD_WIDTH) return null
                    
                    return (
                      <motion.div
                        key={`current-${y}-${x}`}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className={`absolute w-6 h-6 bg-gradient-to-br ${
                          TETROMINOS[currentPiece.type].color
                        } border border-gray-600`}
                        style={{
                          left: `${boardX * 24 + boardX}px`,
                          top: `${boardY * 24 + boardY}px`
                        }}
                      />
                    )
                  })
                )}
              </div>

              {/* 游戏结束/暂停覆盖层 */}
              {(!isPlaying || gameOver) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 bg-black/70 backdrop-blur-sm rounded-lg flex items-center justify-center"
                >
                  <div className="text-center p-4">
                    {gameOver ? (
                      <>
                        <h2 className="text-3xl font-game font-bold text-red-400 mb-2">游戏结束!</h2>
                        <p className="text-xl font-game text-white mb-2">得分: {score}</p>
                        {score > highScore && (
                          <p className="text-lg font-game text-yellow-400 mb-4">🎉 新纪录!</p>
                        )}
                        <button
                          onClick={resetGame}
                          className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-game rounded-lg transition-colors"
                        >
                          重新开始
                        </button>
                      </>
                    ) : (
                      <>
                        <h2 className="text-2xl font-game font-bold text-white mb-4">
                          {score === 0 ? '准备开始' : '游戏暂停'}
                        </h2>
                        <button
                          onClick={startGame}
                          className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-game rounded-lg transition-colors flex items-center gap-2 mx-auto"
                        >
                          <Play size={20} />
                          {score === 0 ? '开始游戏' : '继续'}
                        </button>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </div>

            {/* 信息面板 */}
            <div className="flex-1 space-y-4">
              {/* 下一个方块 */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-sm font-game text-gray-400 mb-2">下一个</h3>
                <div className="flex justify-center">
                  <div className="grid gap-px bg-gray-700 p-1">
                    {TETROMINOS[nextPiece].shape.map((row, y) => (
                      <div key={y} className="flex gap-px">
                        {row.map((cell, x) => (
                          <div
                            key={x}
                            className={`w-5 h-5 ${
                              cell 
                                ? `bg-gradient-to-br ${TETROMINOS[nextPiece].color} border border-gray-600` 
                                : ''
                            }`}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 分数信息 */}
              <div className="bg-gray-800 rounded-lg p-4 space-y-3">
                <div>
                  <div className="text-gray-400 text-sm font-game">分数</div>
                  <div className="text-2xl font-bold text-white font-game">{score}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-sm font-game">行数</div>
                  <div className="text-xl font-bold text-blue-400 font-game">{lines}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-sm font-game">等级</div>
                  <div className="text-xl font-bold text-green-400 font-game">{level}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-sm font-game flex items-center gap-1">
                    <Trophy size={14} />
                    最高分
                  </div>
                  <div className="text-xl font-bold text-yellow-400 font-game">{highScore}</div>
                </div>
              </div>

              {/* 控制说明 */}
              <div className="bg-gray-800 rounded-lg p-4 text-xs text-gray-400 font-game space-y-1">
                <p>← → 或 A/D: 左右移动</p>
                <p>↓ 或 S: 加速下落</p>
                <p>↑ 或 W: 旋转</p>
                <p>空格: 硬降</p>
                <p>P: 暂停</p>
                <p className="text-purple-400">手机: 滑动或点击旋转</p>
              </div>

              {/* 移动端控制按钮 */}
              <div className="grid grid-cols-3 gap-2 lg:hidden">
                <button
                  onClick={() => movePiece(-1, 0)}
                  className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                  disabled={!isPlaying || gameOver}
                >
                  <ChevronLeft size={20} className="mx-auto text-white" />
                </button>
                <button
                  onClick={rotatePiece}
                  className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                  disabled={!isPlaying || gameOver}
                >
                  <RotateCw size={20} className="mx-auto text-white" />
                </button>
                <button
                  onClick={() => movePiece(1, 0)}
                  className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                  disabled={!isPlaying || gameOver}
                >
                  <ChevronRight size={20} className="mx-auto text-white" />
                </button>
                <button
                  onClick={() => {
                    movePiece(0, 1)
                    setScore(prev => prev + 1)
                  }}
                  className="col-span-3 p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                  disabled={!isPlaying || gameOver}
                >
                  <ChevronDown size={20} className="mx-auto text-white" />
                </button>
              </div>

              {/* 开始/暂停按钮 */}
              <button
                onClick={() => isPlaying ? setIsPlaying(false) : startGame()}
                className={`w-full px-6 py-3 ${
                  isPlaying 
                    ? 'bg-orange-600 hover:bg-orange-700' 
                    : 'bg-green-600 hover:bg-green-700'
                } text-white font-game rounded-lg transition-colors flex items-center justify-center gap-2`}
              >
                {isPlaying ? (
                  <>
                    <Pause size={20} />
                    暂停
                  </>
                ) : (
                  <>
                    <Play size={20} />
                    {gameOver || score === 0 ? '开始游戏' : '继续'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default TetrisGame