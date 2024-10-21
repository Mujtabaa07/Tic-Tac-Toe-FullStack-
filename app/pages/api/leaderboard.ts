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
      const query = `
        SELECT player, 
        SUM(CASE WHEN player = winner THEN 1 ELSE 0 END) AS wins,
        SUM(CASE WHEN player = loser THEN 1 ELSE 0 END) AS losses
        FROM (
          SELECT winner as player, winner, loser FROM games
          UNION ALL
          SELECT loser as player, winner, loser FROM games
        ) as all_players
        GROUP BY player
        ORDER BY wins DESC, losses ASC
        LIMIT 10;
      `;
      const result = await pool.query(query);
      res.status(200).json(result.rows);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}