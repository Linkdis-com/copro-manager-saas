import { useNavigate } from 'react-router-dom';
import { LogIn, ArrowLeft, Home } from 'lucide-react';

function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="notfound-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800;900&display=swap');

        .notfound-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
          font-family: 'Outfit', sans-serif;
          overflow: hidden;
          position: relative;
          padding: 1rem;
        }

        /* Stars background */
        .notfound-page::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: 
            radial-gradient(2px 2px at 20px 30px, rgba(255,255,255,0.3), transparent),
            radial-gradient(2px 2px at 40px 70px, rgba(255,255,255,0.2), transparent),
            radial-gradient(1px 1px at 90px 40px, rgba(255,255,255,0.4), transparent),
            radial-gradient(1px 1px at 130px 80px, rgba(255,255,255,0.2), transparent),
            radial-gradient(2px 2px at 160px 30px, rgba(255,255,255,0.3), transparent),
            radial-gradient(1px 1px at 200px 60px, rgba(255,255,255,0.15), transparent),
            radial-gradient(2px 2px at 250px 20px, rgba(255,255,255,0.25), transparent),
            radial-gradient(1px 1px at 300px 50px, rgba(255,255,255,0.3), transparent),
            radial-gradient(1px 1px at 350px 80px, rgba(255,255,255,0.2), transparent),
            radial-gradient(2px 2px at 400px 30px, rgba(255,255,255,0.15), transparent);
          background-size: 420px 100px;
          animation: twinkle 4s ease-in-out infinite alternate;
        }

        @keyframes twinkle {
          0% { opacity: 0.5; }
          100% { opacity: 1; }
        }

        /* Moon */
        .moon {
          position: absolute;
          top: 8%;
          right: 15%;
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          box-shadow: 0 0 40px rgba(253, 230, 138, 0.4), 0 0 80px rgba(253, 230, 138, 0.15);
          animation: moonFloat 6s ease-in-out infinite;
        }
        .moon::after {
          content: '';
          position: absolute;
          top: 15px;
          left: 20px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: rgba(245, 208, 100, 0.3);
        }

        @keyframes moonFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .notfound-content {
          position: relative;
          z-index: 10;
          text-align: center;
          max-width: 560px;
          width: 100%;
        }

        /* Building SVG scene */
        .building-scene {
          margin: 0 auto 2rem;
          width: 280px;
          height: 220px;
          position: relative;
        }

        /* The building */
        .building {
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 140px;
          height: 180px;
        }
        .building-body {
          position: absolute;
          bottom: 0;
          width: 140px;
          height: 160px;
          background: linear-gradient(180deg, #475569 0%, #334155 100%);
          border-radius: 8px 8px 0 0;
          box-shadow: 0 0 30px rgba(0,0,0,0.3);
        }
        .building-roof {
          position: absolute;
          bottom: 160px;
          left: -10px;
          width: 160px;
          height: 20px;
          background: #64748b;
          border-radius: 4px;
        }

        /* Windows grid */
        .windows {
          position: absolute;
          top: 20px;
          left: 15px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          width: 110px;
        }
        .window {
          width: 28px;
          height: 32px;
          border-radius: 3px;
          background: linear-gradient(180deg, #fef08a 0%, #fbbf24 100%);
          box-shadow: 0 0 8px rgba(251, 191, 36, 0.5), 0 0 20px rgba(251, 191, 36, 0.15);
          animation: windowFlicker 3s ease-in-out infinite;
        }
        .window:nth-child(2) { animation-delay: 0.5s; }
        .window:nth-child(3) { animation-delay: 1s; }
        .window:nth-child(4) { animation-delay: 1.5s; }
        .window:nth-child(5) { animation-delay: 0.3s; }
        .window:nth-child(6) { animation-delay: 0.8s; }
        .window:nth-child(7) { animation-delay: 1.2s; }
        .window:nth-child(8) { animation-delay: 0.7s; }
        .window:nth-child(9) { animation-delay: 1.4s; }

        .window.dark {
          background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
          box-shadow: inset 0 0 5px rgba(0,0,0,0.5);
          animation: none;
        }

        .window.broken {
          background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
          box-shadow: inset 0 0 5px rgba(0,0,0,0.5);
          animation: none;
          position: relative;
          overflow: hidden;
        }
        .window.broken::before,
        .window.broken::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 120%;
          height: 2px;
          background: #ef4444;
          box-shadow: 0 0 6px rgba(239, 68, 68, 0.6);
        }
        .window.broken::before { transform: translate(-50%, -50%) rotate(45deg); }
        .window.broken::after { transform: translate(-50%, -50%) rotate(-45deg); }

        @keyframes windowFlicker {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        /* Door */
        .door {
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 32px;
          height: 45px;
          background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
          border-radius: 4px 4px 0 0;
          border: 2px solid #475569;
        }
        .door::after {
          content: '';
          position: absolute;
          right: 5px;
          top: 50%;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #fbbf24;
          box-shadow: 0 0 4px rgba(251, 191, 36, 0.6);
        }

        /* Trees */
        .tree { position: absolute; bottom: 0; }
        .tree-left { left: 15px; }
        .tree-right { right: 15px; }
        .tree-trunk {
          width: 6px; height: 20px;
          background: #78350f;
          margin: 0 auto;
          border-radius: 2px;
        }
        .tree-leaves {
          width: 30px; height: 30px;
          background: #166534;
          border-radius: 50%;
          margin: 0 auto -5px;
          animation: treeSway 4s ease-in-out infinite;
        }
        .tree-right .tree-leaves { animation-delay: 1s; }

        @keyframes treeSway {
          0%, 100% { transform: rotate(-2deg); }
          50% { transform: rotate(2deg); }
        }

        .ground {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 4px;
          background: #334155;
          border-radius: 2px;
        }

        .floating-question {
          position: absolute;
          top: 10px;
          right: 30px;
          font-size: 40px;
          font-weight: 900;
          color: #f59e0b;
          text-shadow: 0 0 20px rgba(245, 158, 11, 0.4);
          animation: questionBounce 2s ease-in-out infinite;
        }
        @keyframes questionBounce {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-15px) rotate(5deg); }
          75% { transform: translateY(-5px) rotate(-3deg); }
        }

        /* 404 number */
        .error-code {
          font-size: 7rem;
          font-weight: 900;
          letter-spacing: -4px;
          line-height: 1;
          margin-bottom: 0.5rem;
          background: linear-gradient(135deg, #f59e0b 0%, #ef4444 50%, #f59e0b 100%);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: gradientMove 3s ease-in-out infinite;
        }
        @keyframes gradientMove {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        .error-title {
          font-size: 1.5rem;
          font-weight: 600;
          color: #f1f5f9;
          margin-bottom: 0.75rem;
        }
        .error-message {
          font-size: 1rem;
          font-weight: 300;
          color: #94a3b8;
          margin-bottom: 0.5rem;
          line-height: 1.6;
        }
        .error-submessage {
          font-size: 0.85rem;
          color: #64748b;
          margin-bottom: 2.5rem;
          font-style: italic;
        }

        /* Buttons */
        .buttons-container {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          align-items: center;
        }
        .btn-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.875rem 2rem;
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: #0f172a;
          font-family: 'Outfit', sans-serif;
          font-weight: 600;
          font-size: 0.95rem;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);
          width: 100%;
          max-width: 300px;
        }
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(245, 158, 11, 0.4);
        }
        .btn-row {
          display: flex;
          gap: 0.75rem;
          width: 100%;
          max-width: 300px;
        }
        .btn-secondary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          flex: 1;
          padding: 0.75rem 1rem;
          background: rgba(255, 255, 255, 0.05);
          color: #cbd5e1;
          font-family: 'Outfit', sans-serif;
          font-weight: 400;
          font-size: 0.85rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
        }
        .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
          transform: translateY(-1px);
        }
        .footer-text {
          margin-top: 2rem;
          font-size: 0.75rem;
          color: #475569;
        }

        /* Clouds */
        .cloud {
          position: absolute;
          background: rgba(255,255,255,0.03);
          border-radius: 50px;
          animation: cloudDrift 20s linear infinite;
        }
        .cloud-1 { width: 120px; height: 30px; top: 20%; left: -120px; animation-duration: 25s; }
        .cloud-2 { width: 80px; height: 20px; top: 35%; left: -80px; animation-duration: 30s; animation-delay: 10s; }
        @keyframes cloudDrift {
          0% { transform: translateX(0); }
          100% { transform: translateX(calc(100vw + 200px)); }
        }

        @media (max-width: 480px) {
          .error-code { font-size: 5rem; }
          .error-title { font-size: 1.2rem; }
          .building-scene { width: 220px; height: 180px; }
          .building { width: 110px; height: 150px; }
          .building-body { width: 110px; height: 130px; }
          .building-roof { bottom: 130px; left: -8px; width: 126px; }
          .windows { top: 15px; left: 10px; gap: 8px; width: 90px; }
          .window { width: 24px; height: 26px; }
          .moon { width: 50px; height: 50px; top: 5%; right: 10%; }
        }
      `}</style>

      <div className="moon" />
      <div className="cloud cloud-1" />
      <div className="cloud cloud-2" />

      <div className="notfound-content">
        <div className="building-scene">
          <div className="tree tree-left">
            <div className="tree-leaves" />
            <div className="tree-trunk" />
          </div>
          <div className="building">
            <div className="building-roof" />
            <div className="building-body">
              <div className="windows">
                <div className="window" />
                <div className="window dark" />
                <div className="window" />
                <div className="window" />
                <div className="window broken" />
                <div className="window" />
                <div className="window dark" />
                <div className="window" />
                <div className="window dark" />
              </div>
              <div className="door" />
            </div>
          </div>
          <div className="tree tree-right">
            <div className="tree-leaves" />
            <div className="tree-trunk" />
          </div>
          <div className="floating-question">?</div>
          <div className="ground" />
        </div>

        <div className="error-code">404</div>
        <h1 className="error-title">Cet appartement n'existe pas !</h1>
        <p className="error-message">
          On a cherché partout dans l'immeuble, du sous-sol au grenier...
          mais cette page reste introuvable.
        </p>
        <p className="error-submessage">
          Même le concierge ne sait pas où elle est passée 🤷
        </p>

        <div className="buttons-container">
          <button className="btn-primary" onClick={() => navigate('/login')}>
            <LogIn size={18} />
            Retour à la connexion
          </button>
          <div className="btn-row">
            <button className="btn-secondary" onClick={() => navigate(-1)}>
              <ArrowLeft size={16} />
              Retour
            </button>
            <button className="btn-secondary" onClick={() => navigate('/dashboard')}>
              <Home size={16} />
              Accueil
            </button>
          </div>
        </div>

        <p className="footer-text">Copro Manager — Gestion de copropriété simplifiée</p>
      </div>
    </div>
  );
}

export default NotFound;
