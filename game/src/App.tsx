import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import HomePage from '@pages/HomePage'
import GomokuGame from '@games/gomoku/GomokuGame'
import Game2048 from '@games/2048/Game2048'
import SnakeGame from '@games/snake/SnakeGame'
import TetrisGame from '@games/tetris/TetrisGame'
import TicTacToeGame from '@games/tictactoe/TicTacToeGame'
import MemoryGame from '@games/memory/MemoryGame'
import MinesweeperGame from '@games/minesweeper/MinesweeperGame'
import BreakoutGame from '@games/breakout/BreakoutGame'
import Layout from '@components/Layout'
import ScrollToTop from '@components/ScrollToTop'

function App() {
  return (
    <Router>
      <ScrollToTop />
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="games/gomoku" element={<GomokuGame />} />
            <Route path="games/2048" element={<Game2048 />} />
            <Route path="games/snake" element={<SnakeGame />} />
            <Route path="games/tetris" element={<TetrisGame />} />
            <Route path="games/tictactoe" element={<TicTacToeGame />} />
            <Route path="games/memory" element={<MemoryGame />} />
            <Route path="games/minesweeper" element={<MinesweeperGame />} />
            <Route path="games/breakout" element={<BreakoutGame />} />
          </Route>
        </Routes>
      </AnimatePresence>
    </Router>
  )
}

export default App