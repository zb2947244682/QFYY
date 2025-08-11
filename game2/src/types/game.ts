export interface Game {
  id: string
  title: string
  description: string
  image: string
  path: string
  tags: string[]
  difficulty: string
  players: string
  time: string
  status: 'available' | 'coming-soon' | 'maintenance'
}
