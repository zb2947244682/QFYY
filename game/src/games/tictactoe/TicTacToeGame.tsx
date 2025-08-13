import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, RotateCcw, Users, Monitor, Copy, CheckCircle, X, Circle } from 'lucide-react'
import { useTicTacToeSocket } from './hooks/useSocket'

type Player = 'X' | 'O' | null
type Board = Player[][]
type GameMode = 'single' | 'online' | null
type GameState = 'waiting' | 'playing' | 'finished'

const TicTacToeGame = () => {
  const navigate = useNavigate()
  const [board, setBoard] = useState<Board>(() => 
    Array(3).fill(null).map(() => Array(3).fill(null))
  )
  const [currentPlayer, setCurrentPlayer] = useState<Player>('X')
  const [mySymbol, setMySymbol] = useState<Player>(null)
  const [gameMode, setGameMode] = useState<GameMode>(null)
  const [gameState, setGameState] = useState<GameState>('waiting')
  const [winner, setWinner] = useState<Player | 'draw'>(null)
  const [winLine, setWinLine] = useState<number[][]>([])
  const [roomId, setRoomId] = useState<string>('')
  const [score, setScore] = useState({ X: 0, O: 0, draws: 0 })
  const [showRestartConfirm, setShowRestartConfirm] = useState(false)
  const [waitingForOpponent, setWaitingForOpponent] = useState(false)
  const [roomCodeCopied, setRoomCodeCopied] = useState(false)
  const [notification, setNotification] = useState<string>('')

  // Socket连接
  const {
    connected,
    joinRoom,
    createRoom,
    makeMove,
    requestRestart,
    acceptRestart,
    rejectRestart,
    leaveRoom
  } = useTicTacToeSocket(
    // onGameStart
    (data) => {
      setMySymbol(data.playerSymbol)
      setGameState('playing')
      setCurrentPlayer('X')
      resetBoard()
      setNotification('游戏开始！你是 ' + data.playerSymbol)
    },
    // onOpponentMove
    (data) => {
      const newBoard = [...board]
      newBoard[data.row][data.col] = currentPlayer
      setBoard(newBoard)
      
      const result = checkWinner(newBoard)
      if (result.winner) {
        handleGameEnd(result.winner, result.line)
      } else {
        setCurrentPlayer(currentPlayer === 'X' ? 'O' : 'X')
      }
    },
    // onGameEnd
    (data) => {
      setWinner(data.winner)
      setGameState('finished')
      updateScore(data.winner)
    },
    // onRoomJoined
    (data) => {
      setRoomId(data.roomId)
      setWaitingForOpponent(!data.isHost)
      setNotification(data.isHost ? '房间创建成功，等待对手加入...' : '成功加入房间')
    },
    // onPlayerJoined
    () => {
      setWaitingForOpponent(false)
      setNotification('对手已加入，游戏即将开始')
    },
    // onPlayerLeft
    () => {
      setNotification('对手已离开')
      setGameState('waiting')
      setWaitingForOpponent(true)
    },
    // onRestartRequest
    () => {
      setShowRestartConfirm(true)
      setNotification('对手请求重新开始')
    },
    // onGameRestart
    () => {
      resetGame()
      setNotification('游戏重新开始')
    },
    // onError
    (message) => {
      setNotification(message)
    }
  )

  // 检查获胜者
  const checkWinner = (board: Board): { winner: Player | 'draw', line: number[][] } => {
    // 检查行
    for (let i = 0; i < 3; i++) {
      if (board[i][0] && board[i][0] === board[i][1] && board[i][1] === board[i][2]) {
        return { 
          winner: board[i][0], 
          line: [[i, 0], [i, 1], [i, 2]] 
        }
      }
    }
    
    // 检查列
    for (let j = 0; j < 3; j++) {
      if (board[0][j] && board[0][j] === board[1][j] && board[1][j] === board[2][j]) {
        return { 
          winner: board[0][j], 
          line: [[0, j], [1, j], [2, j]] 
        }
      }
    }
    
    // 检查对角线
    if (board[0][0] && board[0][0] === board[1][1] && board[1][1] === board[2][2]) {
      return { 
        winner: board[0][0], 
        line: [[0, 0], [1, 1], [2, 2]] 
      }
    }
    
    if (board[0][2] && board[0][2] === board[1][1] && board[1][1] === board[2][0]) {
      return { 
        winner: board[0][2], 
        line: [[0, 2], [1, 1], [2, 0]] 
      }
    }
    
    // 检查平局
    const isDraw = board.every(row => row.every(cell => cell !== null))
    if (isDraw) {
      return { winner: 'draw', line: [] }
    }
    
    return { winner: null, line: [] }
  }

  // AI移动（简单难度）
  const makeAIMove = useCallback(() => {
    if (gameState !== 'playing' || currentPlayer !== 'O') return
    
    setTimeout(() => {
      // 获取所有空位
      const emptyCells: [number, number][] = []
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          if (!board[i][j]) {
            emptyCells.push([i, j])
          }
        }
      }
      
      if (emptyCells.length === 0) return
      
      // 简单AI策略
      let move: [number, number] | null = null
      
      // 1. 尝试获胜
      for (const [row, col] of emptyCells) {
        const testBoard = board.map(r => [...r])
        testBoard[row][col] = 'O'
        if (checkWinner(testBoard).winner === 'O') {
          move = [row, col]
          break
        }
      }
      
      // 2. 阻止对手获胜
      if (!move) {
        for (const [row, col] of emptyCells) {
          const testBoard = board.map(r => [...r])
          testBoard[row][col] = 'X'
          if (checkWinner(testBoard).winner === 'X') {
            move = [row, col]
            break
          }
        }
      }
      
      // 3. 占据中心
      if (!move && !board[1][1]) {
        move = [1, 1]
      }
      
      // 4. 占据角落
      if (!move) {
        const corners: [number, number][] = [[0, 0], [0, 2], [2, 0], [2, 2]]
        const emptyCorners = corners.filter(([r, c]) => !board[r][c])
        if (emptyCorners.length > 0) {
          move = emptyCorners[Math.floor(Math.random() * emptyCorners.length)]
        }
      }
      
      // 5. 随机选择
      if (!move) {
        move = emptyCells[Math.floor(Math.random() * emptyCells.length)]
      }
      
      if (move) {
        handleCellClick(move[0], move[1])
      }
    }, 500)
  }, [board, currentPlayer, gameState])

  // 处理格子点击
  const handleCellClick = (row: number, col: number) => {
    if (gameState !== 'playing' || board[row][col] || winner) return
    
    // 在线模式下，只能在轮到自己时落子
    if (gameMode === 'online' && currentPlayer !== mySymbol) return
    
    const newBoard = [...board]
    newBoard[row][col] = currentPlayer
    setBoard(newBoard)
    
    // 在线模式下发送移动
    if (gameMode === 'online' && roomId) {
      makeMove(roomId, row, col)
    }
    
    // 检查游戏结果
    const result = checkWinner(newBoard)
    if (result.winner) {
      handleGameEnd(result.winner, result.line)
    } else {
      setCurrentPlayer(currentPlayer === 'X' ? 'O' : 'X')
    }
  }

  // 处理游戏结束
  const handleGameEnd = (winner: Player | 'draw', line: number[][] = []) => {
    setWinner(winner)
    setWinLine(line)
    setGameState('finished')
    updateScore(winner)
    
    if (winner === 'draw') {
      setNotification('平局！')
    } else {
      const winnerName = gameMode === 'single' 
        ? (winner === 'X' ? '你' : '电脑')
        : (winner === mySymbol ? '你' : '对手')
      setNotification(`${winnerName}获胜！`)
    }
  }

  // 更新分数
  const updateScore = (winner: Player | 'draw') => {
    if (winner === 'draw') {
      setScore(prev => ({ ...prev, draws: prev.draws + 1 }))
    } else if (winner) {
      setScore(prev => ({ 
        ...prev, 
        [winner]: prev[winner as 'X' | 'O'] + 1 
      }))
    }
  }

  // 重置棋盘
  const resetBoard = () => {
    setBoard(Array(3).fill(null).map(() => Array(3).fill(null)))
    setWinner(null)
    setWinLine([])
  }

  // 重置游戏
  const resetGame = () => {
    resetBoard()
    setCurrentPlayer('X')
    setGameState(gameMode ? 'playing' : 'waiting')
    setShowRestartConfirm(false)
  }

  // 选择游戏模式
  const selectGameMode = (mode: GameMode) => {
    setGameMode(mode)
    resetGame()
    
    if (mode === 'single') {
      setMySymbol('X')
      setGameState('playing')
    } else if (mode === 'online') {
      createRoom('online')
    }
  }

  // 加入房间
  const handleJoinRoom = () => {
    const code = prompt('请输入房间号:')
    if (code) {
      setRoomId(code.toUpperCase())
      joinRoom(code.toUpperCase(), 'online')
      setGameMode('online')
    }
  }

  // 复制房间号
  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomId)
    setRoomCodeCopied(true)
    setTimeout(() => setRoomCodeCopied(false), 2000)
  }

  // 返回主菜单
  const backToMenu = () => {
    if (gameMode === 'online' && roomId) {
      leaveRoom(roomId)
    }
    setGameMode(null)
    setGameState('waiting')
    resetBoard()
    setRoomId('')
    setMySymbol(null)
  }

  // AI回合
  useEffect(() => {
    if (gameMode === 'single' && gameState === 'playing' && currentPlayer === 'O' && !winner) {
      makeAIMove()
    }
  }, [gameMode, gameState, currentPlayer, winner, makeAIMove])

  // 清除通知
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(''), 3000)
      return () => clearTimeout(timer)
    }
  }, [notification])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        {/* 游戏头部 */}
        <div className="bg-gray-800/50 backdrop-blur rounded-t-xl p-4 border-t border-l border-r border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => gameMode ? backToMenu() : navigate('/')}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="font-game">{gameMode ? '菜单' : '返回'}</span>
            </button>
            <h1 className="text-2xl font-game font-bold text-white">井字棋</h1>
            {gameState === 'playing' && (
              <button
                onClick={resetGame}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                <RotateCcw size={16} />
                <span className="font-game">重置</span>
              </button>
            )}
          </div>

          {/* 分数显示 */}
          {gameMode && (
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-gray-700/50 rounded-lg p-2">
                <div className="text-blue-400 font-game flex items-center justify-center gap-1">
                  <X size={16} />
                  {gameMode === 'single' ? '玩家' : 'X'}
                </div>
                <div className="text-xl font-bold text-white">{score.X}</div>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-2">
                <div className="text-gray-400 font-game">平局</div>
                <div className="text-xl font-bold text-white">{score.draws}</div>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-2">
                <div className="text-red-400 font-game flex items-center justify-center gap-1">
                  <Circle size={16} />
                  {gameMode === 'single' ? '电脑' : 'O'}
                </div>
                <div className="text-xl font-bold text-white">{score.O}</div>
              </div>
            </div>
          )}
        </div>

        {/* 游戏主体 */}
        <div className="bg-gray-900 border border-gray-700 p-6 rounded-b-xl">
          {/* 通知消息 */}
          <AnimatePresence>
            {notification && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mb-4 p-3 bg-blue-600/20 border border-blue-600 rounded-lg text-blue-400 text-center font-game"
              >
                {notification}
              </motion.div>
            )}
          </AnimatePresence>

          {/* 模式选择 */}
          {!gameMode && (
            <div className="space-y-4">
              <h2 className="text-xl font-game text-white text-center mb-6">选择游戏模式</h2>
              
              <button
                onClick={() => selectGameMode('single')}
                className="w-full p-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg transition-all flex items-center justify-center gap-3"
              >
                <Monitor size={24} />
                <span className="font-game text-lg">单机对战</span>
              </button>
              
              <button
                onClick={() => selectGameMode('online')}
                disabled={!connected}
                className={`w-full p-4 ${
                  connected 
                    ? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800' 
                    : 'bg-gray-700 cursor-not-allowed opacity-50'
                } text-white rounded-lg transition-all flex items-center justify-center gap-3`}
              >
                <Users size={24} />
                <span className="font-game text-lg">在线对战</span>
                {!connected && <span className="text-xs">(未连接)</span>}
              </button>
              
              <button
                onClick={handleJoinRoom}
                disabled={!connected}
                className={`w-full p-4 ${
                  connected 
                    ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800' 
                    : 'bg-gray-700 cursor-not-allowed opacity-50'
                } text-white rounded-lg transition-all flex items-center justify-center gap-3`}
              >
                <span className="font-game text-lg">加入房间</span>
              </button>
            </div>
          )}

          {/* 房间信息 */}
          {gameMode === 'online' && roomId && (
            <div className="mb-4 p-3 bg-gray-800 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 font-game">房间号:</span>
                <div className="flex items-center gap-2">
                  <span className="text-white font-game font-bold text-lg">{roomId}</span>
                  <button
                    onClick={copyRoomCode}
                    className="p-1 hover:bg-gray-700 rounded transition-colors"
                  >
                    {roomCodeCopied ? (
                      <CheckCircle size={16} className="text-green-400" />
                    ) : (
                      <Copy size={16} className="text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
              {waitingForOpponent && (
                <div className="mt-2 text-yellow-400 text-sm font-game animate-pulse">
                  等待对手加入...
                </div>
              )}
            </div>
          )}

          {/* 游戏棋盘 */}
          {gameMode && (
            <div className="relative">
              <div className="grid grid-cols-3 gap-2 bg-gray-800 p-4 rounded-lg">
                {board.map((row, i) => 
                  row.map((cell, j) => {
                    const isWinCell = winLine.some(([r, c]) => r === i && c === j)
                    return (
                      <motion.button
                        key={`${i}-${j}`}
                        whileHover={{ scale: cell ? 1 : 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleCellClick(i, j)}
                        disabled={!!cell || gameState !== 'playing' || (gameMode === 'online' && currentPlayer !== mySymbol)}
                        className={`
                          h-24 sm:h-28 bg-gray-900 rounded-lg border-2 transition-all
                          ${cell ? 'border-gray-600' : 'border-gray-700 hover:border-gray-500'}
                          ${isWinCell ? 'bg-green-900/30 border-green-500' : ''}
                          ${!cell && gameState === 'playing' && (gameMode === 'single' || currentPlayer === mySymbol) ? 'cursor-pointer' : 'cursor-not-allowed'}
                          flex items-center justify-center
                        `}
                      >
                        <AnimatePresence>
                          {cell && (
                            <motion.div
                              initial={{ scale: 0, rotate: -180 }}
                              animate={{ scale: 1, rotate: 0 }}
                              exit={{ scale: 0, rotate: 180 }}
                              className={`text-5xl sm:text-6xl font-bold ${
                                cell === 'X' ? 'text-blue-400' : 'text-red-400'
                              }`}
                            >
                              {cell === 'X' ? <X size={48} /> : <Circle size={48} />}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.button>
                    )
                  })
                )}
              </div>

              {/* 当前回合指示 */}
              {gameState === 'playing' && !winner && (
                <div className="mt-4 text-center">
                  <span className="text-gray-400 font-game">当前回合: </span>
                  <span className={`font-game font-bold text-lg ${
                    currentPlayer === 'X' ? 'text-blue-400' : 'text-red-400'
                  }`}>
                    {gameMode === 'single' 
                      ? (currentPlayer === 'X' ? '你' : '电脑')
                      : (gameMode === 'online' && currentPlayer === mySymbol ? '你' : currentPlayer)
                    }
                  </span>
                </div>
              )}

              {/* 游戏结束提示 */}
              {gameState === 'finished' && winner && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-lg flex items-center justify-center"
                >
                  <div className="text-center p-6">
                    {winner === 'draw' ? (
                      <>
                        <h2 className="text-3xl font-game font-bold text-yellow-400 mb-4">平局!</h2>
                        <p className="text-white font-game mb-4">势均力敌</p>
                      </>
                    ) : (
                      <>
                        <h2 className="text-3xl font-game font-bold text-green-400 mb-4">
                          {gameMode === 'single' 
                            ? (winner === 'X' ? '你赢了!' : '电脑赢了!')
                            : (winner === mySymbol ? '你赢了!' : '对手赢了!')
                          }
                        </h2>
                        <div className={`text-5xl mb-4 ${
                          winner === 'X' ? 'text-blue-400' : 'text-red-400'
                        }`}>
                          {winner === 'X' ? <X size={60} /> : <Circle size={60} />}
                        </div>
                      </>
                    )}
                    <button
                      onClick={gameMode === 'online' ? () => requestRestart(roomId) : resetGame}
                      className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-game rounded-lg transition-colors"
                    >
                      再来一局
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {/* 重新开始确认 */}
          {showRestartConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
            >
              <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 max-w-sm">
                <h3 className="text-xl font-game text-white mb-4">对手请求重新开始</h3>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      acceptRestart(roomId)
                      setShowRestartConfirm(false)
                    }}
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    同意
                  </button>
                  <button
                    onClick={() => {
                      rejectRestart(roomId)
                      setShowRestartConfirm(false)
                    }}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  >
                    拒绝
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default TicTacToeGame