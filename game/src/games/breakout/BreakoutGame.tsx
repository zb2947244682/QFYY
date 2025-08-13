import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, RotateCcw, Trophy, Heart, Pause, Play } from 'lucide-react'

interface Ball {
  x: number
  y: number
  dx: number
  dy: number
  radius: number
}

interface Paddle {
  x: number
  y: number
  width: number
  height: number
}

interface Brick {
  x: number
  y: number
  width: number
  height: number
  color: string
  points: number
  hits: number
  destroyed: boolean
}

const CANVAS_WIDTH = 600
const CANVAS_HEIGHT = 400
const PADDLE_WIDTH = 100
const PADDLE_HEIGHT = 10
const BALL_RADIUS = 8
const BRICK_WIDTH = 75
const BRICK_HEIGHT = 20
const BRICK_PADDING = 10
const BRICK_OFFSET_TOP = 60
const BRICK_OFFSET_LEFT = 35
const BRICK_ROWS = 5
const BRICK_COLS = 6

const BRICK_COLORS = [
  { color: '#ef4444', points: 50, hits: 3 },  // 红色 - 3次
  { color: '#f97316', points: 40, hits: 2 },  // 橙色 - 2次
  { color: '#eab308', points: 30, hits: 2 },  // 黄色 - 2次
  { color: '#22c55e', points: 20, hits: 1 },  // 绿色 - 1次
  { color: '#06b6d4', points: 10, hits: 1 },  // 青色 - 1次
]

const BreakoutGame = () => {
  const navigate = useNavigate()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const [isPlaying, setIsPlaying] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [level, setLevel] = useState(1)
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('breakout-high-score')
    return saved ? parseInt(saved) : 0
  })
  
  const [ball, setBall] = useState<Ball>({
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT - 30,
    dx: 3,
    dy: -3,
    radius: BALL_RADIUS
  })
  
  const [paddle, setPaddle] = useState<Paddle>({
    x: (CANVAS_WIDTH - PADDLE_WIDTH) / 2,
    y: CANVAS_HEIGHT - PADDLE_HEIGHT - 10,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT
  })
  
  const [bricks, setBricks] = useState<Brick[]>([])

  // 初始化砖块
  const initBricks = useCallback(() => {
    const newBricks: Brick[] = []
    for (let r = 0; r < BRICK_ROWS; r++) {
      for (let c = 0; c < BRICK_COLS; c++) {
        const brickConfig = BRICK_COLORS[Math.min(r, BRICK_COLORS.length - 1)]
        newBricks.push({
          x: c * (BRICK_WIDTH + BRICK_PADDING) + BRICK_OFFSET_LEFT,
          y: r * (BRICK_HEIGHT + BRICK_PADDING) + BRICK_OFFSET_TOP,
          width: BRICK_WIDTH,
          height: BRICK_HEIGHT,
          color: brickConfig.color,
          points: brickConfig.points,
          hits: brickConfig.hits,
          destroyed: false
        })
      }
    }
    setBricks(newBricks)
  }, [])

  // 重置游戏
  const resetGame = () => {
    setBall({
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT - 30,
      dx: 3 + level * 0.5,
      dy: -(3 + level * 0.5),
      radius: BALL_RADIUS
    })
    setPaddle({
      x: (CANVAS_WIDTH - PADDLE_WIDTH) / 2,
      y: CANVAS_HEIGHT - PADDLE_HEIGHT - 10,
      width: PADDLE_WIDTH,
      height: PADDLE_HEIGHT
    })
    initBricks()
    setScore(0)
    setLives(3)
    setLevel(1)
    setGameOver(false)
    setIsPlaying(false)
  }

  // 重置球的位置
  const resetBall = () => {
    setBall({
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT - 30,
      dx: 3 + level * 0.5,
      dy: -(3 + level * 0.5),
      radius: BALL_RADIUS
    })
    setPaddle({
      x: (CANVAS_WIDTH - PADDLE_WIDTH) / 2,
      y: CANVAS_HEIGHT - PADDLE_HEIGHT - 10,
      width: PADDLE_WIDTH,
      height: PADDLE_HEIGHT
    })
  }

  // 下一关
  const nextLevel = () => {
    setLevel(prev => prev + 1)
    setBall({
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT - 30,
      dx: 3 + (level + 1) * 0.5,
      dy: -(3 + (level + 1) * 0.5),
      radius: BALL_RADIUS
    })
    initBricks()
  }

  // 碰撞检测
  const collisionDetection = useCallback(() => {
    // 球与墙壁碰撞
    if (ball.x + ball.radius > CANVAS_WIDTH || ball.x - ball.radius < 0) {
      ball.dx = -ball.dx
    }
    if (ball.y - ball.radius < 0) {
      ball.dy = -ball.dy
    }
    
    // 球掉落
    if (ball.y + ball.radius > CANVAS_HEIGHT) {
      setLives(prev => {
        const newLives = prev - 1
        if (newLives <= 0) {
          setGameOver(true)
          setIsPlaying(false)
          if (score > highScore) {
            setHighScore(score)
            localStorage.setItem('breakout-high-score', score.toString())
          }
        } else {
          resetBall()
        }
        return newLives
      })
    }
    
    // 球与挡板碰撞
    if (
      ball.x > paddle.x &&
      ball.x < paddle.x + paddle.width &&
      ball.y + ball.radius > paddle.y &&
      ball.y - ball.radius < paddle.y + paddle.height
    ) {
      // 根据撞击位置调整反弹角度
      const hitPos = (ball.x - paddle.x) / paddle.width
      ball.dx = 8 * (hitPos - 0.5)
      ball.dy = -ball.dy
    }
    
    // 球与砖块碰撞
    let allDestroyed = true
    bricks.forEach(brick => {
      if (!brick.destroyed) {
        allDestroyed = false
        if (
          ball.x > brick.x &&
          ball.x < brick.x + brick.width &&
          ball.y > brick.y &&
          ball.y < brick.y + brick.height
        ) {
          ball.dy = -ball.dy
          brick.hits--
          
          if (brick.hits <= 0) {
            brick.destroyed = true
            setScore(prev => prev + brick.points)
          } else {
            // 降低砖块颜色强度表示损坏
            const alpha = brick.hits / BRICK_COLORS.find(c => c.color === brick.color)!.hits
            brick.color = brick.color + Math.floor(alpha * 255).toString(16).padStart(2, '0')
          }
        }
      }
    })
    
    // 检查是否通关
    if (allDestroyed) {
      nextLevel()
    }
  }, [ball, paddle, bricks, score, highScore])

  // 游戏循环
  const gameLoop = useCallback(() => {
    if (!isPlaying || gameOver) return
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // 清空画布
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    
    // 绘制砖块
    bricks.forEach(brick => {
      if (!brick.destroyed) {
        ctx.fillStyle = brick.color
        ctx.fillRect(brick.x, brick.y, brick.width, brick.height)
        
        // 绘制砖块边框
        ctx.strokeStyle = '#1f2937'
        ctx.strokeRect(brick.x, brick.y, brick.width, brick.height)
      }
    })
    
    // 绘制挡板
    const gradient = ctx.createLinearGradient(paddle.x, paddle.y, paddle.x, paddle.y + paddle.height)
    gradient.addColorStop(0, '#8b5cf6')
    gradient.addColorStop(1, '#7c3aed')
    ctx.fillStyle = gradient
    ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height)
    
    // 绘制球
    ctx.beginPath()
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2)
    ctx.fillStyle = '#ffffff'
    ctx.fill()
    ctx.closePath()
    
    // 更新球的位置
    ball.x += ball.dx
    ball.y += ball.dy
    
    // 碰撞检测
    collisionDetection()
    
    animationRef.current = requestAnimationFrame(gameLoop)
  }, [isPlaying, gameOver, ball, paddle, bricks, collisionDetection])

  // 鼠标控制
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current || !isPlaying) return
      
      const rect = canvasRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      
      setPaddle(prev => ({
        ...prev,
        x: Math.max(0, Math.min(CANVAS_WIDTH - PADDLE_WIDTH, x - PADDLE_WIDTH / 2))
      }))
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [isPlaying])

  // 触摸控制
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!canvasRef.current || !isPlaying) return
    
    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.touches[0].clientX - rect.left
    
    setPaddle(prev => ({
      ...prev,
      x: Math.max(0, Math.min(CANVAS_WIDTH - PADDLE_WIDTH, x - PADDLE_WIDTH / 2))
    }))
  }

  // 键盘控制
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isPlaying) {
        if (e.key === ' ') {
          e.preventDefault()
          setIsPlaying(true)
        }
        return
      }
      
      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          setPaddle(prev => ({
            ...prev,
            x: Math.max(0, prev.x - 20)
          }))
          break
        case 'ArrowRight':
        case 'd':
        case 'D':
          setPaddle(prev => ({
            ...prev,
            x: Math.min(CANVAS_WIDTH - PADDLE_WIDTH, prev.x + 20)
          }))
          break
        case ' ':
        case 'p':
        case 'P':
          e.preventDefault()
          setIsPlaying(prev => !prev)
          break
      }
    }
    
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isPlaying])

  // 游戏循环启动
  useEffect(() => {
    if (isPlaying && !gameOver) {
      animationRef.current = requestAnimationFrame(gameLoop)
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isPlaying, gameOver, gameLoop])

  // 初始化游戏
  useEffect(() => {
    initBricks()
  }, [initBricks])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex flex-col items-center justify-center p-4">
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
            <h1 className="text-2xl font-game font-bold text-white">打砖块</h1>
            <button
              onClick={resetGame}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              <RotateCcw size={16} />
              <span className="font-game">重置</span>
            </button>
          </div>

          {/* 游戏信息 */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-gray-700/50 rounded-lg p-3 text-center">
              <div className="text-gray-400 text-sm font-game">分数</div>
              <div className="text-xl font-bold text-white font-game">{score}</div>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-3 text-center">
              <div className="text-gray-400 text-sm font-game flex items-center justify-center gap-1">
                <Heart size={14} />
                生命
              </div>
              <div className="text-xl font-bold text-red-400 font-game">{lives}</div>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-3 text-center">
              <div className="text-gray-400 text-sm font-game">关卡</div>
              <div className="text-xl font-bold text-green-400 font-game">{level}</div>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-3 text-center">
              <div className="text-gray-400 text-sm font-game flex items-center justify-center gap-1">
                <Trophy size={14} />
                最高分
              </div>
              <div className="text-xl font-bold text-yellow-400 font-game">{highScore}</div>
            </div>
          </div>
        </div>

        {/* 游戏区域 */}
        <div className="bg-gray-900 border border-gray-700 p-6 rounded-b-xl">
          <div className="relative flex justify-center">
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className="bg-gray-800 rounded-lg border-2 border-gray-700"
              onTouchMove={handleTouchMove}
              style={{ maxWidth: '100%', height: 'auto' }}
            />
            
            {/* 游戏状态覆盖层 */}
            {(!isPlaying || gameOver) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-lg flex items-center justify-center"
              >
                <div className="text-center p-6">
                  {gameOver ? (
                    <>
                      <h2 className="text-3xl font-game font-bold text-red-400 mb-2">游戏结束!</h2>
                      <p className="text-xl font-game text-white mb-2">得分: {score}</p>
                      {score > highScore && (
                        <p className="text-lg font-game text-yellow-400 mb-4">🎉 新记录!</p>
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
                        onClick={() => setIsPlaying(true)}
                        className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-game rounded-lg transition-colors flex items-center gap-2 mx-auto"
                      >
                        <Play size={20} />
                        {score === 0 ? '开始游戏' : '继续'}
                      </button>
                      <div className="mt-4 text-gray-400 text-sm font-game">
                        <p>使用鼠标或触摸控制挡板</p>
                        <p>← → 或 A/D 键盘控制</p>
                        <p>空格键暂停/继续</p>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </div>

          {/* 移动端控制提示 */}
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

export default BreakoutGame