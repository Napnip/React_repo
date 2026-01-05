import Sidebar from './Sidebar';
import TopBar from './TopBar';

const MainLayout = ({ children }) => {
    return (
        <>
            <Sidebar />
            <div className="main-content">
                <TopBar />
                <div className="container">
                    {children}
                </div>
            </div>
        </>
    );
};

export default MainLayout;
