// pages/index.tsx
/* eslint-disable react-hooks/exhaustive-deps */
"use client"

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from "@/components/button"
import { useToast } from "@/hooks/use-toast"

const WINNING_COMBINATIONS = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
]

interface Game {
  id: number
  board: string[]
  winner: string
  created_at: string
}

type GameMode = 'pvp' | 'pvai'

export default function TicTacToe() {
  const [board, setBoard] = useState(Array(9).fill(null))
  const [isXNext, setIsXNext] = useState(true)
  const [winner, setWinner] = useState<string | null>(null)
  const [gameHistory, setGameHistory] = useState<Game[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [gameMode, setGameMode] = useState<GameMode | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    fetchGameHistory()
  }, [])

  useEffect(() => {
    checkWinner()
  }, [board])

  const fetchGameHistory = async () => {
    try {
      const response = await fetch('/api/games')
      const data = await response.json()
      setGameHistory(data)
    } catch {
      toast({
        title: "Error",
        description: "Failed to fetch game history",
        variant: "destructive",
      })
    }
  }

  const handleClick = async (index: number) => {
    if (board[index] || winner) return

    const newBoard = [...board]
    newBoard[index] = isXNext ? 'X' : 'O'
    setBoard(newBoard)
    setIsXNext(!isXNext)

    try {
      const response = await fetch('/api/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ board: newBoard, mode: gameMode }),
      })
      const data = await response.json()
      if (data.winner) {
        setWinner(data.winner)
      }

      // If the game mode is 'pvai', make the AI move
      if (gameMode === 'pvai' && !data.winner) {
        makeAIMove(newBoard)
      }
      fetchGameHistory() // Refresh game history after each move
    } catch {
      toast({
        title: "Error",
        description: "Failed to communicate with the server",
        variant: "destructive",
      })
    }
  }

  const makeAIMove = (currentBoard: string[]) => {
    const availableMoves = currentBoard.reduce((acc, cell, index) => {
      if (!cell) acc.push(index)
      return acc
    }, [] as number[])

    if (availableMoves.length > 0) {
      const randomMove = availableMoves[Math.floor(Math.random() * availableMoves.length)]
      setTimeout(() => handleClick(randomMove), 500)
    }
  }

  const checkWinner = () => {
    for (let i = 0; i < WINNING_COMBINATIONS.length; i++) {
      const [a, b, c] = WINNING_COMBINATIONS[i]
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        setWinner(board[a])
        return
      }
    }
    if (board.every(cell => cell !== null)) {
      setWinner('draw')
    }
  }

  const resetGame = () => {
    setBoard(Array(9).fill(null))
    setIsXNext(true)
    setWinner(null)
  }

  const startGame = (mode: GameMode) => {
    setGameMode(mode)
    resetGame()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-purple-400 via-pink-500 to-red-500">
        <div className="text-white text-4xl font-bold">Loading...</div>
      </div>
    )
  }

  if (!gameMode) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-purple-400 via-pink-500 to-red-500">
        <h1 className="text-4xl font-bold text-white mb-8">Tic Tac Toe</h1>
        <div className="flex space-x-4">
          <Button onClick={() => startGame('pvp')}>Player vs Player</Button>
          <Button onClick={() => startGame('pvai')}>Player vs AI</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-purple-400 via-pink-500 to-red-500">
      <h1 className="text-4xl font-bold text-white mb-8">Tic Tac Toe</h1>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {board.map((cell, index) => (
          <motion.button
            key={index}
            onClick={() => handleClick(index)}
            className="w-24 h-24 bg-white text-2xl font-bold flex items-center justify-center"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            {cell}
          </motion.button>
        ))}
      </div>
      {winner && (
        <div className="text-2xl text-white mb-4">
          {winner === 'draw' ? 'Draw!' : `Winner: ${winner}`}
        </div>
      )}
      <Button onClick={resetGame}>Restart Game</Button>
      <div className="mt-8">
        <h2 className="text-2xl text-white mb-2">Game History</h2>
        <ul className="text-white">
          {gameHistory.map((game) => (
            <li key={game.id}>
              Game {game.id}: Winner: {game.winner}, Played at: {new Date(game.created_at).toLocaleString()}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
