import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import HomePage from '@pages/HomePage'
import GomokuGame from '@games/gomoku/GomokuGame'
import Game2048 from '@games/2048/Game2048'
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
          </Route>
        </Routes>
      </AnimatePresence>
    </Router>
  )
}

export default App