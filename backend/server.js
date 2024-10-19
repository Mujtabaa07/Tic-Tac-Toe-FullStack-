/* eslint-disable @typescript-eslint/no-require-imports */
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Connect to PostgreSQL database using connection string from .env file
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Winning combinations for Tic-Tac-Toe
const WINNING_COMBINATIONS = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

// Check for a winner or draw
function checkWinner(board) {
  if (board.length !== 9) {
    return null; // Ensure board has 9 cells
  }

  for (let i = 0; i < WINNING_COMBINATIONS.length; i++) {
    const [a, b, c] = WINNING_COMBINATIONS[i];
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  if (board.every((cell) => cell !== null)) {
    return 'draw';
  }
  return null;
}

// Handle player moves and check the game state
app.post('/api/move', async (req, res) => {
  const { board, mode } = req.body;

  console.log('Received board:', board); // Debugging log for the board

  const winner = checkWinner(board);

  try {
    // Save game state to database only if there's a winner or a draw
    if (winner) {
      const query = 'INSERT INTO games (board, winner, mode) VALUES ($1, $2, $3) RETURNING id';
      const values = [board, winner, mode || 'pvp'];
      const result = await pool.query(query, values);
      res.json({ winner, gameId: result.rows[0].id });
    } else {
      res.json({ winner: null, gameId: null });
    }
  } catch (error) {
    console.error('Error saving game:', error);
    res.status(500).json({ error: 'Failed to save game' });
  }
});

// Fetch the latest game history (last 10 completed games)
app.get('/api/games', async (req, res) => {
  try {
    const query = 'SELECT * FROM games WHERE winner IS NOT NULL ORDER BY created_at DESC LIMIT 10';
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching games:', error);
    res.status(500).json({ error: 'Failed to fetch games' });
  }
});

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
