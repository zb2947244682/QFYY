import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, RotateCcw, Trophy, Pause, Play, ChevronUp, ChevronDown, ChevronLeft as ChevronLeftIcon, ChevronRight } from 'lucide-react'

interface Position {
  x: number
  y: number
}

const GRID_SIZE = 20
const INITIAL_SNAKE: Position[] = [{ x: 10, y: 10 }]
const INITIAL_FOOD: Position = { x: 15, y: 15 }
const INITIAL_SPEED = 150

const SnakeGame = () => {
  const navigate = useNavigate()
  const gameRef = useRef<HTMLDivElement>(null)
  const [snake, setSnake] = useState<Position[]>(INITIAL_SNAKE)
  const [food, setFood] = useState<Position>(INITIAL_FOOD)
  const [direction, setDirection] = useState<'UP' | 'DOWN' | 'LEFT' | 'RIGHT'>('RIGHT')
  const directionRef = useRef(direction)
  const lastMoveTimeRef = useRef<number>(0)
  const [gameOver, setGameOver] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('snake-high-score')
    return saved ? parseInt(saved) : 0
  })

  // 生成随机食物位置
  const generateFood = useCallback((snake: Position[]): Position => {
    let newFood: Position
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE)
      }
    } while (snake.some(segment => segment.x === newFood.x && segment.y === newFood.y))
    return newFood
  }, [])

  // 检查碰撞
  const checkCollision = (head: Position, snake: Position[]): boolean => {
    // 撞墙
    if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
      return true
    }
    // 撞到自己
    for (let i = 1; i < snake.length; i++) {
      if (head.x === snake[i].x && head.y === snake[i].y) {
        return true
      }
    }
    return false
  }

  // 移动蛇
  const moveSnake = useCallback(() => {
    if (gameOver || !isPlaying) return

    setSnake(currentSnake => {
      const newSnake = [...currentSnake]
      const head = { ...newSnake[0] }

      switch (directionRef.current) {
        case 'UP':
          head.y -= 1
          break
        case 'DOWN':
          head.y += 1
          break
        case 'LEFT':
          head.x -= 1
          break
        case 'RIGHT':
          head.x += 1
          break
      }

      // 检查碰撞
      if (checkCollision(head, newSnake)) {
        setGameOver(true)
        setIsPlaying(false)
        if (score > highScore) {
          setHighScore(score)
          localStorage.setItem('snake-high-score', score.toString())
        }
        return currentSnake
      }

      newSnake.unshift(head)

      // 检查是否吃到食物
      if (head.x === food.x && head.y === food.y) {
        setScore(prev => prev + 10)
        setFood(generateFood(newSnake))
      } else {
        newSnake.pop()
      }

      return newSnake
    })
  }, [food, gameOver, isPlaying, score, highScore, generateFood])

  // 游戏循环
  useEffect(() => {
    if (!isPlaying || gameOver) return

    const gameInterval = setInterval(() => {
      moveSnake()
      lastMoveTimeRef.current = Date.now()
    }, INITIAL_SPEED)
    return () => clearInterval(gameInterval)
  }, [isPlaying, gameOver, moveSnake])

  // 改变方向
  const changeDirection = (newDirection: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
    if (!isPlaying || gameOver) return
    
    // 防止反向移动
    const opposites = {
      'UP': 'DOWN',
      'DOWN': 'UP',
      'LEFT': 'RIGHT',
      'RIGHT': 'LEFT'
    }
    
    // 防止在同一个游戏循环内多次改变方向
    if (directionRef.current === newDirection) return
    
    if (directionRef.current !== opposites[newDirection]) {
      setDirection(newDirection)
      directionRef.current = newDirection
      
      // 立即执行一次移动，提高响应速度
      // 但需要确保不会导致重复移动
      const now = Date.now()
      if (!lastMoveTimeRef.current || now - lastMoveTimeRef.current > 50) {
        moveSnake()
        lastMoveTimeRef.current = now
      }
    }
  }

  // 键盘控制
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (gameOver || !isPlaying) return

      switch (e.key) {
        case 'ArrowUp':
          changeDirection('UP')
          break
        case 'ArrowDown':
          changeDirection('DOWN')
          break
        case 'ArrowLeft':
          changeDirection('LEFT')
          break
        case 'ArrowRight':
          changeDirection('RIGHT')
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [gameOver, isPlaying])

  // 重置游戏
  const resetGame = () => {
    setSnake(INITIAL_SNAKE)
    setFood(INITIAL_FOOD)
    setDirection('RIGHT')
    directionRef.current = 'RIGHT'
    setGameOver(false)
    setIsPlaying(false)
    setScore(0)
  }

  // 开始游戏
  const startGame = () => {
    if (gameOver) {
      resetGame()
    }
    setIsPlaying(true)
  }

  // 获取网格大小（根据屏幕尺寸自适应）
  const getGridCellSize = () => {
    if (typeof window !== 'undefined') {
      const screenWidth = window.innerWidth
      const screenHeight = window.innerHeight
      const maxSize = Math.min(screenWidth - 32, screenHeight * 0.5, 400)
      return Math.floor(maxSize / GRID_SIZE)
    }
    return 16
  }

  const [cellSize, setCellSize] = useState(getGridCellSize())

  useEffect(() => {
    const handleResize = () => {
      setCellSize(getGridCellSize())
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-900 to-gray-900 flex flex-col p-2">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl mx-auto flex flex-col min-h-screen"
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
            <h1 className="text-xl font-game font-bold text-white">贪吃蛇</h1>
            <button
              onClick={resetGame}
              className="p-2 text-white"
            >
              <RotateCcw size={18} />
            </button>
          </div>

          {/* 游戏信息 - 精简 */}
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-400">分数:</span>
              <span className="text-white font-bold">{score}</span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy size={16} className="text-yellow-400" />
              <span className="text-yellow-400 font-bold">{highScore}</span>
            </div>
          </div>
        </div>

        {/* 游戏区域 - 调整为自适应布局 */}
        <div className="flex-1 flex flex-col items-center justify-start">
          <div 
            ref={gameRef}
            className="relative bg-gray-800 rounded-lg p-1"
          >
            <div 
              className="relative bg-gray-900 rounded"
              style={{
                width: `${GRID_SIZE * cellSize}px`,
                height: `${GRID_SIZE * cellSize}px`,
              }}
            >
              {/* 网格线 */}
              <div 
                className="absolute inset-0 grid"
                style={{
                  gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
                  gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`
                }}
              >
                {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => (
                  <div key={i} className="border border-gray-800/30" />
                ))}
              </div>

              {/* 蛇 */}
              {snake.map((segment, index) => (
                <motion.div
                  key={index}
                  className={`absolute ${
                    index === 0 
                      ? 'bg-gradient-to-br from-green-400 to-green-600 z-20' 
                      : 'bg-gradient-to-br from-green-500 to-green-700 z-10'
                  } rounded-sm`}
                  style={{
                    left: `${segment.x * cellSize}px`,
                    top: `${segment.y * cellSize}px`,
                    width: `${cellSize - 2}px`,
                    height: `${cellSize - 2}px`,
                  }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.1 }}
                />
              ))}

              {/* 食物 */}
              <motion.div
                className="absolute bg-gradient-to-br from-red-400 to-red-600 rounded-full z-30"
                style={{
                  left: `${food.x * cellSize + 2}px`,
                  top: `${food.y * cellSize + 2}px`,
                  width: `${cellSize - 4}px`,
                  height: `${cellSize - 4}px`,
                }}
                animate={{
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 0.5,
                  repeat: Infinity,
                }}
              />

              {/* 游戏结束/暂停覆盖层 */}
              {(!isPlaying || gameOver) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-lg flex items-center justify-center"
                >
                  <div className="text-center p-4">
                    {gameOver ? (
                      <>
                        <h2 className="text-2xl font-game font-bold text-red-400 mb-2">游戏结束!</h2>
                        <p className="text-lg text-white mb-1">
                          最终分数: <span className="text-yellow-400 font-bold">{score}</span>
                        </p>
                        {score > highScore && (
                          <p className="text-green-400 font-bold mb-3">🎉 新纪录!</p>
                        )}
                        <button
                          onClick={resetGame}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                        >
                          再来一局
                        </button>
                      </>
                    ) : (
                      <>
                        <h2 className="text-xl font-game font-bold text-white mb-3">准备开始</h2>
                        <button
                          onClick={startGame}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2 mx-auto"
                        >
                          <Play size={20} />
                          开始游戏
                        </button>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* 控制按钮 - 移动端优化，添加z-index确保按钮在最上层 */}
          <div className="mt-4 w-full max-w-xs relative z-50">
            {/* 方向控制 - 十字键布局 */}
            <div className="grid grid-cols-3 gap-2">
              <div />
              <button
                onClick={() => changeDirection('UP')}
                className="p-4 bg-gray-700 hover:bg-gray-600 active:scale-95 text-white rounded-lg transition-all flex items-center justify-center relative z-50"
                disabled={!isPlaying || gameOver}
              >
                <ChevronUp size={24} />
              </button>
              <div />
              
              <button
                onClick={() => changeDirection('LEFT')}
                className="p-4 bg-gray-700 hover:bg-gray-600 active:scale-95 text-white rounded-lg transition-all flex items-center justify-center relative z-50"
                disabled={!isPlaying || gameOver}
              >
                <ChevronLeftIcon size={24} />
              </button>
              
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`p-4 ${
                  isPlaying ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'
                } text-white rounded-lg transition-all active:scale-95 flex items-center justify-center relative z-50`}
                disabled={gameOver}
              >
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
              </button>
              
              <button
                onClick={() => changeDirection('RIGHT')}
                className="p-4 bg-gray-700 hover:bg-gray-600 active:scale-95 text-white rounded-lg transition-all flex items-center justify-center relative z-50"
                disabled={!isPlaying || gameOver}
              >
                <ChevronRight size={24} />
              </button>
              
              <div />
              <button
                onClick={() => changeDirection('DOWN')}
                className="p-4 bg-gray-700 hover:bg-gray-600 active:scale-95 text-white rounded-lg transition-all flex items-center justify-center relative z-50"
                disabled={!isPlaying || gameOver}
              >
                <ChevronDown size={24} />
              </button>
              <div />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default SnakeGame