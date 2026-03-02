import React from 'react';
import useAppStore from '../../store/useAppStore';
import './WorkerLoginScreen.css';

/**
 * WorkerLoginScreen
 * 
 * Worker Role Login view.
 * Matches the same premium styling as Official Login but uses a worker-specific icon (HardHat).
 * 
 * @param {object} props
 * @param {'desktop'|'mobile'} props.variant - Sizing context
 */
const WorkerLoginScreen = ({ variant = 'mobile' }) => {
    const isMobile = variant === 'mobile';
    const navigate = useAppStore(state => state.navigate);
    const login = useAppStore(state => state.login);
    const setWorkerDashboardTab = useAppStore(state => state.setWorkerDashboardTab);

    const [email, setEmail] = React.useState('worker1@test.com');
    const [password, setPassword] = React.useState('123456');

    const handleBack = () => {
        navigate('role-selection');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const res = await login(email, password);
        if (res && res.success) {
            setWorkerDashboardTab('HOME');
            navigate('worker-dashboard');
        } else {
            alert('Invalid credentials');
        }
    };

    const handleWorkerSwitch = (num) => {
        setEmail(`worker${num}@test.com`);
        setPassword('123456');
    };

    const handleOfficialLogin = () => {
        navigate('official-login');
    };

    return (
        <div className={`login-root ${!isMobile ? 'login-desktop' : ''}`}>

            {/* Nav Header */}
            <div className="login-header-nav">
                <button className="login-back-btn" onClick={handleBack} aria-label="Go back">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
            </div>

            {/* Branding Section */}
            <div className="login-branding">
                <div className="login-icon-box">
                    <span className="material-symbols-outlined" style={{ fontSize: 40 }}>engineering</span>
                </div>
                <h1 className="login-title">Worker Login</h1>
                <p className="login-subtitle">Access your worker dashboard.</p>
            </div>

            {/* Login Card */}
            <div className="login-card">
                <style>{`
                    .worker-selection { display: flex; gap: 8px; margin-bottom: 20px; }
                    .worker-chip { flex: 1; padding: 10px; border-radius: 8px; border: 1.5px solid #e2e8f0; background: #f8fafc; cursor: pointer; transition: all 0.2s; font-size: 13px; font-weight: 600; text-align: center; }
                    .worker-chip.active { border-color: #3b82f6; background: #eff6ff; color: #3b82f6; }
                `}</style>

                <div className="worker-selection">
                    <div className={`worker-chip ${email === 'worker1@test.com' ? 'active' : ''}`} onClick={() => handleWorkerSwitch(1)}>Worker 1</div>
                    <div className={`worker-chip ${email === 'worker2@test.com' ? 'active' : ''}`} onClick={() => handleWorkerSwitch(2)}>Worker 2</div>
                </div>

                <form className="login-form" onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label className="input-label-login" htmlFor="workerId">Email / Mobile</label>
                        <input
                            id="workerId"
                            type="text"
                            className="input-field-login"
                            placeholder="e.g. worker1@test.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div className="input-group" style={{ marginBottom: 0 }}>
                        <label className="input-label-login" htmlFor="password">Password</label>
                        <div className="password-input-wrap">
                            <input
                                id="password"
                                type="password"
                                className="input-field-login"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <button className="password-toggle" type="button" aria-label="Toggle password visibility">
                                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>visibility</span>
                            </button>
                        </div>
                    </div>

                    <a href="#forgot" className="forgot-password-link">Forgot Password?</a>

                    <button className="login-submit-btn" type="submit">
                        Login
                    </button>
                </form>
            </div>

            {/* Switch to Official Login */}
            <div className="login-footer-actions">
                <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>Login as Worker 2 for the second worker flow</p>
                <button className="official-login-btn" onClick={handleOfficialLogin}>
                    Official Login
                </button>
            </div>

            {/* Mobile Footer Indicator */}
            {isMobile && <div className="home-indicator-login" aria-hidden="true" />}

        </div>
    );
};

export default WorkerLoginScreen;
