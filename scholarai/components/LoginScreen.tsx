import React, { useState } from 'react';
import { BotIcon } from './Icons';

interface LoginScreenProps {
    onAuth: (username: string, password: string, isSignUp: boolean) => boolean;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onAuth }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        if (username.trim() && password.trim()) {
            const success = onAuth(username.trim(), password.trim(), isSignUp);
            if (!success) {
                setError(isSignUp ? 'Username is already taken.' : 'Invalid username or password.');
            }
        }
    };

    const toggleMode = () => {
        setIsSignUp(!isSignUp);
        setError(null);
        setUsername('');
        setPassword('');
    };

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-white">
            <div className="w-full max-w-sm p-8 bg-slate-800 rounded-2xl shadow-lg border border-slate-700">
                <div className="flex flex-col items-center mb-6">
                    <BotIcon className="w-16 h-16 text-blue-500 mb-3" />
                    <h1 className="text-3xl font-bold text-slate-100">ScholarAI</h1>
                    <p className="text-slate-400 mt-1">{isSignUp ? 'Create an account' : 'Sign in to continue'}</p>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label htmlFor="username" className="block text-sm font-medium text-slate-400 mb-2">Username</label>
                        <input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter your name"
                            className="w-full bg-slate-700 rounded-lg p-3 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-500"
                            autoFocus
                        />
                    </div>
                     <div className="mb-6">
                        <label htmlFor="password" className="block text-sm font-medium text-slate-400 mb-2">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            className="w-full bg-slate-700 rounded-lg p-3 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-500"
                        />
                    </div>
                    {error && <p className="text-red-400 text-sm text-center mb-4">{error}</p>}
                    <button
                        type="submit"
                        disabled={!username.trim() || !password.trim()}
                        className="w-full bg-blue-600 text-white rounded-lg p-3 font-semibold hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                        {isSignUp ? 'Sign Up' : 'Sign In'}
                    </button>
                </form>
                <div className="text-center mt-6">
                    <button onClick={toggleMode} className="text-sm text-blue-400 hover:underline">
                        {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoginScreen;