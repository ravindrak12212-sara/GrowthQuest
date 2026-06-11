import React from 'react';
import { useNavigate } from 'react-router-dom';

const games = [
    { id: 1, title: "Spin the Wheel", description: "Spin the wheel to win exciting point rewards!", buttonText: "Play Now" },
    { id: 2, title: "Color Blast", description: "Match colors to create explosive combos and earn points.", buttonText: "Play Now" },
    { id: 3, title: "Puzzle Mania", description: "Solve intricate puzzles and challenge your mind for points.", buttonText: "Coming Soon", disabled: true },
    { id: 4, title: "Type Racer", description: "Test your typing speed and accuracy to win rewards.", buttonText: "Coming Soon", disabled: true },
];

function GameCenter() {
    const navigate = useNavigate();

    const pageStyle = {
        fontFamily: `'Segoe UI', Tahoma, Geneva, Verdana, sans-serif`,
        backgroundColor: '#f4f7f6',
        color: '#333',
        minHeight: '100vh',
        padding: '2rem',
    };

    const headerStyle = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        marginBottom: '3rem'
    };
    
    const backButtonStyle = {
        position: 'absolute',
        top: '50%',
        left: 0,
        transform: 'translateY(-50%)',
        padding: '0.5rem 1rem',
        borderRadius: '8px',
        border: '1px solid #ccc',
        background: 'white',
        cursor: 'pointer',
        fontSize: '0.9rem'
    };

    const titleStyle = {
        fontSize: '2.5rem',
        fontWeight: 'bold',
        color: '#4a00e0',
        textAlign: 'center'
    };

    const gameGridStyle = {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '2rem',
        maxWidth: '1200px',
        margin: '0 auto'
    };

    const gameCardStyle = {
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '2rem',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
    };
    
    const gameTitleStyle = {
        fontSize: '1.5rem',
        fontWeight: '600',
        color: '#4a00e0',
        marginBottom: '1rem'
    };
    
    const gameDescriptionStyle = {
        fontSize: '1rem',
        opacity: 0.8,
        lineHeight: 1.5,
        marginBottom: '2rem',
        flexGrow: 1
    };

    const playButtonStyle = {
        padding: '0.8rem 1.5rem',
        borderRadius: '8px',
        border: 'none',
        color: 'white',
        fontSize: '1rem',
        fontWeight: 'bold',
        cursor: 'pointer',
        transition: 'all 0.3s',
        width: '100%',
    };

    return (
        <div style={pageStyle}>
            <header style={headerStyle}>
                <button style={backButtonStyle} onClick={() => navigate('/dashboard')}>&larr; Back to Dashboard</button>
                <h1 style={titleStyle}>Game Center</h1>
            </header>
            <div style={gameGridStyle}>
                {games.map(game => (
                    <div key={game.id} style={gameCardStyle}>
                        <div>
                           <h2 style={gameTitleStyle}>{game.title}</h2>
                           <p style={gameDescriptionStyle}>{game.description}</p>
                        </div>
                        <button 
                            style={{
                                ...playButtonStyle, 
                                background: game.disabled ? '#ccc' : 'linear-gradient(to right, #11998e, #38ef7d)',
                                cursor: game.disabled ? 'not-allowed' : 'pointer'
                            }} 
                            disabled={game.disabled}
                        >
                            {game.buttonText}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default GameCenter;
