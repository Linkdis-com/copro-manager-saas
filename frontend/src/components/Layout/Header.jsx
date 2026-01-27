import { Menu } from 'lucide-react';

function Header({ onMenuClick }) {
  return (
    <header className="sticky top-0 z-10 bg-white shadow-sm">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between items-center">
          {/* Bouton menu mobile */}
          <button
            onClick={onMenuClick}
            className="lg:hidden text-gray-600 hover:text-gray-900"
          >
            <Menu className="h-6 w-6" />
          </button>

          {/* Titre mobile */}
          <h1 className="lg:hidden text-xl font-bold text-gray-900">
            🏢 Copro Manager
          </h1>

          {/* Espace vide pour centrer sur mobile */}
          <div className="lg:hidden w-6" />

          {/* Desktop: juste un espace */}
          <div className="hidden lg:block flex-1" />
        </div>
      </div>
    </header>
  );
}

export default Header;