import { createContext, useContext, useState, useEffect, Children } from "react";
import api from '../api/axios';

const AuthContext = createContext();

export const AuthProvider = ({children}) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('accessToken');
            if(token) {
                try {
                    const {data} = await api.get('/auth/me');
                    setUser(data.user);
                } catch (error) {
                    localStorage.removeItem('accessToken');
                }
            }
            setLoading(false);
        };
        checkAuth();
    }, []);

    const login = async (email, password) => {
        const {data} = await api.post('/auth/login', {email, password});
        localStorage.setItem('accessToken', data.accessToken);
        setUser(data.user);
    };

    const register = async (username, email, password) => {
        const {data} = await api.post('/auth/register', {
            username,
            email,
            password,
        });
        localStorage.setItem('accessToken', data.accessToken);
        setUser(data.user);
    };

    const logout = async () => {
        try {
            await api.post('/auth/logout');
        } catch (error) {}

        localStorage.removeItem('accessToken');
        setUser(null);
    };

    return(
        <AuthContext.Provider value={{user, loading, login, register, logout}}>
            {children}
        </AuthContext.Provider>
    );

};

export const useAuth = () => useContext(AuthContext);