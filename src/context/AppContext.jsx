import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AppContext = createContext();

export const useApp = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useApp must be used within AppProvider');
    }
    return context;
};

export const AppProvider = ({ children }) => {
    const [isConnected, setIsConnected] = useState(false);
    const [monitoringData, setMonitoringData] = useState([]);
    const [formSubmissions, setFormSubmissions] = useState([]);
    const [customers, setCustomers] = useState([]);

    // Test connection on mount
    useEffect(() => {
        testConnection();
    }, []);

    const testConnection = async () => {
        try {
            const data = await api.health();
            if (data.success) {
                setIsConnected(true);
            }
        } catch (error) {
            setIsConnected(false);
        }
    };

    const loadMonitoringData = async () => {
        try {
            const res = await api.getAllMonitoring();
            if (res.success) {
                setMonitoringData(res.data);
            }
        } catch (error) {
            console.error('Error loading monitoring data:', error);
        }
    };

    const loadFormSubmissions = async () => {
        try {
            const res = await api.getAllFormSubmissions();
            if (res.success) {
                setFormSubmissions(res.data);
            }
        } catch (error) {
            console.error('Error loading form submissions:', error);
        }
    };

    const loadCustomers = async () => {
        try {
            const res = await api.getAllCustomers();
            if (res.success) {
                setCustomers(res.data);
            }
        } catch (error) {
            console.error('Error loading customers:', error);
        }
    };

    const value = {
        isConnected,
        setIsConnected,
        monitoringData,
        setMonitoringData,
        formSubmissions,
        setFormSubmissions,
        customers,
        setCustomers,
        loadMonitoringData,
        loadFormSubmissions,
        loadCustomers,
        testConnection
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
