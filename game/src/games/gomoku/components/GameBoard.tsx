import { useRef, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useGomokuStore } from '../store/gameStore'
import { useSocket } from '../hooks/useSocket'

/**
 * 五子棋棋盘组件
 * 优化了响应式设计，确保棋盘在所有设备上都能完整显示
 */
const GameBoard = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hoverCanvasRef = useRef<HTMLCanvasElement>(null)
  const { 
    board, 
    boardSize, 
    lastMove,
    myColor,
    currentPlayer,
    gameState,
    makeMove,
    roomId,
    winningLine
  } = useGomokuStore()
  
  const { sendMove } = useSocket()
  
  // 动态尺寸（根据屏幕自适应）
  const [cellSize, setCellSize] = useState(40)
  const [boardPixelSize, setBoardPixelSize] = useState(40 * boardSize)
  const [hoverPos, setHoverPos] = useState<{ row: number; col: number } | null>(null)
  const [animationFrame, setAnimationFrame] = useState(0)

  /**
   * 计算棋盘最佳尺寸
   * 确保棋盘在所有设备上都能完整显示且保持合适的大小
   */
  useEffect(() => {
    const recalcSize = () => {
      const vw = window.innerWidth
      const vh = window.innerHeight
      
      // 计算可用空间
      // 移动端使用更紧凑的布局
      const isMobile = vw < 640
      const headerHeight = isMobile ? 60 : 160   // 头部导航高度
      const titleHeight = isMobile ? 40 : 100    // 标题区域高度
      const statusHeight = isMobile ? 60 : 80    // 状态栏高度
      const footerHeight = isMobile ? 100 : 100  // 底部按钮高度（移动端增加快捷短语区）
      const padding = isMobile ? 8 : 40          // 边距（移动端减少边距）
      const safeArea = isMobile ? 20 : 0         // 安全区域
      
      // 计算可用的宽度和高度
      // 移动端使用几乎全部宽度
      const availableWidth = isMobile ? vw - padding : vw - padding * 2 - 20
      const availableHeight = vh - headerHeight - titleHeight - statusHeight - footerHeight - padding * 2 - safeArea
      
      // 取较小值确保棋盘完整显示
      const maxSize = Math.min(availableWidth, availableHeight)
      
      // 设置尺寸限制
      const minSize = isMobile ? vw - padding : 320  // 移动端使用屏幕宽度
      const maxSizeLimit = isMobile ? vw - padding : 600  // 移动端不限制最大尺寸
      
      // 计算目标尺寸
      const targetSize = isMobile 
        ? Math.min(vw - padding, availableHeight)  // 移动端优先使用屏幕宽度
        : Math.max(minSize, Math.min(maxSizeLimit, maxSize))
      
      // 计算单元格大小
      const newCellSize = Math.floor(targetSize / boardSize)
      const newBoardSize = newCellSize * boardSize
      
      setCellSize(newCellSize)
      setBoardPixelSize(newBoardSize)
      
      console.log('Board size calculation:', {
        viewport: { width: vw, height: vh },
        available: { width: availableWidth, height: availableHeight },
        target: targetSize,
        cell: newCellSize,
        board: newBoardSize,
        isMobile
      })
    }
    
    recalcSize()
    window.addEventListener('resize', recalcSize)
    window.addEventListener('orientationchange', recalcSize)  // 添加屏幕方向变化监听
    return () => {
      window.removeEventListener('resize', recalcSize)
      window.removeEventListener('orientationchange', recalcSize)
    }
  }, [boardSize])

  // 动画帧更新
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationFrame((prev) => (prev + 1) % 360)
    }, 50)
    return () => clearInterval(interval)
  }, [])

  /**
   * 绘制棋盘和棋子
   * 优化了高DPI屏幕显示效果
   */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const dpr = window.devicePixelRatio || 1
    // 物理像素尺寸
    canvas.width = Math.floor(boardPixelSize * dpr)
    canvas.height = Math.floor(boardPixelSize * dpr)
    // CSS 尺寸（布局尺寸）
    canvas.style.width = `${boardPixelSize}px`
    canvas.style.height = `${boardPixelSize}px`
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    // 缩放坐标系到逻辑像素
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    
    // 绘制棋盘背景 - 使用渐变色
    const bgGradient = ctx.createLinearGradient(0, 0, boardPixelSize, boardPixelSize)
    bgGradient.addColorStop(0, '#E8D4A8')  // 浅木色
    bgGradient.addColorStop(0.5, '#D4A76A') // 中木色
    bgGradient.addColorStop(1, '#C89F5C')   // 深木色
    ctx.fillStyle = bgGradient
    ctx.fillRect(0, 0, boardPixelSize, boardPixelSize)
    
    // 添加木纹效果
    ctx.globalAlpha = 0.1
    for (let i = 0; i < boardPixelSize; i += 3) {
      ctx.strokeStyle = '#8B4513'
      ctx.lineWidth = 0.5
      ctx.beginPath()
      ctx.moveTo(0, i + Math.sin(i * 0.02) * 2)
      ctx.lineTo(boardPixelSize, i + Math.sin(i * 0.02) * 2)
      ctx.stroke()
    }
    ctx.globalAlpha = 1.0
    
    // 绘制网格线 - 添加阴影效果
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)'
    ctx.shadowBlur = 2
    ctx.shadowOffsetX = 1
    ctx.shadowOffsetY = 1
    
    for (let i = 0; i <= boardSize; i++) {
      const lineWidth = i === 0 || i === boardSize ? 2 : 1
      ctx.strokeStyle = i === 0 || i === boardSize ? '#5D4037' : '#6D4C41'
      ctx.lineWidth = lineWidth
      
      // 垂直线
      ctx.beginPath()
      ctx.moveTo(i * cellSize, 0)
      ctx.lineTo(i * cellSize, boardPixelSize)
      ctx.stroke()
      
      // 水平线
      ctx.beginPath()
      ctx.moveTo(0, i * cellSize)
      ctx.lineTo(boardPixelSize, i * cellSize)
      ctx.stroke()
    }
    
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0
    
    // 绘制星位（天元和其他星位）- 增强视觉效果
    if (boardSize >= 9) {
      const starPoints = []
      
      if (boardSize === 9) {
        // 9路棋盘：天元
        starPoints.push([4, 4])
      } else if (boardSize === 13) {
        // 13路棋盘：天元和四个角星
        starPoints.push([6, 6], [3, 3], [3, 9], [9, 3], [9, 9])
      } else if (boardSize === 15) {
        // 15路棋盘：天元和八个星位
        starPoints.push([7, 7], [3, 3], [3, 7], [3, 11], [7, 3], [7, 11], [11, 3], [11, 7], [11, 11])
      }
      
      starPoints.forEach(([row, col]) => {
        const x = col * cellSize + cellSize / 2
        const y = row * cellSize + cellSize / 2
        const radius = Math.max(3, cellSize / 10)
        
        // 外圈
        ctx.beginPath()
        ctx.arc(x, y, radius + 1, 0, Math.PI * 2)
        ctx.fillStyle = '#5D4037'
        ctx.fill()
        
        // 内圈
        ctx.beginPath()
        ctx.arc(x, y, radius, 0, Math.PI * 2)
        ctx.fillStyle = '#3E2723'
        ctx.fill()
      })
    }
    
    // 绘制棋子
    for (let row = 0; row < boardSize; row++) {
      for (let col = 0; col < boardSize; col++) {
        if (board[row][col] !== 0) {
          drawPiece(ctx, row, col, board[row][col])
        }
      }
    }
    
    // 高亮最后落子
    if (lastMove) {
      highlightLastMove(ctx, lastMove.row, lastMove.col)
    }
    
    // 绘制获胜连线动画
    if (winningLine && winningLine.length > 0) {
      drawWinningLine(ctx)
    }
  }, [board, boardSize, lastMove, cellSize, boardPixelSize, winningLine, animationFrame])
  
  // 绘制悬停效果
  useEffect(() => {
    const canvas = hoverCanvasRef.current
    if (!canvas) return
    
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.floor(boardPixelSize * dpr)
    canvas.height = Math.floor(boardPixelSize * dpr)
    canvas.style.width = `${boardPixelSize}px`
    canvas.style.height = `${boardPixelSize}px`
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    
    // 清空画布
    ctx.clearRect(0, 0, boardPixelSize, boardPixelSize)
    
    // 绘制悬停提示
    if (hoverPos && gameState === 'playing' && currentPlayer === myColor) {
      const { row, col } = hoverPos
      if (board[row][col] === 0) {
        const x = col * cellSize + cellSize / 2
        const y = row * cellSize + cellSize / 2
        const radius = Math.max(6, cellSize / 2 - 3)
        
        // 绘制半透明预览棋子
        ctx.globalAlpha = 0.5
        
        if (myColor === 1) {
          // 黑子预览
          const gradient = ctx.createRadialGradient(x - radius/3, y - radius/3, 0, x, y, radius)
          gradient.addColorStop(0, '#666666')
          gradient.addColorStop(1, '#000000')
          ctx.fillStyle = gradient
        } else {
          // 白子预览
          const gradient = ctx.createRadialGradient(x - radius/3, y - radius/3, 0, x, y, radius)
          gradient.addColorStop(0, '#FFFFFF')
          gradient.addColorStop(1, '#E0E0E0')
          ctx.fillStyle = gradient
        }
        
        ctx.beginPath()
        ctx.arc(x, y, radius, 0, Math.PI * 2)
        ctx.fill()
        
        // 添加脉冲效果
        const pulseRadius = radius + Math.sin(animationFrame * 0.1) * 3
        ctx.strokeStyle = myColor === 1 ? '#000000' : '#FFFFFF'
        ctx.lineWidth = 2
        ctx.globalAlpha = 0.3 - Math.sin(animationFrame * 0.1) * 0.2
        ctx.beginPath()
        ctx.arc(x, y, pulseRadius, 0, Math.PI * 2)
        ctx.stroke()
        
        ctx.globalAlpha = 1.0
      }
    }
  }, [hoverPos, board, cellSize, boardPixelSize, gameState, currentPlayer, myColor, animationFrame])
  
  /**
   * 绘制棋子 - 增强视觉效果
   */
  const drawPiece = (ctx: CanvasRenderingContext2D, row: number, col: number, player: number) => {
    const x = col * cellSize + cellSize / 2
    const y = row * cellSize + cellSize / 2
    const radius = Math.max(6, cellSize / 2 - 3)
    
    // 检查是否是获胜连线中的棋子
    const isWinningPiece = winningLine?.some(pos => pos.row === row && pos.col === col)
    
    // 保存当前状态
    ctx.save()
    
    // 添加棋子阴影
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)'
    ctx.shadowBlur = 4
    ctx.shadowOffsetX = 2
    ctx.shadowOffsetY = 2
    
    if (player === 1) {
      // 黑子 - 多层渐变增强立体感
      // 底层
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.fillStyle = '#000000'
      ctx.fill()
      
      // 中层渐变
      const gradient1 = ctx.createRadialGradient(x, y, radius * 0.7, x, y, radius)
      gradient1.addColorStop(0, '#2C2C2C')
      gradient1.addColorStop(1, '#000000')
      ctx.fillStyle = gradient1
      ctx.fill()
      
      // 高光层
      ctx.shadowColor = 'transparent'
      const gradient2 = ctx.createRadialGradient(x - radius/3, y - radius/3, 0, x, y, radius)
      gradient2.addColorStop(0, 'rgba(255, 255, 255, 0.3)')
      gradient2.addColorStop(0.3, 'rgba(255, 255, 255, 0.1)')
      gradient2.addColorStop(1, 'transparent')
      ctx.fillStyle = gradient2
      ctx.fill()
      
      // 边框
      ctx.strokeStyle = isWinningPiece ? '#FFD700' : '#1a1a1a'
      ctx.lineWidth = isWinningPiece ? 3 : 1.5
      ctx.stroke()
      
    } else {
      // 白子 - 珍珠质感
      // 底层
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.fillStyle = '#F5F5F5'
      ctx.fill()
      
      // 珍珠光泽渐变
      const gradient1 = ctx.createRadialGradient(x - radius/4, y - radius/4, 0, x, y, radius)
      gradient1.addColorStop(0, '#FFFFFF')
      gradient1.addColorStop(0.3, '#FAFAFA')
      gradient1.addColorStop(0.7, '#F0F0F0')
      gradient1.addColorStop(1, '#E8E8E8')
      ctx.fillStyle = gradient1
      ctx.fill()
      
      // 彩虹光泽效果
      ctx.shadowColor = 'transparent'
      const gradient2 = ctx.createRadialGradient(x - radius/3, y - radius/3, 0, x, y, radius * 0.8)
      gradient2.addColorStop(0, 'rgba(200, 200, 255, 0.3)')
      gradient2.addColorStop(0.5, 'rgba(255, 200, 200, 0.2)')
      gradient2.addColorStop(1, 'transparent')
      ctx.fillStyle = gradient2
      ctx.fill()
      
      // 边框
      ctx.strokeStyle = isWinningPiece ? '#FFD700' : '#CCCCCC'
      ctx.lineWidth = isWinningPiece ? 3 : 2
      ctx.stroke()
    }
    
    // 获胜棋子的特殊效果
    if (isWinningPiece) {
      // 金色光晕
      ctx.shadowColor = '#FFD700'
      ctx.shadowBlur = 10
      ctx.strokeStyle = '#FFD700'
      ctx.lineWidth = 2
      ctx.globalAlpha = 0.5 + Math.sin(animationFrame * 0.1) * 0.3
      ctx.beginPath()
      ctx.arc(x, y, radius + 4, 0, Math.PI * 2)
      ctx.stroke()
    }
    
    ctx.restore()
  }
  
  /**
   * 高亮最后落子位置 - 动画效果
   */
  const highlightLastMove = (ctx: CanvasRenderingContext2D, row: number, col: number) => {
    const x = col * cellSize + cellSize / 2
    const y = row * cellSize + cellSize / 2
    const size = Math.max(8, cellSize / 3)
    
    ctx.save()
    
    // 呼吸灯效果
    const alpha = 0.6 + Math.sin(animationFrame * 0.1) * 0.4
    ctx.globalAlpha = alpha
    
    // 绘制四个角标记
    ctx.strokeStyle = '#FF6B6B'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    
    const cornerLength = size / 3
    const offset = size / 2
    
    // 左上角
    ctx.beginPath()
    ctx.moveTo(x - offset, y - offset + cornerLength)
    ctx.lineTo(x - offset, y - offset)
    ctx.lineTo(x - offset + cornerLength, y - offset)
    ctx.stroke()
    
    // 右上角
    ctx.beginPath()
    ctx.moveTo(x + offset - cornerLength, y - offset)
    ctx.lineTo(x + offset, y - offset)
    ctx.lineTo(x + offset, y - offset + cornerLength)
    ctx.stroke()
    
    // 右下角
    ctx.beginPath()
    ctx.moveTo(x + offset, y + offset - cornerLength)
    ctx.lineTo(x + offset, y + offset)
    ctx.lineTo(x + offset - cornerLength, y + offset)
    ctx.stroke()
    
    // 左下角
    ctx.beginPath()
    ctx.moveTo(x - offset + cornerLength, y + offset)
    ctx.lineTo(x - offset, y + offset)
    ctx.lineTo(x - offset, y + offset - cornerLength)
    ctx.stroke()
    
    ctx.restore()
  }
  
  /**
   * 绘制获胜连线 - 动画效果
   */
  const drawWinningLine = (ctx: CanvasRenderingContext2D) => {
    if (!winningLine || winningLine.length < 2) return
    
    ctx.save()
    
    // 绘制连线路径
    ctx.strokeStyle = '#FFD700'
    ctx.lineWidth = 4
    ctx.lineCap = 'round'
    ctx.shadowColor = '#FFD700'
    ctx.shadowBlur = 20
    ctx.setLineDash([10, 5])
    ctx.lineDashOffset = -animationFrame * 0.5
    
    ctx.beginPath()
    winningLine.forEach((pos, index) => {
      const x = pos.col * cellSize + cellSize / 2
      const y = pos.row * cellSize + cellSize / 2
      
      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })
    ctx.stroke()
    
    // 绘制粒子效果
    ctx.setLineDash([])
    winningLine.forEach((pos, index) => {
      const x = pos.col * cellSize + cellSize / 2
      const y = pos.row * cellSize + cellSize / 2
      
      // 星星效果
      const starSize = 3 + Math.sin((animationFrame + index * 20) * 0.1) * 2
      ctx.fillStyle = '#FFD700'
      ctx.globalAlpha = 0.6 + Math.sin((animationFrame + index * 20) * 0.1) * 0.4
      
      // 绘制四角星
      ctx.beginPath()
      for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI / 4) + animationFrame * 0.02
        const r = i % 2 === 0 ? starSize : starSize / 2
        const sx = x + Math.cos(angle) * r
        const sy = y + Math.sin(angle) * r
        if (i === 0) {
          ctx.moveTo(sx, sy)
        } else {
          ctx.lineTo(sx, sy)
        }
      }
      ctx.closePath()
      ctx.fill()
    })
    
    ctx.restore()
  }
  
  /**
   * 处理点击和触摸事件
   * 统一处理鼠标点击和触摸操作
   */
  const handleClick = (event: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (gameState !== 'playing') return
    if (currentPlayer !== myColor) return
    
    const container = event.currentTarget
    const rect = container.getBoundingClientRect()
    
    event.preventDefault() // 防止触摸时的默认行为
    
    let clientX: number, clientY: number
    
    // 处理触摸和鼠标事件
    if ('touches' in event) {
      if (event.touches.length === 0) return
      clientX = event.touches[0].clientX
      clientY = event.touches[0].clientY
    } else {
      clientX = event.clientX
      clientY = event.clientY
    }
    
    const x = clientX - rect.left
    const y = clientY - rect.top
    
    const col = Math.floor(x / cellSize)
    const row = Math.floor(y / cellSize)
    
    if (makeMove(row, col)) {
      // 发送落子信息给对手
      if (roomId) {
        sendMove(roomId, row, col)
      }
    }
  }
  
  /**
   * 处理鼠标移动（仅在非触摸设备上显示光标提示）
   */
  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (gameState !== 'playing' || currentPlayer !== myColor) {
      setHoverPos(null)
      return
    }
    
    // 检测是否为触摸设备
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    if (isTouchDevice) return
    
    const container = event.currentTarget
    const rect = container.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    
    const col = Math.floor(x / cellSize)
    const row = Math.floor(y / cellSize)
    
    if (row >= 0 && row < boardSize && col >= 0 && col < boardSize && board[row][col] === 0) {
      setHoverPos({ row, col })
    } else {
      setHoverPos(null)
    }
  }
  
  /**
   * 处理鼠标离开
   */
  const handleMouseLeave = () => {
    setHoverPos(null)
  }
  
  /**
   * 处理触摸开始事件
   */
  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    handleClick(event)
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="inline-block"
    >
      <div 
        className="relative pixel-container p-1 sm:p-4 bg-gradient-to-br from-amber-900/20 to-amber-800/20"
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        style={{ cursor: gameState === 'playing' && currentPlayer === myColor ? 'pointer' : 'not-allowed' }}
      >
        {/* 主棋盘画布 */}
        <canvas
          ref={canvasRef}
          width={boardPixelSize}
          height={boardPixelSize}
          className="block"
          style={{ imageRendering: 'auto' }}
        />
        {/* 悬停效果画布 */}
        <canvas
          ref={hoverCanvasRef}
          width={boardPixelSize}
          height={boardPixelSize}
          className="absolute top-1 left-1 sm:top-4 sm:left-4 pointer-events-none"
          style={{ imageRendering: 'auto' }}
        />
      </div>
    </motion.div>
  )
}

export default GameBoard