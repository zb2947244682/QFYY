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
      const headerHeight = isMobile ? 60 : 160   // 头部导航高度（减少）
      const titleHeight = isMobile ? 40 : 100    // 标题区域高度（减少）
      const statusHeight = isMobile ? 60 : 80    // 状态栏高度（增加移动端高度，因为有比分）
      const footerHeight = isMobile ? 50 : 100   // 底部按钮高度（减少）
      const padding = isMobile ? 16 : 40          // 边距（调整）
      const safeArea = isMobile ? 30 : 0         // 安全区域（增加）
      
      // 计算可用的宽度和高度 - 留出更多边距防止溢出
      const availableWidth = vw - padding * 2 - 20  // 额外减去20px防止横向滚动
      const availableHeight = vh - headerHeight - titleHeight - statusHeight - footerHeight - padding * 2 - safeArea
      
      // 取较小值确保棋盘完整显示
      const maxSize = Math.min(availableWidth, availableHeight)
      
      // 设置尺寸限制
      const minSize = isMobile ? 240 : 320  // 减小最小尺寸
      const maxSizeLimit = isMobile ? 350 : 600  // 减小移动端最大尺寸
      
      // 计算目标尺寸
      const targetSize = Math.max(minSize, Math.min(maxSizeLimit, maxSize))
      
      // 计算单元格大小
      const newCellSize = Math.max(14, Math.floor(targetSize / boardSize))  // 减小最小单元格尺寸
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
    
    // 清空画布
    ctx.fillStyle = '#DEB887' // 棋盘颜色
    ctx.fillRect(0, 0, boardPixelSize, boardPixelSize)
    
    // 绘制网格线
    ctx.strokeStyle = '#8B4513'
    ctx.lineWidth = Math.max(1, cellSize / 30) // 根据棋盘大小调整线宽
    
    for (let i = 0; i <= boardSize; i++) {
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
    
    // 绘制星位（天元和其他星位）
    if (boardSize >= 9) {
      ctx.fillStyle = '#8B4513'
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
        const radius = Math.max(2, cellSize / 12)
        ctx.beginPath()
        ctx.arc(x, y, radius, 0, Math.PI * 2)
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
  }, [board, boardSize, lastMove, cellSize, boardPixelSize, winningLine])
  
  /**
   * 绘制棋子
   * 优化了棋子的视觉效果和大小适配
   */
  const drawPiece = (ctx: CanvasRenderingContext2D, row: number, col: number, player: number) => {
    const x = col * cellSize + cellSize / 2
    const y = row * cellSize + cellSize / 2
    const radius = Math.max(6, cellSize / 2 - 3)
    
    // 检查是否是获胜连线中的棋子
    const isWinningPiece = winningLine?.some(pos => pos.row === row && pos.col === col)
    
    if (player === 1) {
      // 黑子 - 圆形带渐变
      const gradient = ctx.createRadialGradient(x - radius/3, y - radius/3, 0, x, y, radius)
      gradient.addColorStop(0, isWinningPiece ? '#666666' : '#444444')
      gradient.addColorStop(1, '#000000')
      
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.fillStyle = gradient
      ctx.fill()
      
      // 边框
      ctx.strokeStyle = isWinningPiece ? '#FFD700' : '#000000'
      ctx.lineWidth = isWinningPiece ? 3 : 1
      ctx.stroke()
    } else {
      // 白子 - 圆形带渐变
      const gradient = ctx.createRadialGradient(x - radius/3, y - radius/3, 0, x, y, radius)
      gradient.addColorStop(0, '#FFFFFF')
      gradient.addColorStop(1, isWinningPiece ? '#F0F0F0' : '#E0E0E0')
      
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.fillStyle = gradient
      ctx.fill()
      
      // 边框
      ctx.strokeStyle = isWinningPiece ? '#FFD700' : '#CCCCCC'
      ctx.lineWidth = isWinningPiece ? 3 : 1
      ctx.stroke()
    }
  }
  
  /**
   * 高亮最后落子位置
   */
  const highlightLastMove = (ctx: CanvasRenderingContext2D, row: number, col: number) => {
    const x = col * cellSize + cellSize / 2
    const y = row * cellSize + cellSize / 2
    const size = Math.max(8, cellSize / 3)
    
    ctx.strokeStyle = '#FF4444'
    ctx.lineWidth = Math.max(2, cellSize / 20)
    ctx.strokeRect(x - size/2, y - size/2, size, size)
  }
  
  /**
   * 绘制获胜连线
   */
  const drawWinningLine = (ctx: CanvasRenderingContext2D) => {
    if (!winningLine || winningLine.length < 2) return
    
    // 计算连线的起点和终点
    const startPos = winningLine[0]
    const endPos = winningLine[winningLine.length - 1]
    
    const startX = startPos.col * cellSize + cellSize / 2
    const startY = startPos.row * cellSize + cellSize / 2
    const endX = endPos.col * cellSize + cellSize / 2
    const endY = endPos.row * cellSize + cellSize / 2
    
    // 绘制连线
    ctx.save()
    ctx.strokeStyle = '#FFD700'
    ctx.lineWidth = 4
    ctx.lineCap = 'round'
    ctx.shadowColor = '#FFD700'
    ctx.shadowBlur = 10
    
    // 创建渐变
    const gradient = ctx.createLinearGradient(startX, startY, endX, endY)
    gradient.addColorStop(0, '#FFD700')
    gradient.addColorStop(0.5, '#FFA500')
    gradient.addColorStop(1, '#FFD700')
    ctx.strokeStyle = gradient
    
    ctx.beginPath()
    ctx.moveTo(startX, startY)
    ctx.lineTo(endX, endY)
    ctx.stroke()
    ctx.restore()
  }
  
  /**
   * 处理点击和触摸事件
   * 统一处理鼠标点击和触摸操作
   */
  const handleClick = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (gameState !== 'playing') return
    if (currentPlayer !== myColor) return
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    event.preventDefault() // 防止触摸时的默认行为
    
    const rect = canvas.getBoundingClientRect()
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
  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== 'playing' || currentPlayer !== myColor) {
      if (canvasRef.current) {
        canvasRef.current.style.cursor = 'not-allowed'
      }
      return
    }
    
    // 检测是否为触摸设备
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    if (isTouchDevice) return
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    
    const col = Math.floor(x / cellSize)
    const row = Math.floor(y / cellSize)
    
    if (row >= 0 && row < boardSize && col >= 0 && col < boardSize && board[row][col] === 0) {
      canvas.style.cursor = 'pointer'
    } else {
      canvas.style.cursor = 'not-allowed'
    }
  }
  
  /**
   * 处理触摸开始事件
   */
  const handleTouchStart = (event: React.TouchEvent<HTMLCanvasElement>) => {
    handleClick(event)
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="inline-block"
    >
      <div className="pixel-container p-2 md:p-4">
        <canvas
          ref={canvasRef}
          width={boardPixelSize}
          height={boardPixelSize}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onTouchStart={handleTouchStart}
          className="pixelated block"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>
    </motion.div>
  )
}

export default GameBoard