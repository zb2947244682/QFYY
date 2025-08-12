import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useGomokuStore } from '../store/gameStore'
import { useSocket } from '../hooks/useSocket'

// 定义Position类型
type Position = {
  row: number
  col: number
}

/**
 * 五子棋游戏棋盘组件
 * 使用Canvas绘制棋盘和棋子，支持动画效果
 */
const GameBoard = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hoverCanvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [cellSize, setCellSize] = useState(40)
  const [boardPixelSize, setBoardPixelSize] = useState(520)
  const [canvasScale, setCanvasScale] = useState(1)
  const [hoverPos, setHoverPos] = useState<Position | null>(null)
  
  const { 
    board, 
    currentPlayer, 
    gameState,
    makeMove,
    myColor,
    roomId,
    lastMove,
    winningLine
  } = useGomokuStore()
  
  const { sendMove } = useSocket()
  const boardSize = board.length

  /**
   * 计算棋盘最佳尺寸
   * 确保棋盘在所有设备上都能完整显示且保持合适的大小
   */
  useEffect(() => {
    const recalcSize = () => {
      const vw = window.innerWidth
      const vh = window.innerHeight
      
      // 获取设备像素比
      const dpr = window.devicePixelRatio || 1
      
      // 计算可用空间
      // 移动端使用更紧凑的布局
      const isMobile = vw < 640
      
      if (isMobile) {
        // 移动端：确保棋盘居中且适配小屏幕（最小375x667）
        const headerHeight = 35  // 顶部标题高度（减小）
        const statusHeight = 40  // 状态栏高度（减小）
        const buttonHeight = 50  // 底部按钮高度（减小）
        const padding = 12       // 边距（减小）
        
        // 计算可用的宽度和高度
        const availableWidth = vw - padding * 2
        const availableHeight = vh - headerHeight - statusHeight - buttonHeight - padding * 2
        
        // 取较小值确保棋盘完整显示
        const maxSize = Math.min(availableWidth, availableHeight)
        
        // 移动端最小375x667，确保棋盘能完整显示
        // 对于非常小的屏幕，进一步缩小棋盘
        const targetSize = Math.min(maxSize, vw - padding * 2)
        
        // 计算单元格大小
        const newCellSize = Math.floor(targetSize / boardSize)
        const newBoardSize = newCellSize * boardSize
        
        setCellSize(newCellSize)
        setBoardPixelSize(newBoardSize)
        setCanvasScale(dpr)
        
        console.log('Mobile board size:', {
          viewport: { width: vw, height: vh },
          available: { width: availableWidth, height: availableHeight },
          target: targetSize,
          cell: newCellSize,
          board: newBoardSize
        })
      } else {
        // PC端：适配720P及以上分辨率
        const headerHeight = 50   // 顶部标题高度
        const buttonHeight = 60   // 底部按钮高度
        const padding = 40        // 边距
        
        // 计算可用的高度（确保在720P下完整显示）
        const availableHeight = vh - headerHeight - buttonHeight - padding * 2
        
        // PC端棋盘尺寸限制
        const maxSize = Math.min(600, availableHeight)  // 最大600px，或可用高度
        
        // 根据高度计算合适的棋盘尺寸
        const targetSize = Math.min(maxSize, availableHeight)
        
        // 计算单元格大小
        const newCellSize = Math.floor(targetSize / boardSize)
        const newBoardSize = newCellSize * boardSize
        
        setCellSize(newCellSize)
        setBoardPixelSize(newBoardSize)
        setCanvasScale(dpr)
        
        console.log('PC board size:', {
          viewport: { width: vw, height: vh },
          availableHeight,
          target: targetSize,
          cell: newCellSize,
          board: newBoardSize
        })
      }
    }
    
    recalcSize()
    window.addEventListener('resize', recalcSize)
    window.addEventListener('orientationchange', recalcSize)  // 添加屏幕方向变化监听
    return () => {
      window.removeEventListener('resize', recalcSize)
      window.removeEventListener('orientationchange', recalcSize)
    }
  }, [boardSize])

  /**
   * 获取鼠标/触摸位置对应的棋盘坐标
   */
  const getBoardPosition = (clientX: number, clientY: number): Position | null => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return null
    
    const rect = container.getBoundingClientRect()
    // 计算相对于容器的位置（考虑padding）
    const containerStyle = window.getComputedStyle(container)
    const paddingLeft = parseInt(containerStyle.paddingLeft) || 0
    const paddingTop = parseInt(containerStyle.paddingTop) || 0
    
    const x = clientX - rect.left - paddingLeft
    const y = clientY - rect.top - paddingTop
    
    // 转换为棋盘坐标
    const col = Math.floor(x / cellSize)
    const row = Math.floor(y / cellSize)
    
    // 检查是否在有效范围内
    if (row >= 0 && row < boardSize && col >= 0 && col < boardSize) {
      return { row, col }
    }
    
    return null
  }

  /**
   * 绘制棋盘背景
   */
  const drawBoard = (ctx: CanvasRenderingContext2D) => {
    const actualSize = boardPixelSize * canvasScale
    
    // 清空画布
    ctx.clearRect(0, 0, actualSize, actualSize)
    
    // 保存状态并设置缩放
    ctx.save()
    ctx.scale(canvasScale, canvasScale)
    
    // 绘制木纹背景 - 使用渐变模拟木纹
    const gradient = ctx.createLinearGradient(0, 0, boardPixelSize, boardPixelSize)
    gradient.addColorStop(0, '#D4A574')
    gradient.addColorStop(0.3, '#C19A6B')
    gradient.addColorStop(0.6, '#CD9B62')
    gradient.addColorStop(1, '#B8956A')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, boardPixelSize, boardPixelSize)
    
    // 添加木纹纹理效果
    ctx.globalAlpha = 0.1
    for (let i = 0; i < 50; i++) {
      ctx.strokeStyle = '#8B7355'
      ctx.lineWidth = Math.random() * 2
      ctx.beginPath()
      const y = Math.random() * boardPixelSize
      ctx.moveTo(0, y)
      ctx.bezierCurveTo(
        boardPixelSize * 0.3, y + Math.random() * 20 - 10,
        boardPixelSize * 0.7, y + Math.random() * 20 - 10,
        boardPixelSize, y + Math.random() * 10 - 5
      )
      ctx.stroke()
    }
    ctx.globalAlpha = 1
    
    // 绘制网格线 - 添加阴影效果
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)'
    ctx.shadowBlur = 2
    ctx.shadowOffsetX = 1
    ctx.shadowOffsetY = 1
    
    ctx.strokeStyle = '#2C1810'
    ctx.lineWidth = 1.5
    
    for (let i = 0; i < boardSize; i++) {
      const pos = i * cellSize + cellSize / 2
      
      // 横线
      ctx.beginPath()
      ctx.moveTo(cellSize / 2, pos)
      ctx.lineTo(boardPixelSize - cellSize / 2, pos)
      ctx.stroke()
      
      // 竖线
      ctx.beginPath()
      ctx.moveTo(pos, cellSize / 2)
      ctx.lineTo(pos, boardPixelSize - cellSize / 2)
      ctx.stroke()
    }
    
    // 重置阴影
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0
    
    // 绘制星位点（天元和四个角的星位）- 增强视觉效果
    const starPoints: Position[] = [
      { row: 3, col: 3 },
      { row: 3, col: 9 },
      { row: 9, col: 3 },
      { row: 9, col: 9 },
      { row: 6, col: 6 } // 天元
    ]
    
    ctx.fillStyle = '#1A0E08'
    starPoints.forEach(point => {
      if (point.row < boardSize && point.col < boardSize) {
        const x = point.col * cellSize + cellSize / 2
        const y = point.row * cellSize + cellSize / 2
        
        // 外圈
        ctx.beginPath()
        ctx.arc(x, y, 5, 0, Math.PI * 2)
        ctx.fill()
        
        // 内圈高光
        ctx.fillStyle = '#2C1810'
        ctx.beginPath()
        ctx.arc(x, y, 3, 0, Math.PI * 2)
        ctx.fill()
        
        ctx.fillStyle = '#1A0E08'
      }
    })
    
    // 恢复状态
    ctx.restore()
  }

  /**
   * 绘制单个棋子 - 增强视觉效果
   */
  const drawPiece = (
    ctx: CanvasRenderingContext2D, 
    row: number, 
    col: number, 
    player: 1 | 2, 
    isWinning: boolean = false
  ) => {
    const x = col * cellSize + cellSize / 2
    const y = row * cellSize + cellSize / 2
    const radius = cellSize * 0.42
    
    ctx.save()
    ctx.scale(canvasScale, canvasScale)
    
    if (player === 1) {
      // 黑子 - 类似黑曜石的质感
      const gradient = ctx.createRadialGradient(x - radius/3, y - radius/3, 0, x, y, radius)
      gradient.addColorStop(0, '#4A4A4A')
      gradient.addColorStop(0.5, '#2C2C2C')
      gradient.addColorStop(0.8, '#1A1A1A')
      gradient.addColorStop(1, '#000000')
      
      // 阴影
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
      ctx.shadowBlur = 5
      ctx.shadowOffsetX = 2
      ctx.shadowOffsetY = 2
      
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.fill()
      
      // 高光效果
      const highlight = ctx.createRadialGradient(x - radius/3, y - radius/3, 0, x - radius/3, y - radius/3, radius/2)
      highlight.addColorStop(0, 'rgba(255, 255, 255, 0.3)')
      highlight.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.fillStyle = highlight
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.fill()
    } else {
      // 白子 - 类似珍珠的质感
      const gradient = ctx.createRadialGradient(x - radius/3, y - radius/3, 0, x, y, radius)
      gradient.addColorStop(0, '#FFFFFF')
      gradient.addColorStop(0.3, '#F8F8F8')
      gradient.addColorStop(0.7, '#E8E8E8')
      gradient.addColorStop(1, '#D0D0D0')
      
      // 阴影
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)'
      ctx.shadowBlur = 4
      ctx.shadowOffsetX = 2
      ctx.shadowOffsetY = 2
      
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.fill()
      
      // 边框
      ctx.strokeStyle = '#B0B0B0'
      ctx.lineWidth = 1
      ctx.stroke()
      
      // 高光
      const highlight = ctx.createRadialGradient(x - radius/4, y - radius/4, 0, x - radius/4, y - radius/4, radius/3)
      highlight.addColorStop(0, 'rgba(255, 255, 255, 0.9)')
      highlight.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.fillStyle = highlight
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.fill()
    }
    
    // 如果是获胜棋子，添加金色光环
    if (isWinning) {
      ctx.shadowColor = '#FFD700'
      ctx.shadowBlur = 15
      ctx.strokeStyle = '#FFD700'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(x, y, radius + 5, 0, Math.PI * 2)
      ctx.stroke()
    }
    
    ctx.restore()
  }

  /**
   * 高亮最后落子位置 - 使用动画四角标记
   */
  const highlightLastMove = (ctx: CanvasRenderingContext2D) => {
    if (!lastMove) return
    
    ctx.save()
    ctx.scale(canvasScale, canvasScale)
    
    const x = lastMove.col * cellSize + cellSize / 2
    const y = lastMove.row * cellSize + cellSize / 2
    const markerSize = cellSize * 0.2
    const markerOffset = cellSize * 0.35
    
    // 动画效果 - 呼吸感
    const time = Date.now() / 1000
    const breathe = Math.sin(time * 3) * 0.1 + 0.9
    
    ctx.strokeStyle = '#FF6B6B'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.globalAlpha = breathe
    
    // 四个角的标记
    const corners = [
      { dx: -1, dy: -1 }, // 左上
      { dx: 1, dy: -1 },  // 右上
      { dx: 1, dy: 1 },   // 右下
      { dx: -1, dy: 1 }   // 左下
    ]
    
    corners.forEach(corner => {
      ctx.beginPath()
      // 水平线
      ctx.moveTo(
        x + corner.dx * markerOffset,
        y + corner.dy * markerOffset
      )
      ctx.lineTo(
        x + corner.dx * (markerOffset - markerSize),
        y + corner.dy * markerOffset
      )
      // 垂直线
      ctx.moveTo(
        x + corner.dx * markerOffset,
        y + corner.dy * markerOffset
      )
      ctx.lineTo(
        x + corner.dx * markerOffset,
        y + corner.dy * (markerOffset - markerSize)
      )
      ctx.stroke()
    })
    
    ctx.restore()
  }

  /**
   * 绘制获胜连线动画
   */
  const drawWinningLine = (ctx: CanvasRenderingContext2D) => {
    if (!winningLine || winningLine.length < 5) return
    
    ctx.save()
    ctx.scale(canvasScale, canvasScale)
    
    const firstPiece = winningLine[0]
    const lastPiece = winningLine[winningLine.length - 1]
    
    const x1 = firstPiece.col * cellSize + cellSize / 2
    const y1 = firstPiece.row * cellSize + cellSize / 2
    const x2 = lastPiece.col * cellSize + cellSize / 2
    const y2 = lastPiece.row * cellSize + cellSize / 2
    
    // 动画效果
    const time = Date.now() / 100
    const dashOffset = time % 20
    
    // 绘制发光的连线
    ctx.strokeStyle = '#FFD700'
    ctx.lineWidth = 4
    ctx.lineCap = 'round'
    ctx.shadowColor = '#FFD700'
    ctx.shadowBlur = 20
    ctx.setLineDash([10, 10])
    ctx.lineDashOffset = -dashOffset
    
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
    
    // 在连线上添加星星粒子效果
    const particleCount = 5
    for (let i = 0; i < particleCount; i++) {
      const progress = ((time / 10 + i * 20) % 100) / 100
      const px = x1 + (x2 - x1) * progress
      const py = y1 + (y2 - y1) * progress
      
      ctx.fillStyle = '#FFD700'
      ctx.globalAlpha = 1 - progress
      ctx.beginPath()
      ctx.arc(px, py, 3 + progress * 5, 0, Math.PI * 2)
      ctx.fill()
    }
    
    ctx.restore()
  }

  /**
   * 绘制悬停预览
   */
  const drawHoverPreview = (ctx: CanvasRenderingContext2D) => {
    if (!hoverPos || gameState !== 'playing' || currentPlayer !== myColor) return
    if (board[hoverPos.row][hoverPos.col] !== 0) return
    
    const actualSize = boardPixelSize * canvasScale
    ctx.clearRect(0, 0, actualSize, actualSize)
    
    ctx.save()
    ctx.scale(canvasScale, canvasScale)
    
    const x = hoverPos.col * cellSize + cellSize / 2
    const y = hoverPos.row * cellSize + cellSize / 2
    const radius = cellSize * 0.42
    
    // 动画效果 - 脉冲
    const time = Date.now() / 1000
    const pulse = Math.sin(time * 4) * 0.1 + 0.9
    
    ctx.globalAlpha = 0.5
    
    if (currentPlayer === 1) {
      // 黑子预览
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * pulse)
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0.8)')
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0.4)')
      ctx.fillStyle = gradient
    } else {
      // 白子预览
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * pulse)
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)')
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0.5)')
      ctx.fillStyle = gradient
    }
    
    ctx.beginPath()
    ctx.arc(x, y, radius * pulse, 0, Math.PI * 2)
    ctx.fill()
    
    // 添加呼吸光环
    ctx.strokeStyle = currentPlayer === 1 ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.5)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(x, y, radius * pulse + 5, 0, Math.PI * 2)
    ctx.stroke()
    
    ctx.restore()
  }

  /**
   * 重绘整个棋盘
   */
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || !canvas) return
    
    // 设置Canvas实际尺寸（考虑DPR）
    canvas.width = boardPixelSize * canvasScale
    canvas.height = boardPixelSize * canvasScale
    
    drawBoard(ctx)
    
    // 绘制所有棋子
    board.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        if (cell !== 0) {
          const isWinning = winningLine?.some(
            pos => pos.row === rowIndex && pos.col === colIndex
          ) || false
          drawPiece(ctx, rowIndex, colIndex, cell, isWinning)
        }
      })
    })
    
    // 高亮最后落子
    highlightLastMove(ctx)
    
    // 绘制获胜连线
    drawWinningLine(ctx)
    
    // 设置动画循环
    let animationId: number
    const animate = () => {
      highlightLastMove(ctx)
      drawWinningLine(ctx)
      animationId = requestAnimationFrame(animate)
    }
    
    if (lastMove || winningLine) {
      animate()
    }
    
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId)
      }
    }
  }, [board, cellSize, boardPixelSize, lastMove, winningLine, canvasScale])

  /**
   * 更新悬停预览
   */
  useEffect(() => {
    const canvas = hoverCanvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || !canvas) return
    
    // 设置Canvas实际尺寸（考虑DPR）
    canvas.width = boardPixelSize * canvasScale
    canvas.height = boardPixelSize * canvasScale
    
    drawHoverPreview(ctx)
    
    // 动画循环
    let animationId: number
    const animate = () => {
      drawHoverPreview(ctx)
      animationId = requestAnimationFrame(animate)
    }
    animate()
    
    return () => {
      cancelAnimationFrame(animationId)
    }
  }, [hoverPos, board, gameState, currentPlayer, myColor, cellSize, boardPixelSize, canvasScale])

  /**
   * 处理点击事件
   */
  const handleClick = (e: React.MouseEvent | React.TouchEvent) => {
    if (gameState !== 'playing' || currentPlayer !== myColor) return
    
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY
    
    const pos = getBoardPosition(clientX, clientY)
    if (!pos) return
    
    const { row, col } = pos
    if (board[row][col] === 0) {
      makeMove(row, col)
      if (sendMove && roomId) {
        sendMove(roomId, row, col)
      }
      // 清除悬停状态
      setHoverPos(null)
    }
  }

  /**
   * 处理鼠标移动
   */
  const handleMouseMove = (e: React.MouseEvent) => {
    const pos = getBoardPosition(e.clientX, e.clientY)
    setHoverPos(pos)
  }

  /**
   * 处理鼠标离开
   */
  const handleMouseLeave = () => {
    setHoverPos(null)
  }

  /**
   * 处理触摸开始
   */
  const handleTouchStart = (e: React.TouchEvent) => {
    handleClick(e)
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="inline-block"
    >
      <div 
        ref={containerRef}
        className="relative pixel-container p-2 sm:p-4 bg-gradient-to-br from-amber-900/20 to-amber-800/20"
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        style={{ cursor: gameState === 'playing' && currentPlayer === myColor ? 'pointer' : 'not-allowed' }}
      >
        {/* 主棋盘画布 */}
        <canvas
          ref={canvasRef}
          style={{ 
            width: `${boardPixelSize}px`,
            height: `${boardPixelSize}px`,
            display: 'block',
            imageRendering: 'crisp-edges'
          }}
        />
        {/* 悬停效果画布 */}
        <canvas
          ref={hoverCanvasRef}
          className="absolute top-2 left-2 sm:top-4 sm:left-4 pointer-events-none"
          style={{ 
            width: `${boardPixelSize}px`,
            height: `${boardPixelSize}px`,
            imageRendering: 'crisp-edges'
          }}
        />
      </div>
    </motion.div>
  )
}

export default GameBoard