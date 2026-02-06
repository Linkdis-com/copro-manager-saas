import { Component } from 'react';
import { AlertTriangle, RefreshCw, Home, LogIn } from 'lucide-react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoLogin = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={styles.page}>
          <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800;900&display=swap');

            @keyframes craneSwing {
              0%, 100% { transform: rotate(-5deg); }
              50% { transform: rotate(5deg); }
            }
            @keyframes smokePuff {
              0% { opacity: 0.6; transform: translateY(0) scale(1); }
              100% { opacity: 0; transform: translateY(-40px) scale(2); }
            }
            @keyframes blink {
              0%, 90%, 100% { opacity: 1; }
              95% { opacity: 0; }
            }
            @keyframes pulse {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.05); }
            }
            .eb-btn-primary:hover {
              transform: translateY(-2px) !important;
              box-shadow: 0 8px 25px rgba(239, 68, 68, 0.4) !important;
            }
            .eb-btn-secondary:hover {
              background: rgba(255, 255, 255, 0.1) !important;
              border-color: rgba(255, 255, 255, 0.2) !important;
              transform: translateY(-1px) !important;
            }
          `}</style>

          <div style={styles.content}>
            {/* Construction scene */}
            <div style={styles.scene}>
              {/* Crane */}
              <div style={styles.craneBase}>
                <div style={styles.cranePole} />
                <div style={styles.craneArm}>
                  <div style={styles.craneRope} />
                  <div style={styles.craneHook}>⚠</div>
                </div>
              </div>

              {/* Broken building */}
              <div style={styles.building}>
                <div style={styles.buildingBody}>
                  {/* Crack */}
                  <div style={styles.crack} />
                  {/* Windows */}
                  <div style={styles.windowGrid}>
                    {[...Array(6)].map((_, i) => (
                      <div key={i} style={{
                        ...styles.window,
                        ...(i === 2 || i === 4 ? styles.windowBroken : {}),
                        ...(i === 1 || i === 5 ? styles.windowDark : {})
                      }} />
                    ))}
                  </div>
                </div>
                {/* Rubble */}
                <div style={styles.rubble1} />
                <div style={styles.rubble2} />
                <div style={styles.rubble3} />
              </div>

              {/* Smoke puffs */}
              <div style={styles.smoke1} />
              <div style={styles.smoke2} />

              <div style={styles.ground} />
            </div>

            {/* Warning icon */}
            <div style={styles.iconContainer}>
              <AlertTriangle size={32} color="#ef4444" />
            </div>

            <div style={styles.errorCode}>Oups !</div>
            <h1 style={styles.title}>Travaux en cours...</h1>
            <p style={styles.message}>
              Un problème technique a secoué l'immeuble.
              Nos équipes de maintenance sont déjà sur place !
            </p>
            <p style={styles.submessage}>
              En attendant la fin des travaux, rechargez la page ou rentrez à la maison 🏗️
            </p>

            {/* Error detail */}
            {this.state.error && (
              <div style={styles.errorDetail}>
                <code style={styles.errorCode2}>
                  {this.state.error.toString().substring(0, 200)}
                </code>
              </div>
            )}

            {/* Buttons */}
            <div style={styles.buttons}>
              <button className="eb-btn-primary" style={styles.btnPrimary} onClick={this.handleReload}>
                <RefreshCw size={18} />
                Recharger la page
              </button>
              <div style={styles.btnRow}>
                <button className="eb-btn-secondary" style={styles.btnSecondary} onClick={this.handleGoHome}>
                  <Home size={16} />
                  Accueil
                </button>
                <button className="eb-btn-secondary" style={styles.btnSecondary} onClick={this.handleGoLogin}>
                  <LogIn size={16} />
                  Connexion
                </button>
              </div>
            </div>

            <p style={styles.footer}>Copro Manager — Gestion de copropriété simplifiée</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
    fontFamily: "'Outfit', sans-serif",
    overflow: 'hidden',
    position: 'relative',
    padding: '1rem',
  },
  content: {
    position: 'relative',
    zIndex: 10,
    textAlign: 'center',
    maxWidth: '560px',
    width: '100%',
  },
  scene: {
    margin: '0 auto 1.5rem',
    width: '240px',
    height: '180px',
    position: 'relative',
  },
  craneBase: {
    position: 'absolute',
    bottom: '4px',
    left: '25px',
  },
  cranePole: {
    width: '6px',
    height: '150px',
    background: '#f59e0b',
    borderRadius: '2px',
  },
  craneArm: {
    position: 'absolute',
    top: '0',
    left: '6px',
    width: '80px',
    height: '6px',
    background: '#f59e0b',
    borderRadius: '2px',
    transformOrigin: '0 50%',
    animation: 'craneSwing 4s ease-in-out infinite',
  },
  craneRope: {
    position: 'absolute',
    right: '10px',
    top: '6px',
    width: '2px',
    height: '30px',
    background: '#94a3b8',
  },
  craneHook: {
    position: 'absolute',
    right: '2px',
    top: '36px',
    fontSize: '16px',
  },
  building: {
    position: 'absolute',
    bottom: '4px',
    right: '30px',
    width: '120px',
    height: '120px',
  },
  buildingBody: {
    width: '120px',
    height: '120px',
    background: 'linear-gradient(180deg, #475569 0%, #334155 100%)',
    borderRadius: '6px 6px 0 0',
    position: 'relative',
    overflow: 'hidden',
  },
  crack: {
    position: 'absolute',
    top: '10px',
    right: '20px',
    width: '3px',
    height: '60px',
    background: '#ef4444',
    transform: 'rotate(10deg)',
    boxShadow: '0 0 8px rgba(239, 68, 68, 0.4)',
    borderRadius: '2px',
  },
  windowGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
    padding: '15px 12px',
  },
  window: {
    width: '26px',
    height: '28px',
    borderRadius: '3px',
    background: 'linear-gradient(180deg, #fef08a 0%, #fbbf24 100%)',
    boxShadow: '0 0 8px rgba(251, 191, 36, 0.5)',
    animation: 'blink 4s ease-in-out infinite',
  },
  windowBroken: {
    background: '#0f172a',
    boxShadow: 'inset 0 0 5px rgba(239, 68, 68, 0.5), 0 0 4px rgba(239, 68, 68, 0.3)',
    animation: 'none',
  },
  windowDark: {
    background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
    boxShadow: 'inset 0 0 5px rgba(0,0,0,0.5)',
    animation: 'none',
  },
  rubble1: {
    position: 'absolute',
    bottom: '-2px',
    right: '-10px',
    width: '18px',
    height: '12px',
    background: '#475569',
    borderRadius: '2px',
    transform: 'rotate(15deg)',
  },
  rubble2: {
    position: 'absolute',
    bottom: '-2px',
    right: '5px',
    width: '12px',
    height: '8px',
    background: '#64748b',
    borderRadius: '2px',
    transform: 'rotate(-10deg)',
  },
  rubble3: {
    position: 'absolute',
    bottom: '0',
    right: '-5px',
    width: '8px',
    height: '8px',
    background: '#334155',
    borderRadius: '50%',
  },
  smoke1: {
    position: 'absolute',
    bottom: '80px',
    right: '55px',
    width: '20px',
    height: '20px',
    background: 'rgba(148, 163, 184, 0.3)',
    borderRadius: '50%',
    animation: 'smokePuff 3s ease-out infinite',
  },
  smoke2: {
    position: 'absolute',
    bottom: '90px',
    right: '70px',
    width: '14px',
    height: '14px',
    background: 'rgba(148, 163, 184, 0.2)',
    borderRadius: '50%',
    animation: 'smokePuff 3s ease-out 1.5s infinite',
  },
  ground: {
    position: 'absolute',
    bottom: '0',
    left: '0',
    right: '0',
    height: '4px',
    background: '#334155',
    borderRadius: '2px',
  },
  iconContainer: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '2px solid rgba(239, 68, 68, 0.2)',
    margin: '0 auto 1rem',
    animation: 'pulse 2s ease-in-out infinite',
  },
  errorCode: {
    fontSize: '2.5rem',
    fontWeight: '900',
    color: '#ef4444',
    marginBottom: '0.25rem',
    fontFamily: "'Outfit', sans-serif",
  },
  title: {
    fontSize: '1.35rem',
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: '0.75rem',
    fontFamily: "'Outfit', sans-serif",
  },
  message: {
    fontSize: '1rem',
    fontWeight: '300',
    color: '#94a3b8',
    marginBottom: '0.5rem',
    lineHeight: '1.6',
    fontFamily: "'Outfit', sans-serif",
  },
  submessage: {
    fontSize: '0.85rem',
    color: '#64748b',
    marginBottom: '1.5rem',
    fontStyle: 'italic',
    fontFamily: "'Outfit', sans-serif",
  },
  errorDetail: {
    marginBottom: '1.5rem',
    padding: '0.75rem',
    background: 'rgba(239, 68, 68, 0.08)',
    border: '1px solid rgba(239, 68, 68, 0.15)',
    borderRadius: '8px',
    textAlign: 'left',
  },
  errorCode2: {
    fontSize: '0.7rem',
    color: '#f87171',
    fontFamily: 'monospace',
    wordBreak: 'break-all',
    lineHeight: '1.4',
  },
  buttons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    alignItems: 'center',
  },
  btnPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '0.875rem 2rem',
    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
    color: '#fff',
    fontFamily: "'Outfit', sans-serif",
    fontWeight: '600',
    fontSize: '0.95rem',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)',
    width: '100%',
    maxWidth: '300px',
  },
  btnRow: {
    display: 'flex',
    gap: '0.75rem',
    width: '100%',
    maxWidth: '300px',
  },
  btnSecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    flex: '1',
    padding: '0.75rem 1rem',
    background: 'rgba(255, 255, 255, 0.05)',
    color: '#cbd5e1',
    fontFamily: "'Outfit', sans-serif",
    fontWeight: '400',
    fontSize: '0.85rem',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  footer: {
    marginTop: '2rem',
    fontSize: '0.75rem',
    color: '#475569',
    fontFamily: "'Outfit', sans-serif",
  },
};

export default ErrorBoundary;
