import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, RotateCcw, Trophy, Pause, Play } from 'lucide-react'

type Position = { x: number; y: number }
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'

const GRID_SIZE = 20
const INITIAL_SPEED = 150
const SPEED_INCREMENT = 5

const SnakeGame = () => {
  const navigate = useNavigate()
  const gameRef = useRef<HTMLDivElement>(null)
  const [snake, setSnake] = useState<Position[]>([{ x: 10, y: 10 }])
  const [food, setFood] = useState<Position>({ x: 15, y: 15 })
  const [direction, setDirection] = useState<Direction>('RIGHT')
  const [gameOver, setGameOver] = useState(false)
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('snake-high-score')
    return saved ? parseInt(saved) : 0
  })
  const [isPlaying, setIsPlaying] = useState(false)
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null)
  const directionRef = useRef<Direction>(direction)
  const [speed, setSpeed] = useState(INITIAL_SPEED)

  // 生成随机食物位置
  const generateFood = useCallback((currentSnake: Position[]): Position => {
    let newFood: Position
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE)
      }
    } while (currentSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y))
    return newFood
  }, [])

  // 检查碰撞
  const checkCollision = useCallback((head: Position, body: Position[]): boolean => {
    // 撞墙
    if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
      return true
    }
    // 撞自己
    return body.some(segment => segment.x === head.x && segment.y === head.y)
  }, [])

  // 移动蛇
  const moveSnake = useCallback(() => {
    if (gameOver || !isPlaying) return

    setSnake(currentSnake => {
      const newSnake = [...currentSnake]
      const head = { ...newSnake[0] }

      // 根据方向移动
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
        // 更新最高分
        if (score > highScore) {
          setHighScore(score)
          localStorage.setItem('snake-high-score', score.toString())
        }
        return currentSnake
      }

      // 添加新头部
      newSnake.unshift(head)

      // 检查是否吃到食物
      if (head.x === food.x && head.y === food.y) {
        setScore(prev => prev + 10)
        setFood(generateFood(newSnake))
        // 加快速度
        setSpeed(prev => Math.max(50, prev - SPEED_INCREMENT))
      } else {
        // 没吃到食物，删除尾部
        newSnake.pop()
      }

      return newSnake
    })
  }, [gameOver, isPlaying, food, checkCollision, generateFood, score, highScore])

  // 游戏循环
  useEffect(() => {
    const interval = setInterval(moveSnake, speed)
    return () => clearInterval(interval)
  }, [moveSnake, speed])

  // 键盘控制
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (gameOver || !isPlaying) return

      const key = e.key
      let newDirection = directionRef.current

      switch (key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          if (directionRef.current !== 'DOWN') newDirection = 'UP'
          break
        case 'ArrowDown':
        case 's':
        case 'S':
          if (directionRef.current !== 'UP') newDirection = 'DOWN'
          break
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (directionRef.current !== 'RIGHT') newDirection = 'LEFT'
          break
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (directionRef.current !== 'LEFT') newDirection = 'RIGHT'
          break
        case ' ':
          e.preventDefault()
          setIsPlaying(prev => !prev)
          break
      }

      if (newDirection !== directionRef.current) {
        directionRef.current = newDirection
        setDirection(newDirection)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [gameOver, isPlaying])

  // 触摸控制
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    setTouchStart({ x: touch.clientX, y: touch.clientY })
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart || gameOver || !isPlaying) return

    const touch = e.changedTouches[0]
    const deltaX = touch.clientX - touchStart.x
    const deltaY = touch.clientY - touchStart.y

    // 判断滑动方向
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // 水平滑动
      if (deltaX > 30 && directionRef.current !== 'LEFT') {
        directionRef.current = 'RIGHT'
        setDirection('RIGHT')
      } else if (deltaX < -30 && directionRef.current !== 'RIGHT') {
        directionRef.current = 'LEFT'
        setDirection('LEFT')
      }
    } else {
      // 垂直滑动
      if (deltaY > 30 && directionRef.current !== 'UP') {
        directionRef.current = 'DOWN'
        setDirection('DOWN')
      } else if (deltaY < -30 && directionRef.current !== 'DOWN') {
        directionRef.current = 'UP'
        setDirection('UP')
      }
    }

    setTouchStart(null)
  }

  // 重新开始游戏
  const resetGame = () => {
    setSnake([{ x: 10, y: 10 }])
    setFood({ x: 15, y: 15 })
    setDirection('RIGHT')
    directionRef.current = 'RIGHT'
    setGameOver(false)
    setScore(0)
    setSpeed(INITIAL_SPEED)
    setIsPlaying(false)
  }

  // 开始游戏
  const startGame = () => {
    if (gameOver) {
      resetGame()
    } else {
      setIsPlaying(true)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
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
            <h1 className="text-2xl font-game font-bold text-white">贪吃蛇</h1>
            <button
              onClick={resetGame}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              <RotateCcw size={16} />
              <span className="font-game">重新开始</span>
            </button>
          </div>

          {/* 分数显示 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-700/50 rounded-lg p-3 text-center">
              <div className="text-gray-400 text-sm font-game">当前分数</div>
              <div className="text-2xl font-bold text-white font-game">{score}</div>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-3 text-center">
              <div className="text-gray-400 text-sm font-game flex items-center justify-center gap-1">
                <Trophy size={14} />
                最高分数
              </div>
              <div className="text-2xl font-bold text-yellow-400 font-game">{highScore}</div>
            </div>
          </div>
        </div>

        {/* 游戏区域 */}
        <div 
          ref={gameRef}
          className="bg-gray-900 border border-gray-700 p-4 rounded-b-xl relative"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div 
            className="relative bg-gray-800 rounded-lg"
            style={{
              width: `${GRID_SIZE * 16}px`,
              height: `${GRID_SIZE * 16}px`,
              maxWidth: '100%',
              aspectRatio: '1/1'
            }}
          >
            {/* 网格背景 */}
            <div className="absolute inset-0 grid grid-cols-20 grid-rows-20">
              {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => (
                <div
                  key={i}
                  className="border border-gray-700/20"
                />
              ))}
            </div>

            {/* 蛇身 */}
            <AnimatePresence>
              {snake.map((segment, index) => (
                <motion.div
                  key={`${segment.x}-${segment.y}-${index}`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className={`absolute ${
                    index === 0 
                      ? 'bg-gradient-to-br from-green-400 to-green-600 z-20' 
                      : 'bg-gradient-to-br from-green-500 to-green-700 z-10'
                  } rounded-sm`}
                  style={{
                    left: `${segment.x * 16}px`,
                    top: `${segment.y * 16}px`,
                    width: '14px',
                    height: '14px',
                    margin: '1px'
                  }}
                />
              ))}
            </AnimatePresence>

            {/* 食物 */}
            <motion.div
              key={`${food.x}-${food.y}`}
              initial={{ scale: 0 }}
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
              className="absolute bg-gradient-to-br from-red-400 to-red-600 rounded-full z-30"
              style={{
                left: `${food.x * 16}px`,
                top: `${food.y * 16}px`,
                width: '14px',
                height: '14px',
                margin: '1px'
              }}
            />

            {/* 游戏状态覆盖层 */}
            {(!isPlaying || gameOver) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-lg flex items-center justify-center z-40"
              >
                <div className="text-center">
                  {gameOver ? (
                    <>
                      <h2 className="text-3xl font-game font-bold text-red-400 mb-2">游戏结束!</h2>
                      <p className="text-xl font-game text-white mb-4">得分: {score}</p>
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
                        {score === 0 ? '开始游戏' : '继续游戏'}
                      </button>
                      <div className="mt-4 text-gray-400 text-sm font-game">
                        <p>使用方向键或WASD控制</p>
                        <p>手机上滑动屏幕控制方向</p>
                        <p>空格键暂停/继续</p>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </div>

          {/* 移动端控制按钮 */}
          <div className="mt-4 flex justify-center">
            <button
              onClick={() => setIsPlaying(prev => !prev)}
              className={`px-6 py-3 ${
                isPlaying 
                  ? 'bg-orange-600 hover:bg-orange-700' 
                  : 'bg-green-600 hover:bg-green-700'
              } text-white font-game rounded-lg transition-colors flex items-center gap-2`}
            >
              {isPlaying ? (
                <>
                  <Pause size={20} />
                  暂停
                </>
              ) : (
                <>
                  <Play size={20} />
                  {score === 0 ? '开始' : '继续'}
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default SnakeGame