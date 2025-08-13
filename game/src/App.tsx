import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import HomePage from '@pages/HomePage'
import GomokuGame from '@games/gomoku/GomokuGame'
import Game2048 from '@games/2048/Game2048'
import SnakeGame from '@games/snake/SnakeGame'
import PopStarGame from '@games/popstar/PopStarGame'
import TicTacToeGame from '@games/tictactoe/TicTacToeGame'
import MemoryGame from '@games/memory/MemoryGame'
import SudokuGame from '@games/sudoku/SudokuGame'
import BreakoutGame from '@games/breakout/BreakoutGame'
import Layout from '@components/Layout'

function App() {
  return (
    <Router>
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="games/gomoku" element={<GomokuGame />} />
            <Route path="games/2048" element={<Game2048 />} />
            <Route path="games/snake" element={<SnakeGame />} />
            <Route path="games/popstar" element={<PopStarGame />} />
            <Route path="games/tictactoe" element={<TicTacToeGame />} />
            <Route path="games/memory" element={<MemoryGame />} />
            <Route path="games/sudoku" element={<SudokuGame />} />
            <Route path="games/breakout" element={<BreakoutGame />} />
          </Route>
        </Routes>
      </AnimatePresence>
    </Router>
  )
}

export default App