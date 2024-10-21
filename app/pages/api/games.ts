import { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const query = 'SELECT id, winner, loser, created_at FROM games WHERE winner IS NOT NULL ORDER BY created_at DESC LIMIT 10';
      const result = await pool.query(query);
      res.status(200).json(result.rows);
    } catch (error) {
      console.error('Error fetching games:', error);
      res.status(500).json({ error: 'Failed to fetch games' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}