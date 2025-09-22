import React, { useState, useEffect } from 'react';

const IgisoroGame = () => {
  // Initialize board: 4 rows x 8 columns
  const initializeBoard = () => {
    const board = Array(4).fill().map(() => Array(8).fill(0));
    for (let col = 0; col < 8; col++) {
      board[1][col] = 4; // Player 2's inner row
      board[2][col] = 4; // Player 1's inner row
    }
    return board;
  };

  const [board, setBoard] = useState(initializeBoard());
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [moveHistory, setMoveHistory] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastCapture, setLastCapture] = useState(null);
  const [gameStats, setGameStats] = useState({ 
    totalMoves: 0, 
    gameStartTime: Date.now(),
    player1Captures: 0,
    player2Captures: 0
  });
  const [showTutorial, setShowTutorial] = useState(false);
  const [gameMode, setGameMode] = useState('pvp');
  const [tutorialStep, setTutorialStep] = useState(0);
  const [showAbout, setShowAbout] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sound effects
  const playSound = (type) => {
    if (!soundEnabled) return;
    
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      switch(type) {
        case 'move':
          oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.1);
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.1);
          break;
        case 'capture':
          oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.2);
          gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.2);
          break;
        case 'gameOver':
          oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.5);
          gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.5);
          break;
        default:
          break;
      }
    } catch (e) {
      console.log('Audio not supported');
    }
  };

  // Seed component with realistic appearance
  const Seed = ({ index, total, size = 'normal' }) => {
    const rotation = (index * 137.5) % 360;
    const baseRadius = size === 'small' ? 8 : 12;
    const radius = Math.min(baseRadius + (index % 3) * 2, size === 'small' ? 15 : 20);
    const x = Math.cos(rotation * Math.PI / 180) * (radius * Math.min(total, 8) / 8);
    const y = Math.sin(rotation * Math.PI / 180) * (radius * Math.min(total, 8) / 8);
    const seedSize = size === 'small' ? 'w-2 h-2' : 'w-3 h-3';
    
    return (
      <div
        className={`absolute ${seedSize} rounded-full shadow-lg transition-all duration-300`}
        style={{
          background: `radial-gradient(ellipse at 25% 25%, #ffffff 0%, #666666 30%, #333333 60%, #1a1a1a 85%, #000000 100%)`,
          transform: `translate(${x}px, ${y}px)`,
          zIndex: index,
          boxShadow: `0 2px 4px rgba(0,0,0,0.6), inset 0 1px 2px rgba(255,255,255,0.3)`
        }}
      />
    );
  };

  const isPitOwnedByPlayer = (row, col, player) => {
    if (player === 1) return row === 2 || row === 3;
    return row === 0 || row === 1;
  };

  const isPitPlayable = (row, col) => {
    return board[row][col] > 0 && isPitOwnedByPlayer(row, col, currentPlayer) && !isAnimating;
  };

  // Get next pit position counter-clockwise around entire board
  const getNextPosition = (row, col) => {
    if (row === 0) {
      if (col < 7) return [0, col + 1];
      else return [1, 7];
    } else if (row === 1) {
      if (col > 0) return [1, col - 1];
      else return [2, 0];
    } else if (row === 2) {
      if (col < 7) return [2, col + 1];
      else return [3, 7];
    } else {
      if (col > 0) return [3, col - 1];
      else return [0, 0];
    }
  };

  // Check if player can move
  const canPlayerMove = (player) => {
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 8; col++) {
        if (isPitOwnedByPlayer(row, col, player) && board[row][col] > 0) {
          return true;
        }
      }
    }
    return false;
  };

  // Count total seeds in player's territory
  const getPlayerSeeds = (player) => {
    let total = 0;
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 8; col++) {
        if (isPitOwnedByPlayer(row, col, player)) {
          total += board[row][col];
        }
      }
    }
    return total;
  };

  // Animate continuous sowing with traditional rules
  const animateMove = async (startRow, startCol) => {
    setIsAnimating(true);
    const newBoard = board.map(row => [...row]);
    
    let seeds = newBoard[startRow][startCol];
    newBoard[startRow][startCol] = 0;
    
    let currentRow = startRow;
    let currentCol = startCol;
    let totalCaptured = 0;

    // Continue sowing until we land in an empty pit
    while (seeds > 0) {
      // Sow seeds one by one
      while (seeds > 0) {
        await new Promise(resolve => setTimeout(resolve, isMobile ? 150 : 200));
        
        const [nextRow, nextCol] = getNextPosition(currentRow, currentCol);
        currentRow = nextRow;
        currentCol = nextCol;
        newBoard[currentRow][currentCol]++;
        seeds--;

        setBoard([...newBoard.map(row => [...row])]);
        playSound('move');
      }

      // Check if the pit where we landed is not empty (after adding our seed)
      if (newBoard[currentRow][currentCol] > 1) {
        seeds = newBoard[currentRow][currentCol];
        newBoard[currentRow][currentCol] = 0;
        
        // Check for capture in opponent's territory
        if (!isPitOwnedByPlayer(currentRow, currentCol, currentPlayer)) {
          totalCaptured += seeds;
          
          setLastCapture({ row: currentRow, col: currentCol, amount: seeds });
          setTimeout(() => setLastCapture(null), 1000);
          playSound('capture');
          
          // Update capture stats
          setGameStats(prev => ({
            ...prev,
            [`player${currentPlayer}Captures`]: prev[`player${currentPlayer}Captures`] + seeds
          }));
          
          seeds = 0; // Captured seeds don't continue sowing
        }
        
        await new Promise(resolve => setTimeout(resolve, 300));
        setBoard([...newBoard.map(row => [...row])]);
      } else {
        // Landed in empty pit - turn ends
        break;
      }
    }

    // Save move to history
    const moveData = {
      player: currentPlayer,
      from: { row: startRow, col: startCol },
      capturedSeeds: totalCaptured,
      boardAfter: newBoard.map(row => [...row])
    };
    setMoveHistory(prev => [...prev, moveData]);

    // Update stats
    setGameStats(prev => ({
      ...prev,
      totalMoves: prev.totalMoves + 1
    }));

    // Check game over
    const nextPlayer = currentPlayer === 1 ? 2 : 1;
    if (!canPlayerMove(nextPlayer)) {
      setGameOver(true);
      playSound('gameOver');
    } else {
      setCurrentPlayer(nextPlayer);
    }

    setIsAnimating(false);
  };

  const handlePitClick = (row, col) => {
    if (gameOver || !isPitPlayable(row, col)) return;
    
    // Tutorial mode guidance
    if (gameMode === 'tutorial' && tutorialStep < tutorialSteps.length) {
      const currentStep = tutorialSteps[tutorialStep];
      if (currentStep.targetPit && (currentStep.targetPit.row !== row || currentStep.targetPit.col !== col)) {
        return; // Only allow clicking the tutorial target pit
      }
      setTutorialStep(prev => prev + 1);
    }
    
    animateMove(row, col);
  };

  const resetGame = () => {
    setBoard(initializeBoard());
    setCurrentPlayer(1);
    setGameOver(false);
    setIsAnimating(false);
    setMoveHistory([]);
    setLastCapture(null);
    setTutorialStep(0);
    setGameStats({
      totalMoves: 0,
      gameStartTime: Date.now(),
      player1Captures: 0,
      player2Captures: 0
    });
  };

  const getWinner = () => {
    const player1Seeds = getPlayerSeeds(1);
    const player2Seeds = getPlayerSeeds(2);
    
    if (!canPlayerMove(1) && canPlayerMove(2)) return "Player 2";
    if (!canPlayerMove(2) && canPlayerMove(1)) return "Player 1";
    if (player1Seeds > player2Seeds) return "Player 1";
    if (player2Seeds > player1Seeds) return "Player 2";
    return "Tie";
  };

  const getGameDuration = () => {
    const duration = Date.now() - gameStats.gameStartTime;
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Tutorial steps
  const tutorialSteps = [
    { text: "Welcome to Igisoro! This is a traditional Rwandan strategy game. Click 'Next' to learn how to play.", targetPit: null },
    { text: "Each player controls two rows. You are Player 1 (blue indicators, bottom rows).", targetPit: null },
    { text: "Click on any pit in your territory that has seeds to make your first move.", targetPit: { row: 2, col: 0 } },
    { text: "Great! Seeds are sown counter-clockwise around the entire board. The turn continues until your last seed lands in an empty pit.", targetPit: null },
    { text: "If your last seed lands in an opponent's pit with seeds, you capture all those seeds!", targetPit: null },
    { text: "You win when your opponent cannot make any moves. Now you can play a full game!", targetPit: null }
  ];

  const player1Seeds = getPlayerSeeds(1);
  const player2Seeds = getPlayerSeeds(2);
  const pitSize = isMobile ? 'w-16 h-16' : 'w-20 h-20';

  // Modal Component
  const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-amber-900">{title}</h2>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            {children}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 p-2 md:p-4 relative overflow-hidden">
      {/* African pattern background */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M30 30c0-11.046-8.954-20-20-20s-20 8.954-20 20 8.954 20 20 20 20-8.954 20-20zm0 0c0 11.046 8.954 20 20 20s20-8.954 20-20-8.954-20-20-20-20 8.954-20 20z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}
      />

      <div className="flex flex-col items-center relative z-10">
        <div className="bg-gradient-to-b from-amber-900 to-amber-800 rounded-2xl shadow-2xl p-4 md:p-8 max-w-5xl w-full relative">
          {/* Decorative border */}
          <div className="absolute inset-4 border-4 border-yellow-600 rounded-xl opacity-30"></div>
          
          <h1 className={`${isMobile ? 'text-2xl' : 'text-4xl'} font-bold text-center text-yellow-100 mb-2 font-serif tracking-wide`}>
            IGISORO
          </h1>
          <p className={`text-center text-yellow-200 ${isMobile ? 'text-xs' : 'text-sm'} mb-4 italic`}>
            Traditional Rwandan Board Game
          </p>

          {/* Navigation Buttons */}
          <div className={`flex justify-center gap-2 ${isMobile ? 'flex-wrap' : ''} mb-6`}>
            <button
              onClick={() => setShowTutorial(true)}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-200 text-xs md:text-sm"
            >
              📚 Tutorial
            </button>
            <button
              onClick={() => setShowAbout(true)}
              className="px-3 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors duration-200 text-xs md:text-sm"
            >
              ℹ️ About
            </button>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`px-3 py-2 rounded-lg font-semibold transition-all duration-200 text-xs md:text-sm ${
                soundEnabled ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'
              }`}
            >
              {soundEnabled ? '🔊' : '🔇'}
            </button>
          </div>
          
          {/* Game Info */}
          <div className={`flex justify-between items-center mb-6 ${isMobile ? 'text-xs' : ''} relative z-10`}>
            <div className="bg-red-800 rounded-lg px-3 py-2 shadow-lg border border-red-600">
              <div className="text-yellow-100 font-bold">Player 2</div>
              <div className={`text-yellow-200 ${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-center`}>
                {player2Seeds}
              </div>
              <div className="text-yellow-300 text-xs text-center">seeds</div>
              <div className="text-yellow-300 text-xs text-center">
                {gameStats.player2Captures} captured
              </div>
            </div>
            
            <div className="text-center bg-amber-700 rounded-lg px-4 py-3 shadow-lg border border-amber-600">
              {gameOver ? (
                <div className="text-yellow-100">
                  <div className={`${isMobile ? 'text-sm' : 'text-lg'} font-bold`}>Game Over!</div>
                  <div className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-green-300`}>
                    {getWinner()}
                  </div>
                  <div className="text-yellow-300 text-xs">{getGameDuration()}</div>
                </div>
              ) : (
                <div className="text-yellow-100">
                  <div className="text-sm">Current Turn</div>
                  <div className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-green-300`}>
                    Player {currentPlayer}
                  </div>
                  <div className="text-yellow-300 text-xs">{getGameDuration()}</div>
                  {isAnimating && <div className="text-yellow-300 text-xs">Sowing...</div>}
                </div>
              )}
            </div>
            
            <div className="bg-blue-800 rounded-lg px-3 py-2 shadow-lg border border-blue-600">
              <div className="text-yellow-100 font-bold">Player 1</div>
              <div className={`text-yellow-200 ${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-center`}>
                {player1Seeds}
              </div>
              <div className="text-yellow-300 text-xs text-center">seeds</div>
              <div className="text-yellow-300 text-xs text-center">
                {gameStats.player1Captures} captured
              </div>
            </div>
          </div>

          {/* Tutorial Mode Indicator */}
          {gameMode === 'tutorial' && tutorialStep < tutorialSteps.length && (
            <div className="mb-4 bg-blue-100 rounded-lg p-3 border-2 border-blue-400">
              <div className="text-blue-800 font-semibold text-sm">
                Tutorial Step {tutorialStep + 1}/{tutorialSteps.length}
              </div>
              <div className="text-blue-700 text-sm mt-1">
                {tutorialSteps[tutorialStep].text}
              </div>
              <div className="mt-2">
                <button
                  onClick={() => {
                    if (tutorialStep < tutorialSteps.length - 1) {
                      setTutorialStep(prev => prev + 1);
                    } else {
                      setGameMode('pvp');
                      setTutorialStep(0);
                    }
                  }}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                >
                  {tutorialStep === tutorialSteps.length - 1 ? 'Finish Tutorial' : 'Next'}
                </button>
              </div>
            </div>
          )}

          {/* Game Board */}
          <div 
            className="rounded-2xl p-4 md:p-6 shadow-inner relative"
            style={{
              background: `linear-gradient(145deg, #A0522D, #8B4513, #654321), linear-gradient(to bottom, rgba(255,255,255,0.1), transparent 50%, rgba(0,0,0,0.1))`,
              boxShadow: `inset 0 8px 16px rgba(0,0,0,0.3), inset 0 -8px 16px rgba(139,69,19,0.1), inset 0 2px 4px rgba(255,255,255,0.2)`
            }}
          >
            {/* Wood grain texture overlay */}
            <div 
              className="absolute inset-0 rounded-2xl opacity-20"
              style={{
                backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(101,67,33,0.8) 2px, rgba(101,67,33,0.8) 4px)`
              }}
            />
            
            {/* Direction indicator */}
            {!isMobile && (
              <div className="absolute top-2 left-1/2 transform -translate-x-1/2 text-yellow-300 text-xs">
                ↻ Counter-clockwise sowing
              </div>
            )}
            
            <div className={`grid grid-rows-4 ${isMobile ? 'gap-2' : 'gap-3'} relative z-10`}>
              {[0, 1, 2, 3].map(rowIndex => (
                <div key={rowIndex} className={`grid grid-cols-8 ${isMobile ? 'gap-2' : 'gap-3'}`}>
                  {Array(8).fill().map((_, colIndex) => {
                    const isPlayable = isPitPlayable(rowIndex, colIndex);
                    const seedCount = board[rowIndex][colIndex];
                    const isLastCapture = lastCapture && lastCapture.row === rowIndex && lastCapture.col === colIndex;
                    const isPlayerTerritory = isPitOwnedByPlayer(rowIndex, colIndex, currentPlayer);
                    const isTutorialTarget = gameMode === 'tutorial' && tutorialStep < tutorialSteps.length && 
                                           tutorialSteps[tutorialStep].targetPit?.row === rowIndex && 
                                           tutorialSteps[tutorialStep].targetPit?.col === colIndex;
                    
                    return (
                      <button
                        key={`${rowIndex}-${colIndex}`}
                        onClick={() => handlePitClick(rowIndex, colIndex)}
                        disabled={gameOver || !isPlayable}
                        className={`
                          relative ${pitSize} rounded-full transition-all duration-300 flex items-center justify-center
                          ${isPlayable 
                            ? 'hover:scale-105 cursor-pointer shadow-lg hover:shadow-xl' 
                            : 'cursor-not-allowed'
                          }
                        `}
                        style={{
                          background: isPlayerTerritory
                            ? `radial-gradient(ellipse at 30% 30%, #F4A460, #CD853F, #8B4513, #654321), linear-gradient(145deg, rgba(255,255,255,0.2), transparent)`
                            : `radial-gradient(ellipse at 30% 30%, #8B7355, #654321, #3D2817, #2F1B14), linear-gradient(145deg, rgba(255,255,255,0.1), transparent)`,
                          boxShadow: `inset 0 6px 12px rgba(0,0,0,0.4), inset 0 -4px 8px rgba(139,69,19,0.2), 0 4px 8px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,255,255,0.2)`,
                          border: isPlayerTerritory ? '3px solid #D4AF37' : '3px solid #3D2817'
                        }}
                      >
                        {/* Pit interior shadow */}
                        <div 
                          className="absolute inset-2 rounded-full"
                          style={{
                            background: `radial-gradient(circle, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)`
                          }}
                        />
                        
                        {/* Seeds */}
                        <div className="relative w-full h-full flex items-center justify-center">
                          {Array.from({ length: Math.min(seedCount, isMobile ? 8 : 12) }, (_, i) => (
                            <Seed key={i} index={i} total={seedCount} size={isMobile ? 'small' : 'normal'} />
                          ))}
                          {seedCount > (isMobile ? 8 : 12) && (
                            <div className="absolute bottom-1 right-1 bg-yellow-600 text-black text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                              {seedCount}
                            </div>
                          )}
                        </div>
                        
                        {/* Visual indicators */}
                        {isPlayable && (
                          <div className="absolute inset-0 rounded-full bg-yellow-400 opacity-20 animate-pulse" />
                        )}
                        
                        {isTutorialTarget && (
                          <div className="absolute inset-0 rounded-full bg-blue-400 opacity-40 animate-pulse border-4 border-blue-300" />
                        )}
                        
                        {isLastCapture && (
                          <div className="absolute inset-0 rounded-full bg-red-400 opacity-60 animate-ping" />
                        )}

                        {/* Territory indicators */}
                        {isPlayerTerritory && (
                          <div className={`absolute top-0 right-0 ${isMobile ? 'w-2 h-2' : 'w-3 h-3'} rounded-full border border-yellow-600`} 
                               style={{background: currentPlayer === 1 ? '#3B82F6' : '#EF4444'}} />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="flex justify-center mt-6">
            <button
              onClick={resetGame}
              disabled={isAnimating}
              className={`px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-bold ${isMobile ? 'text-sm' : 'text-lg'} hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              🎮 New Game
            </button>
          </div>
        </div>
      </div>

      {/* Tutorial Modal */}
      <Modal isOpen={showTutorial} onClose={() => setShowTutorial(false)} title="How to Play Igisoro">
        <div className="space-y-4 text-sm text-gray-700">
          <p><strong>Igisoro</strong> is a traditional strategy game from Rwanda, part of the ancient Mancala family of games.</p>
          
          <div>
            <h3 className="font-bold text-amber-900 mb-2">Basic Rules:</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Each player controls two rows of pits (8 pits per row)</li>
              <li>Game starts with 4 seeds in each inner row pit</li>
              <li>Players take turns sowing seeds counter-clockwise around the entire board</li>
              <li>If your last seed lands in a non-empty pit, pick up all seeds and continue sowing</li>
              <li>Turn ends only when your last seed lands in an empty pit</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-bold text-amber-900 mb-2">Winning:</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Capture opponent's seeds when sowing in their territory</li>
              <li>Win when your opponent cannot make any moves</li>
              <li>Player with more seeds wins if both can still move</li>
            </ul>
          </div>
          
          <button
            onClick={() => {
              setShowTutorial(false);
              setGameMode('tutorial');
              resetGame();
            }}
            className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Start Interactive Tutorial
          </button>
        </div>
      </Modal>

      {/* About Modal */}
      <Modal isOpen={showAbout} onClose={() => setShowAbout(false)} title="About Igisoro">
        <div className="space-y-4 text-sm text-gray-700">
        <p>
            <strong>Igisoro</strong> is one of the oldest games on Earth, played in Egypt centuries before Christ. 
            In Rwanda, igisoro boards engraved on rocks are attributed to King Ruganzu (1510-1543).
          </p>
          
          <p>
            This digital version follows the traditional Rwandan rules, preserving the authentic gameplay 
            that has been passed down through generations.
          </p>
          
          <div>
            <h3 className="font-bold text-amber-900 mb-2">Cultural Significance:</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Ancient strategy game with deep cultural roots in Rwanda</li>
              <li>Traditionally played with seeds or pebbles called "agasoro" or "inka" (cows)</li>
              <li>Part of the larger Mancala family of games found across Africa</li>
              <li>Teaches strategic thinking and mathematical concepts</li>
            </ul>
          </div>
          
          <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
            <p className="text-xs text-amber-800">
              This game is created with respect for Rwandan cultural heritage and traditional gameplay rules.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default IgisoroGame;
