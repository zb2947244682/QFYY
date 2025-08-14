import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, RotateCcw, Trophy, Heart, Pause, Play, ChevronLeft, ChevronRight } from 'lucide-react'

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
  const [movingDirection, setMovingDirection] = useState<'left' | 'right' | null>(null)

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
    
    // 球与砖块碰撞 - 改进的碰撞检测
    let allDestroyed = true
    bricks.forEach(brick => {
      if (!brick.destroyed) {
        allDestroyed = false
        
        // 计算球心到砖块最近的点
        const closestX = Math.max(brick.x, Math.min(ball.x, brick.x + brick.width))
        const closestY = Math.max(brick.y, Math.min(ball.y, brick.y + brick.height))
        
        // 计算距离
        const distanceX = ball.x - closestX
        const distanceY = ball.y - closestY
        const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY)
        
        // 如果球与砖块碰撞
        if (distance < ball.radius) {
          brick.hits--
          
          if (brick.hits <= 0) {
            brick.destroyed = true
            setScore(prev => prev + brick.points)
          } else {
            // 根据剩余击打次数调整颜色透明度（修复颜色处理问题）
            const originalColor = BRICK_COLORS.find(c => brick.points === c.points)
            if (originalColor) {
              const maxHits = originalColor.hits
              const alpha = 0.5 + (brick.hits / maxHits) * 0.5
              // 使用CSS rgba格式，避免直接修改hex颜色
              brick.color = `rgba(${parseInt(originalColor.color.slice(1, 3), 16)}, ${parseInt(originalColor.color.slice(3, 5), 16)}, ${parseInt(originalColor.color.slice(5, 7), 16)}, ${alpha})`
            }
          }
          
          // 改进的反弹逻辑
          // 判断碰撞方向
          const overlapLeft = ball.x + ball.radius - brick.x
          const overlapRight = brick.x + brick.width - (ball.x - ball.radius)
          const overlapTop = ball.y + ball.radius - brick.y
          const overlapBottom = brick.y + brick.height - (ball.y - ball.radius)
          
          // 找出最小的重叠
          const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom)
          
          // 根据最小重叠确定反弹方向
          if (minOverlap === overlapLeft || minOverlap === overlapRight) {
            ball.dx = -ball.dx
            // 稍微调整位置以避免卡住
            if (minOverlap === overlapLeft) {
              ball.x = brick.x - ball.radius - 1
            } else {
              ball.x = brick.x + brick.width + ball.radius + 1
            }
          } else {
            ball.dy = -ball.dy
            // 稍微调整位置以避免卡住
            if (minOverlap === overlapTop) {
              ball.y = brick.y - ball.radius - 1
            } else {
              ball.y = brick.y + brick.height + ball.radius + 1
            }
          }
          
          // 避免多次碰撞检测
          return
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

  // 清理函数
  useEffect(() => {
    return () => {
      setMovingDirection(null)
    }
  }, [])

  // 键盘控制
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isPlaying || gameOver) return
      
      if (e.key === 'ArrowLeft') {
        setPaddle(prev => ({
          ...prev,
          x: Math.max(0, prev.x - 20)
        }))
      } else if (e.key === 'ArrowRight') {
        setPaddle(prev => ({
          ...prev,
          x: Math.min(CANVAS_WIDTH - PADDLE_WIDTH, prev.x + 20)
        }))
      }
    }
    
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isPlaying, gameOver])

  // 持续移动挡板（优化移动速度和响应）
  useEffect(() => {
    if (!isPlaying || gameOver || !movingDirection) return
    
    const moveInterval = setInterval(() => {
      setPaddle(prev => ({
        ...prev,
        x: movingDirection === 'left' 
          ? Math.max(0, prev.x - 15) // 增加移动速度
          : Math.min(CANVAS_WIDTH - PADDLE_WIDTH, prev.x + 15)
      }))
    }, 20) // 减少间隔时间，使移动更流畅
    
    return () => clearInterval(moveInterval)
  }, [isPlaying, gameOver, movingDirection])

  // 移动挡板控制函数
  const startMovingPaddle = (direction: 'left' | 'right') => {
    if (!isPlaying || gameOver) return
    setMovingDirection(direction)
  }

  const stopMovingPaddle = () => {
    setMovingDirection(null)
  }

  // 点击控制 - 点击画布左右两侧
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPlaying || gameOver) return
    
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    
    const x = e.clientX - rect.left
    
    // 直接移动挡板到点击位置附近
    setPaddle(prev => ({
      ...prev,
      x: Math.max(0, Math.min(CANVAS_WIDTH - PADDLE_WIDTH, x - PADDLE_WIDTH / 2))
    }))
  }

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

  // 获取画布大小（根据屏幕尺寸自适应）
  const getCanvasScale = () => {
    if (typeof window !== 'undefined') {
      const screenWidth = window.innerWidth
      const maxWidth = Math.min(screenWidth - 32, 600)
      return maxWidth / CANVAS_WIDTH
    }
    return 1
  }

  const [canvasScale, setCanvasScale] = useState(getCanvasScale())

  useEffect(() => {
    const handleResize = () => {
      setCanvasScale(getCanvasScale())
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex flex-col p-2 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-3xl mx-auto flex flex-col h-screen"
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
            <h1 className="text-xl font-game font-bold text-white">打砖块</h1>
            <button
              onClick={resetGame}
              className="p-2 text-white"
            >
              <RotateCcw size={18} />
            </button>
          </div>

          {/* 游戏信息 - 精简 */}
          <div className="flex justify-between items-center text-sm">
            <div className="flex gap-4">
              <div className="flex items-center gap-1">
                <span className="text-gray-400">分数:</span>
                <span className="text-white font-bold">{score}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-gray-400">等级:</span>
                <span className="text-white font-bold">{level}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">生命:</span>
              <div className="flex gap-1">
                {[...Array(3)].map((_, i) => (
                  <Heart
                    key={i}
                    size={16}
                    className={i < lives ? 'text-red-500 fill-red-500' : 'text-gray-600'}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Trophy size={16} className="text-yellow-400" />
              <span className="text-yellow-400 font-bold">{highScore}</span>
            </div>
          </div>
        </div>

        {/* 游戏区域 */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="relative">
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className="bg-gray-800 rounded-lg border-2 border-gray-700 cursor-pointer"
              onClick={handleCanvasClick}
              style={{ 
                width: `${CANVAS_WIDTH * canvasScale}px`,
                height: `${CANVAS_HEIGHT * canvasScale}px`,
                imageRendering: 'pixelated'
              }}
            />
            
            {/* 游戏状态覆盖层 */}
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
                        onClick={() => setIsPlaying(true)}
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

          {/* 控制按钮 - 移动端优化 */}
          <div className="mt-4 w-full max-w-xs">
            <div className="grid grid-cols-3 gap-2">
              <button
                onMouseDown={() => startMovingPaddle('left')}
                onMouseUp={stopMovingPaddle}
                onMouseLeave={stopMovingPaddle}
                onTouchStart={(e) => {
                  e.preventDefault()
                  startMovingPaddle('left')
                }}
                onTouchEnd={(e) => {
                  e.preventDefault()
                  stopMovingPaddle()
                }}
                onTouchCancel={(e) => {
                  e.preventDefault()
                  stopMovingPaddle()
                }}
                className="p-4 bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-white rounded-lg transition-all flex items-center justify-center touch-none select-none"
                disabled={!isPlaying || gameOver}
              >
                <ChevronLeft size={24} />
              </button>
              
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`p-4 ${
                  isPlaying ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'
                } text-white rounded-lg transition-all active:scale-95 flex items-center justify-center`}
                disabled={gameOver}
              >
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
              </button>
              
              <button
                onMouseDown={() => startMovingPaddle('right')}
                onMouseUp={stopMovingPaddle}
                onMouseLeave={stopMovingPaddle}
                onTouchStart={(e) => {
                  e.preventDefault()
                  startMovingPaddle('right')
                }}
                onTouchEnd={(e) => {
                  e.preventDefault()
                  stopMovingPaddle()
                }}
                onTouchCancel={(e) => {
                  e.preventDefault()
                  stopMovingPaddle()
                }}
                className="p-4 bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-white rounded-lg transition-all flex items-center justify-center touch-none select-none"
                disabled={!isPlaying || gameOver}
              >
                <ChevronRight size={24} />
              </button>
            </div>
            
            <div className="mt-2 text-center text-xs text-gray-400">
              点击画布或使用按钮控制挡板
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default BreakoutGame