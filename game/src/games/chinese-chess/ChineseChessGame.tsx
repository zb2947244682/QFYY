import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, RotateCcw, Flag, Users } from 'lucide-react'

// 棋子类型
type PieceType = 'general' | 'advisor' | 'elephant' | 'horse' | 'chariot' | 'cannon' | 'soldier'
type Side = 'red' | 'black'

interface Piece {
  type: PieceType
  side: Side
  x: number
  y: number
}

interface Position {
  x: number
  y: number
}

// 棋子中文名称
const PIECE_NAMES: Record<PieceType, { red: string; black: string }> = {
  general: { red: '帥', black: '將' },
  advisor: { red: '仕', black: '士' },
  elephant: { red: '相', black: '象' },
  horse: { red: '馬', black: '馬' },
  chariot: { red: '車', black: '車' },
  cannon: { red: '炮', black: '砲' },
  soldier: { red: '兵', black: '卒' }
}

// 初始化棋子位置
const initializeBoard = (): (Piece | null)[][] => {
  const board = Array(10).fill(null).map(() => Array(9).fill(null))
  
  // 红方棋子（下方）
  board[9][0] = { type: 'chariot', side: 'red', x: 0, y: 9 }
  board[9][1] = { type: 'horse', side: 'red', x: 1, y: 9 }
  board[9][2] = { type: 'elephant', side: 'red', x: 2, y: 9 }
  board[9][3] = { type: 'advisor', side: 'red', x: 3, y: 9 }
  board[9][4] = { type: 'general', side: 'red', x: 4, y: 9 }
  board[9][5] = { type: 'advisor', side: 'red', x: 5, y: 9 }
  board[9][6] = { type: 'elephant', side: 'red', x: 6, y: 9 }
  board[9][7] = { type: 'horse', side: 'red', x: 7, y: 9 }
  board[9][8] = { type: 'chariot', side: 'red', x: 8, y: 9 }
  
  board[7][1] = { type: 'cannon', side: 'red', x: 1, y: 7 }
  board[7][7] = { type: 'cannon', side: 'red', x: 7, y: 7 }
  
  for (let i = 0; i < 9; i += 2) {
    board[6][i] = { type: 'soldier', side: 'red', x: i, y: 6 }
  }
  
  // 黑方棋子（上方）
  board[0][0] = { type: 'chariot', side: 'black', x: 0, y: 0 }
  board[0][1] = { type: 'horse', side: 'black', x: 1, y: 0 }
  board[0][2] = { type: 'elephant', side: 'black', x: 2, y: 0 }
  board[0][3] = { type: 'advisor', side: 'black', x: 3, y: 0 }
  board[0][4] = { type: 'general', side: 'black', x: 4, y: 0 }
  board[0][5] = { type: 'advisor', side: 'black', x: 5, y: 0 }
  board[0][6] = { type: 'elephant', side: 'black', x: 6, y: 0 }
  board[0][7] = { type: 'horse', side: 'black', x: 7, y: 0 }
  board[0][8] = { type: 'chariot', side: 'black', x: 8, y: 0 }
  
  board[2][1] = { type: 'cannon', side: 'black', x: 1, y: 2 }
  board[2][7] = { type: 'cannon', side: 'black', x: 7, y: 2 }
  
  for (let i = 0; i < 9; i += 2) {
    board[3][i] = { type: 'soldier', side: 'black', x: i, y: 3 }
  }
  
  return board
}

const ChineseChessGame = () => {
  const navigate = useNavigate()
  const [board, setBoard] = useState<(Piece | null)[][]>(initializeBoard())
  const [currentPlayer, setCurrentPlayer] = useState<Side>('red')
  const [selectedPiece, setSelectedPiece] = useState<Position | null>(null)
  const [possibleMoves, setPossibleMoves] = useState<Position[]>([])
  const [gameOver, setGameOver] = useState(false)
  const [winner, setWinner] = useState<Side | null>(null)
  const [moveHistory, setMoveHistory] = useState<string[]>([])

  // 检查位置是否在棋盘内
  const isInBoard = (x: number, y: number): boolean => {
    return x >= 0 && x < 9 && y >= 0 && y < 10
  }

  // 检查位置是否在九宫内
  const isInPalace = (x: number, y: number, side: Side): boolean => {
    if (side === 'red') {
      return x >= 3 && x <= 5 && y >= 7 && y <= 9
    } else {
      return x >= 3 && x <= 5 && y >= 0 && y <= 2
    }
  }

  // 检查是否过河
  const hasCrossedRiver = (y: number, side: Side): boolean => {
    if (side === 'red') {
      return y <= 4
    } else {
      return y >= 5
    }
  }

  // 计算可能的移动位置
  const calculatePossibleMoves = useCallback((piece: Piece, board: (Piece | null)[][]): Position[] => {
    const moves: Position[] = []
    const { type, side, x, y } = piece

    switch (type) {
      case 'general': // 将/帅
        const generalMoves = [
          { x: x + 1, y },
          { x: x - 1, y },
          { x, y: y + 1 },
          { x, y: y - 1 }
        ]
        generalMoves.forEach(move => {
          if (isInPalace(move.x, move.y, side) && 
              (!board[move.y][move.x] || board[move.y][move.x]?.side !== side)) {
            moves.push(move)
          }
        })
        break

      case 'advisor': // 士/仕
        const advisorMoves = [
          { x: x + 1, y: y + 1 },
          { x: x + 1, y: y - 1 },
          { x: x - 1, y: y + 1 },
          { x: x - 1, y: y - 1 }
        ]
        advisorMoves.forEach(move => {
          if (isInPalace(move.x, move.y, side) && 
              (!board[move.y][move.x] || board[move.y][move.x]?.side !== side)) {
            moves.push(move)
          }
        })
        break

      case 'elephant': // 象/相
        const elephantMoves = [
          { x: x + 2, y: y + 2, blockX: x + 1, blockY: y + 1 },
          { x: x + 2, y: y - 2, blockX: x + 1, blockY: y - 1 },
          { x: x - 2, y: y + 2, blockX: x - 1, blockY: y + 1 },
          { x: x - 2, y: y - 2, blockX: x - 1, blockY: y - 1 }
        ]
        elephantMoves.forEach(move => {
          if (isInBoard(move.x, move.y) && 
              !board[move.blockY][move.blockX] && // 不能被阻挡
              (!board[move.y][move.x] || board[move.y][move.x]?.side !== side) &&
              !hasCrossedRiver(move.y, side)) { // 不能过河
            moves.push({ x: move.x, y: move.y })
          }
        })
        break

      case 'horse': // 马
        const horseMoves = [
          { x: x + 2, y: y + 1, blockX: x + 1, blockY: y },
          { x: x + 2, y: y - 1, blockX: x + 1, blockY: y },
          { x: x - 2, y: y + 1, blockX: x - 1, blockY: y },
          { x: x - 2, y: y - 1, blockX: x - 1, blockY: y },
          { x: x + 1, y: y + 2, blockX: x, blockY: y + 1 },
          { x: x + 1, y: y - 2, blockX: x, blockY: y - 1 },
          { x: x - 1, y: y + 2, blockX: x, blockY: y + 1 },
          { x: x - 1, y: y - 2, blockX: x, blockY: y - 1 }
        ]
        horseMoves.forEach(move => {
          if (isInBoard(move.x, move.y) && 
              isInBoard(move.blockX, move.blockY) &&
              !board[move.blockY][move.blockX] && // 不能被阻挡
              (!board[move.y][move.x] || board[move.y][move.x]?.side !== side)) {
            moves.push({ x: move.x, y: move.y })
          }
        })
        break

      case 'chariot': // 车
        // 横向移动
        for (let i = x + 1; i < 9; i++) {
          if (!board[y][i]) {
            moves.push({ x: i, y })
          } else {
            if (board[y][i]?.side !== side) {
              moves.push({ x: i, y })
            }
            break
          }
        }
        for (let i = x - 1; i >= 0; i--) {
          if (!board[y][i]) {
            moves.push({ x: i, y })
          } else {
            if (board[y][i]?.side !== side) {
              moves.push({ x: i, y })
            }
            break
          }
        }
        // 纵向移动
        for (let j = y + 1; j < 10; j++) {
          if (!board[j][x]) {
            moves.push({ x, y: j })
          } else {
            if (board[j][x]?.side !== side) {
              moves.push({ x, y: j })
            }
            break
          }
        }
        for (let j = y - 1; j >= 0; j--) {
          if (!board[j][x]) {
            moves.push({ x, y: j })
          } else {
            if (board[j][x]?.side !== side) {
              moves.push({ x, y: j })
            }
            break
          }
        }
        break

      case 'cannon': // 炮
        // 横向移动
        let foundPieceX = false
        for (let i = x + 1; i < 9; i++) {
          if (!foundPieceX) {
            if (!board[y][i]) {
              moves.push({ x: i, y })
            } else {
              foundPieceX = true
            }
          } else {
            if (board[y][i] && board[y][i]?.side !== side) {
              moves.push({ x: i, y })
              break
            }
          }
        }
        foundPieceX = false
        for (let i = x - 1; i >= 0; i--) {
          if (!foundPieceX) {
            if (!board[y][i]) {
              moves.push({ x: i, y })
            } else {
              foundPieceX = true
            }
          } else {
            if (board[y][i] && board[y][i]?.side !== side) {
              moves.push({ x: i, y })
              break
            }
          }
        }
        // 纵向移动
        let foundPieceY = false
        for (let j = y + 1; j < 10; j++) {
          if (!foundPieceY) {
            if (!board[j][x]) {
              moves.push({ x, y: j })
            } else {
              foundPieceY = true
            }
          } else {
            if (board[j][x] && board[j][x]?.side !== side) {
              moves.push({ x, y: j })
              break
            }
          }
        }
        foundPieceY = false
        for (let j = y - 1; j >= 0; j--) {
          if (!foundPieceY) {
            if (!board[j][x]) {
              moves.push({ x, y: j })
            } else {
              foundPieceY = true
            }
          } else {
            if (board[j][x] && board[j][x]?.side !== side) {
              moves.push({ x, y: j })
              break
            }
          }
        }
        break

      case 'soldier': // 兵/卒
        if (hasCrossedRiver(y, side)) {
          // 过河后可以左右移动
          const soldierMoves = side === 'red' 
            ? [{ x, y: y - 1 }, { x: x - 1, y }, { x: x + 1, y }]
            : [{ x, y: y + 1 }, { x: x - 1, y }, { x: x + 1, y }]
          soldierMoves.forEach(move => {
            if (isInBoard(move.x, move.y) && 
                (!board[move.y][move.x] || board[move.y][move.x]?.side !== side)) {
              moves.push(move)
            }
          })
        } else {
          // 未过河只能前进
          const moveY = side === 'red' ? y - 1 : y + 1
          if (isInBoard(x, moveY) && 
              (!board[moveY][x] || board[moveY][x]?.side !== side)) {
            moves.push({ x, y: moveY })
          }
        }
        break
    }

    return moves
  }, [])

  // 处理棋子点击
  const handlePieceClick = (x: number, y: number) => {
    if (gameOver) return

    const piece = board[y][x]
    
    if (selectedPiece) {
      // 如果已选中棋子，尝试移动
      const isValidMove = possibleMoves.some(move => move.x === x && move.y === y)
      
      if (isValidMove) {
        // 执行移动
        const newBoard = board.map(row => [...row])
        const movingPiece = board[selectedPiece.y][selectedPiece.x]
        const capturedPiece = board[y][x]
        
        if (movingPiece) {
          // 记录移动历史
          const moveText = `${movingPiece.side === 'red' ? '红' : '黑'}方 ${
            PIECE_NAMES[movingPiece.type][movingPiece.side]
          } ${selectedPiece.x},${selectedPiece.y} → ${x},${y}${
            capturedPiece ? ` 吃 ${PIECE_NAMES[capturedPiece.type][capturedPiece.side]}` : ''
          }`
          setMoveHistory(prev => [...prev, moveText])
          
          // 更新棋盘
          newBoard[y][x] = { ...movingPiece, x, y }
          newBoard[selectedPiece.y][selectedPiece.x] = null
          setBoard(newBoard)
          
          // 检查是否吃掉将/帅
          if (capturedPiece?.type === 'general') {
            setGameOver(true)
            setWinner(currentPlayer)
          }
          
          // 切换玩家
          setCurrentPlayer(currentPlayer === 'red' ? 'black' : 'red')
        }
        
        setSelectedPiece(null)
        setPossibleMoves([])
      } else if (piece && piece.side === currentPlayer) {
        // 选择新的棋子
        setSelectedPiece({ x, y })
        setPossibleMoves(calculatePossibleMoves(piece, board))
      } else {
        // 取消选择
        setSelectedPiece(null)
        setPossibleMoves([])
      }
    } else if (piece && piece.side === currentPlayer) {
      // 选择棋子
      setSelectedPiece({ x, y })
      setPossibleMoves(calculatePossibleMoves(piece, board))
    }
  }

  // 重置游戏
  const resetGame = () => {
    setBoard(initializeBoard())
    setCurrentPlayer('red')
    setSelectedPiece(null)
    setPossibleMoves([])
    setGameOver(false)
    setWinner(null)
    setMoveHistory([])
  }

  // 获取棋盘格子大小
  const getCellSize = () => {
    if (typeof window !== 'undefined') {
      const screenWidth = window.innerWidth
      const screenHeight = window.innerHeight
      const maxWidth = Math.min(screenWidth - 32, 450)
      const maxHeight = screenHeight * 0.6
      return Math.min(maxWidth / 9, maxHeight / 10, 45)
    }
    return 40
  }

  const cellSize = getCellSize()

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-900 via-yellow-900 to-amber-900 flex flex-col p-2 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl mx-auto flex flex-col h-screen"
      >
        {/* 游戏头部 */}
        <div className="bg-gray-800/50 backdrop-blur rounded-xl p-3 mb-2 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => navigate('/')}
              className="p-2 text-gray-400 hover:text-white"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-game font-bold text-white">中国象棋</h1>
            <button
              onClick={resetGame}
              className="p-2 text-white"
            >
              <RotateCcw size={18} />
            </button>
          </div>

          {/* 游戏信息 */}
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-gray-400" />
              <span className="text-gray-400">当前回合:</span>
              <span className={`font-bold ${currentPlayer === 'red' ? 'text-red-500' : 'text-gray-900'}`}>
                {currentPlayer === 'red' ? '红方' : '黑方'}
              </span>
            </div>
            {gameOver && (
              <div className="flex items-center gap-2">
                <Flag size={16} className="text-yellow-400" />
                <span className="text-yellow-400 font-bold">
                  {winner === 'red' ? '红方胜利!' : '黑方胜利!'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 游戏区域 */}
        <div className="flex-1 flex items-center justify-center min-h-0">
          <div className="flex gap-4">
            {/* 棋盘 */}
            <div className="relative bg-amber-100 p-2 rounded-lg shadow-xl">
              {/* 棋盘背景 */}
              <div 
                className="relative"
                style={{
                  width: `${9 * cellSize}px`,
                  height: `${10 * cellSize}px`,
                }}
              >
                {/* 绘制棋盘线 */}
                <svg
                  className="absolute inset-0"
                  width={9 * cellSize}
                  height={10 * cellSize}
                  style={{ pointerEvents: 'none' }}
                >
                  {/* 横线 */}
                  {Array.from({ length: 10 }).map((_, i) => (
                    <line
                      key={`h-${i}`}
                      x1={cellSize / 2}
                      y1={i * cellSize + cellSize / 2}
                      x2={8 * cellSize + cellSize / 2}
                      y2={i * cellSize + cellSize / 2}
                      stroke="#8b4513"
                      strokeWidth="1"
                    />
                  ))}
                  {/* 竖线 */}
                  {Array.from({ length: 9 }).map((_, i) => (
                    <line
                      key={`v-${i}`}
                      x1={i * cellSize + cellSize / 2}
                      y1={cellSize / 2}
                      x2={i * cellSize + cellSize / 2}
                      y2={9 * cellSize + cellSize / 2}
                      stroke="#8b4513"
                      strokeWidth="1"
                      style={{
                        strokeDasharray: i === 0 || i === 8 ? 'none' : 
                          `0 ${4 * cellSize} ${cellSize} ${4 * cellSize} 0`
                      }}
                    />
                  ))}
                  {/* 九宫线 */}
                  <line
                    x1={3 * cellSize + cellSize / 2}
                    y1={cellSize / 2}
                    x2={5 * cellSize + cellSize / 2}
                    y2={2 * cellSize + cellSize / 2}
                    stroke="#8b4513"
                    strokeWidth="1"
                  />
                  <line
                    x1={5 * cellSize + cellSize / 2}
                    y1={cellSize / 2}
                    x2={3 * cellSize + cellSize / 2}
                    y2={2 * cellSize + cellSize / 2}
                    stroke="#8b4513"
                    strokeWidth="1"
                  />
                  <line
                    x1={3 * cellSize + cellSize / 2}
                    y1={7 * cellSize + cellSize / 2}
                    x2={5 * cellSize + cellSize / 2}
                    y2={9 * cellSize + cellSize / 2}
                    stroke="#8b4513"
                    strokeWidth="1"
                  />
                  <line
                    x1={5 * cellSize + cellSize / 2}
                    y1={7 * cellSize + cellSize / 2}
                    x2={3 * cellSize + cellSize / 2}
                    y2={9 * cellSize + cellSize / 2}
                    stroke="#8b4513"
                    strokeWidth="1"
                  />
                  {/* 楚河汉界 */}
                  <text
                    x={2 * cellSize}
                    y={4.5 * cellSize + cellSize / 2}
                    fill="#8b4513"
                    fontSize={cellSize * 0.4}
                    fontFamily="serif"
                  >
                    楚 河
                  </text>
                  <text
                    x={6 * cellSize}
                    y={4.5 * cellSize + cellSize / 2}
                    fill="#8b4513"
                    fontSize={cellSize * 0.4}
                    fontFamily="serif"
                  >
                    汉 界
                  </text>
                </svg>

                {/* 棋子和可移动位置提示 */}
                {board.map((row, y) =>
                  row.map((piece, x) => (
                    <div key={`${y}-${x}`}>
                      {/* 可移动位置提示 */}
                      {possibleMoves.some(move => move.x === x && move.y === y) && (
                        <div
                          className="absolute"
                          style={{
                            left: `${x * cellSize + cellSize / 2 - cellSize * 0.15}px`,
                            top: `${y * cellSize + cellSize / 2 - cellSize * 0.15}px`,
                            width: `${cellSize * 0.3}px`,
                            height: `${cellSize * 0.3}px`,
                          }}
                        >
                          <div className={`w-full h-full rounded-full ${
                            board[y][x] ? 'bg-red-400' : 'bg-green-400'
                          } opacity-70 animate-pulse`} />
                        </div>
                      )}
                      {/* 棋子 */}
                      {piece && (
                        <motion.div
                          className={`absolute cursor-pointer ${
                            selectedPiece?.x === x && selectedPiece?.y === y
                              ? 'ring-4 ring-blue-400 ring-opacity-70'
                              : ''
                          }`}
                          style={{
                            left: `${x * cellSize}px`,
                            top: `${y * cellSize}px`,
                            width: `${cellSize}px`,
                            height: `${cellSize}px`,
                          }}
                          onClick={() => handlePieceClick(x, y)}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <div className={`w-full h-full rounded-full ${
                            piece.side === 'red' 
                              ? 'bg-gradient-to-br from-red-500 to-red-700 border-2 border-red-800' 
                              : 'bg-gradient-to-br from-gray-700 to-gray-900 border-2 border-black'
                          } flex items-center justify-center shadow-lg`}>
                            <span className={`font-bold ${
                              piece.side === 'red' ? 'text-white' : 'text-white'
                            }`} style={{ fontSize: `${cellSize * 0.5}px` }}>
                              {PIECE_NAMES[piece.type][piece.side]}
                            </span>
                          </div>
                        </motion.div>
                      )}
                      {/* 空格子点击区域 */}
                      {!piece && (
                        <div
                          className="absolute"
                          style={{
                            left: `${x * cellSize}px`,
                            top: `${y * cellSize}px`,
                            width: `${cellSize}px`,
                            height: `${cellSize}px`,
                          }}
                          onClick={() => handlePieceClick(x, y)}
                        />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 移动历史 */}
            <div className="bg-gray-800/50 backdrop-blur rounded-lg p-3 w-48 max-h-96 overflow-y-auto">
              <h3 className="text-white font-bold mb-2 text-sm">移动记录</h3>
              <div className="space-y-1">
                {moveHistory.length === 0 ? (
                  <p className="text-gray-400 text-xs">暂无移动</p>
                ) : (
                  moveHistory.map((move, index) => (
                    <div key={index} className="text-xs text-gray-300">
                      {index + 1}. {move}
                    </div>
                  ))
                )}
              </div>
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
              <h2 className="text-2xl font-game font-bold text-yellow-400 mb-3">游戏结束!</h2>
              <p className="text-white text-lg mb-4">
                {winner === 'red' ? '红方' : '黑方'}获胜!
              </p>
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

export default ChineseChessGame