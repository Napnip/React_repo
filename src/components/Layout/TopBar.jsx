import { useApp } from '../../context/AppContext';

const TopBar = () => {
    const { isConnected } = useApp();

    return (
        <div className="top-bar">
            <div className="top-bar-content">
                <div className="logo">CAELUM</div>
                <div className="connection-indicator">
                    <div className={`connection-dot ${isConnected ? 'connected' : ''}`}></div>
                    <span>{isConnected ? 'Connected' : 'Not Connected'}</span>
                </div>
            </div>
        </div>
    );
};

export default TopBar;
