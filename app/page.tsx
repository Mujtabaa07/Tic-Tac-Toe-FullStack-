/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/select";
import { toast, Toaster } from "react-hot-toast";
import {
  IoClose,
  IoEllipseOutline,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  IoTrophyOutline,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  IoPeopleOutline,
  IoChevronUp,
  IoChevronDown,
} from "react-icons/io5";

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

interface Game {
  id: number;
  winner: string;
  loser: string;
  created_at: string;
}

interface LeaderboardEntry {
  player: string;
  wins: number;
  losses: number;
}

type GameMode = "pvp" | "online";
type GameState = "menu" | "game" | "waiting" | "symbol_selection";
type Symbol = "X" | "O";

export default function Component() {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [winner, setWinner] = useState<string | null>(null);
  const [gameHistory, setGameHistory] = useState<Game[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [player1Name, setPlayer1Name] = useState("");
  const [player2Name, setPlayer2Name] = useState("");
  const [gameState, setGameState] = useState<GameState>("menu");
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [gameId, setGameId] = useState("");
  const [isWaiting, setIsWaiting] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [gameIdInput, setGameIdInput] = useState("");
  const [playerSymbol, setPlayerSymbol] = useState<Symbol | null>(null);
  const [opponentSymbol, setOpponentSymbol] = useState<Symbol | null>(null);
  const [isMyTurn, setIsMyTurn] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    fetchGameHistory();
    fetchLeaderboard();
  }, []);

  useEffect(() => {
    checkWinner();
  }, [board]);

  useEffect(() => {
    if (socket) {
      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log("Received WebSocket message:", data);
        if (data.type === "gameStart") {
          toast.success(`Game started! ${data.game.player2} has joined.`);
          setPlayer1Name(data.game.player1);
          setPlayer2Name(data.game.player2);
          setBoard(data.game.board);
          setWinner(data.game.winner);
          setIsXNext(data.game.currentPlayer === "X");
          setIsWaiting(false);
          setGameState("symbol_selection");
        } else if (data.type === "symbolSelected") {
          if (isHost) {
            setOpponentSymbol(data.game.player2.symbol);
            setPlayerSymbol(data.game.player1.symbol);
          } else {
            setPlayerSymbol(data.game.player2.symbol);
            setOpponentSymbol(data.game.player1.symbol);
          }
          setIsMyTurn(data.game.currentPlayer === playerSymbol);
          setGameState("game");
        } else if (data.type === "moveMade") {
          handleIncomingMove(data.game.board, data.game.currentPlayer, data.game.lastMove);
        } else if (data.type === "playerJoined") {
          toast.success(`${data.playerName} has joined the game!`);
          setPlayer2Name(data.playerName);
          setGameState("symbol_selection");
        } else if (data.type === "gameCreated") {
          setGameId(data.gameId);
          toast.success(`Game created with ID: ${data.gameId}`);
        } else if (data.type === "error") {
          toast.error(data.message);
        }
      };

      socket.onclose = () => {
        console.log("WebSocket connection closed");
        toast.error("Lost connection to the game server");
        setGameState("menu");
      };

      socket.onerror = (error) => {
        console.error("WebSocket error:", error);
        toast.error("Error in game connection");
      };
    }

    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [socket, isHost, playerSymbol]);

  const fetchGameHistory = async () => {
    try {
      const response = await fetch("/api/games");
      const data = await response.json();
      setGameHistory(data);
    } catch (error) {
      console.error("Failed to fetch game history:", error);
      toast.error("Failed to fetch game history");
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch("/api/leaderboard");
      const data = await response.json();
      if (Array.isArray(data)) {
        setLeaderboard(data);
      } else {
        console.error("Leaderboard data is not an array:", data);
        toast.error("Invalid leaderboard data received");
      }
    } catch (error) {
      console.error("Failed to fetch leaderboard:", error);
      toast.error("Failed to fetch leaderboard");
    }
  };

  const handleIncomingMove = (newBoard: string[], currentPlayer: string, lastMove: { player: string, index: number }) => {
    setBoard(newBoard);
    setIsXNext(currentPlayer === "O");
    setIsMyTurn(currentPlayer === playerSymbol);
    toast.success(`Opponent played ${lastMove.player} at position ${lastMove.index + 1}`);
  };

  const handleClick = async (index: number) => {
    if (board[index] || winner || (gameMode === "online" && !isMyTurn)) return;

    const newBoard = [...board];
    newBoard[index] = gameMode === "online" ? playerSymbol : (isXNext ? "X" : "O");
    setBoard(newBoard);
    setIsXNext(!isXNext);

    if (gameMode === "online") {
      setIsMyTurn(false);
      socket?.send(JSON.stringify({ type: "move", gameId, index }));
    } else {
      try {
        const response = await fetch("/api/move", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            board: newBoard,
            mode: gameMode,
            player1: player1Name,
            player2: player2Name,
            gameId,
          }),
        });
        const data = await response.json();
        if (data.winner) {
          setWinner(data.winner);
          const winnerName = data.winner === "X" ? player1Name : player2Name;
          const loserName = data.winner === "X" ? player2Name : player1Name;
          toast.success(`${winnerName} wins!`, { duration: 5000 });
          updateLeaderboard(winnerName, loserName);
        }
      } catch (error) {
        console.error("Failed to communicate with the server:", error);
        toast.error("Failed to communicate with the server");
      }
    }
    checkWinner();
  };

  const handleJoinGame = () => {
    if (!player1Name) {
      toast.error("Please enter your name");
      return;
    }
    if (!gameIdInput) {
      toast.error("Please enter a valid game ID");
      return;
    }

    const newSocket = new WebSocket("ws://https://tic-tac-toe-fullstack-1.onrender.com");
    setSocket(newSocket);
    setIsWaiting(true);
    newSocket.onopen = () => {
      newSocket.send(JSON.stringify({ type: "join", gameId: gameIdInput, playerName: player1Name }));
    };
  };

  const startGame = (mode: GameMode) => {
    if (mode === "online") {
      if (!player1Name) {
        toast.error("Please enter your name");
        return;
      }
      setIsHost(true);
      setGameMode(mode);
      
      const newGameId = "game-" + Math.floor(Math.random() * (999 - 100 + 1) + 100);
      setGameId(newGameId);

      const newSocket = new WebSocket("ws://https://tic-tac-toe-fullstack-1.onrender.com");
      setSocket(newSocket);
      setIsWaiting(true);
      newSocket.onopen = () => {
        newSocket.send(JSON.stringify({ type: "join", gameId: newGameId, playerName: player1Name }));
      };
    } else {
      if (!player1Name || !player2Name) {
        toast.error("Please enter names for both players");
        return;
      }
      setGameMode(mode);
      setGameState("game");
      resetGame();
    }
  };

  const checkWinner = () => {
    for (let i = 0; i < WINNING_COMBINATIONS.length; i++) {
      const [a, b, c] = WINNING_COMBINATIONS[i];
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        setWinner(board[a]);
        const winnerName = board[a] === "X" ? player1Name : player2Name;
        const loserName = board[a] === "X" ? player2Name : player1Name;
        toast.success(`${winnerName} wins!`, { duration: 5000 });
        updateLeaderboard(winnerName, loserName);
        return;
      }
    }
    if (board.every((cell) => cell !== null)) {
      setWinner("draw");
      toast.success("It's a draw!", { duration: 5000 });
    }
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setIsXNext(true);
    setWinner(null);
    setIsMyTurn(playerSymbol === "X");
  };

  const updateLeaderboard = async (winner: string, loser: string) => {
    try {
      await fetch("/api/update-leaderboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ winner, loser }),
      });
      fetchLeaderboard();
    } catch (error) {
      console.error("Failed to update leaderboard:", error);
      toast.error("Failed to update leaderboard");
    }
  };

  const handleSymbolSelection = (symbol: Symbol) => {
    if (opponentSymbol === symbol) {
      toast.error("This symbol has already been selected by your opponent. Please choose the other symbol.");
      return;
    }
    setPlayerSymbol(symbol);
    setOpponentSymbol(symbol === "X" ? "O" : "X");
    setIsMyTurn(symbol === "X");
    if (socket) {
      socket.send(JSON.stringify({ type: "symbolSelected", gameId, symbol }));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-purple-400 via-pink-500 to-red-500">
        <div className="text-white text-4xl font-bold">Loading... <span className="text-black">Your</span> Game</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 p-4">
      <Toaster />
      <h1 className="text-5xl font-bold text-white mb-8 tracking-tight">
        Tic Tac Toe
      </h1>

      <AnimatePresence mode="wait">
        {gameState === "menu" && (
          <motion.div
            key="menu"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center space-y-4 bg-white p-8 rounded-xl shadow-2xl"
          >
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Leaderboard</h2>
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center"
              onClick={() => setIsLeaderboardOpen(!isLeaderboardOpen)}
            >
              {isLeaderboardOpen ? <IoChevronUp /> : <IoChevronDown />}
              <span className="ml-2">Show Leaderboard</span>
            </button>
            {isLeaderboardOpen && (
              <ul className="space-y-2 w-full mt-4">
                {Array.isArray(leaderboard) && leaderboard.map((entry, index) => (
                  <li
                    key={index}
                    className={`flex justify-between p-2 rounded-lg cursor-pointer ${
                      index === 0
                        ? "bg-yellow-800"
                        : index === 1
                        ? "bg-red-500"
                        : index === 2
                        ? "bg-yellow-400"
                        : "bg-blue-500"
                    }`}
                    onClick={() => fetchLeaderboard()}
                  >
                    <span>{entry.player}</span>
                    <span>{entry.wins} Wins / {entry.losses} Losses</span>
                  </li>
                ))}
              </ul>
            )}
            <Select onValueChange={(value) => setGameMode(value as GameMode)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Game Mode" />
              
              </SelectTrigger>
              <SelectContent className="bg-black text-white">
                <SelectItem className="cursor-pointer" value="pvp">Player vs Player</SelectItem>
                <SelectItem className="cursor-pointer" value="online">Online PvP</SelectItem>
              </SelectContent>
            </Select>
            {gameMode === "pvp" && (
              <>
                <Input
                  type="text"
                  placeholder="Player 1 Name"
                  value={player1Name}
                  onChange={(e) => setPlayer1Name(e.target.value)}
                  className="w-full"
                />
                <Input
                  type="text"
                  placeholder="Player 2 Name"
                  value={player2Name}
                  onChange={(e) => setPlayer2Name(e.target.value)}
                  className="w-full"
                />
              </>
            )}
            {gameMode === "online" && (
              <Input
                type="text"
                placeholder="Your Name"
                value={player1Name}
                onChange={(e) => setPlayer1Name(e.target.value)}
                className="w-full"
              />
            )}
            <Button
              onClick={() => startGame(gameMode as GameMode)}
              className="w-full mt-4 bg-blue-500 hover:bg-blue-600"
              disabled={!gameMode}
            >
              Start Game
            </Button>
            {gameMode === "online" && (
              <>
                <div className="w-full mt-4 text-black font-bold">
                  <Button className="bg-orange-500 hover:bg-pink-600 font-bold w-full mb-2" onClick={() => setIsHost(true)}>Host Game</Button>
                  <Button className="bg-green-500 hover:bg-green-600 font-bold w-full" onClick={() => setIsHost(false)}>Join Game</Button>
                </div>
                {isHost && gameId && (
                  <div className="text-black font-bold">
                    <h2 className="text-black">Game ID: {gameId}</h2>
                    <p>Share this Game ID with your friend!</p>
                  </div>
                )}
                {!isHost && (
                  <div className="w-full flex flex-col items-center">
                    <Input
                      className="w-full mb-2"
                      type="text"
                      placeholder="Enter Game ID"
                      value={gameIdInput}
                      onChange={(e) => setGameIdInput(e.target.value)}
                    />
                    <Button className="w-full bg-black text-white" onClick={handleJoinGame}>Join Game</Button>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
        {isWaiting && (
          <motion.div
            key="waiting"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center space-y-4 bg-white p-8 rounded-xl shadow-2xl"
          >
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Waiting for Player 2...</h2>
            <Input
              type="text"
              placeholder="Player 2 Name (Auto filled when they join)"
              value={player2Name}
              className="w-full"
              disabled
            />
            <Button onClick={() => setGameState("menu")} className="w-full bg-red-500 hover:bg-red-600">
              Back to Menu
            </Button>
          </motion.div>
        )}
        {gameState === "symbol_selection" && (
          <motion.div
            key="symbol_selection"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center space-y-4 bg-white p-8 rounded-xl shadow-2xl"
          >
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Choose Your Symbol</h2>
            <div className="flex space-x-4">
              <Button onClick={() => handleSymbolSelection("X")} className="w-24 h-24 text-4xl" disabled={opponentSymbol === "X"}>X</Button>
              <Button onClick={() => handleSymbolSelection("O")} className="w-24 h-24 text-4xl" disabled={opponentSymbol === "O"}>O</Button>
            </div>
            {opponentSymbol && (
              <p className="text-lg font-semibold">Opponent selected: {opponentSymbol}</p>
            )}
          </motion.div>
        )}
        {gameState === "game" && (
          <motion.div
            key="game"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center space-y-4"
          >
            <h2 className="text-3xl font-bold text-white mb-4">
              {`${player1Name} vs ${player2Name}`}
            </h2>
            {gameMode === "online" && (
              <div className="text-2xl font-bold text-white mb-4">
                {isMyTurn ? "Your Turn" : "Opponent's Turn"}
              </div>
            )}
            <div className="grid grid-cols-3 gap-4">
              {board.map((cell, index) => (
                <div
                  key={index}
                  className={`w-24 h-24 flex items-center justify-center bg-white rounded-xl shadow-md cursor-pointer text-4xl ${
                    cell || (gameMode === "online" && !isMyTurn) ? "cursor-not-allowed" : "cursor-pointer"
                  }`}
                  onClick={() => handleClick(index)}
                >
                  {cell === "X" && <IoClose className="text-red-500" />}
                  {cell === "O" && <IoEllipseOutline className="text-blue-500" />}
                </div>
              ))}
            </div>
            <Button
              onClick={resetGame}
              className="w-full bg-red-500 hover:bg-red-600"
            >
              Reset Game
            </Button>
            <Button
              onClick={() => setGameState("menu")}
              className="w-full bg-blue-500 hover:bg-blue-600"
            >
              Back to Menu   
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}