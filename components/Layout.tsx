
import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingBag, FileText, PlusCircle, Users, Hammer, Sun, Moon } from 'lucide-react';
import { useAppContext } from '../store/AppContext';

const Layout: React.FC<{ children: React.ReactNode, hideNav?: boolean }> = ({ children, hideNav = false }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useAppContext();
  const { darkMode, user } = state;

  // Ukrywamy dolną nawigację na ekranie nowej wyceny oraz edycji wyceny
  const isQuoting = location.pathname.startsWith('/quotes/new') || location.pathname.startsWith('/quotes/edit');
  const shouldHideBottomNav = hideNav || isQuoting;

  const navItems = [
    { path: '/', icon: ShoppingBag, label: 'Zakupy' },
    { path: '/quotes', icon: FileText, label: 'Wyceny' },
    { path: '/quotes/new', icon: PlusCircle, label: 'Nowa', center: true },
    { path: '/clients', icon: Users, label: 'Klienci' },
    { path: '/services', icon: Hammer, label: 'Usługi' },
  ];

  return (
    <div className={`flex flex-col min-h-screen max-w-md mx-auto relative overflow-hidden shadow-2xl transition-colors duration-300 ${darkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
      <header className={`px-5 py-3 sticky top-0 z-40 shadow-sm flex justify-between items-center border-b transition-colors ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-100'} backdrop-blur-md`}>
        <div className="flex items-center gap-3">
          {!hideNav && (
            <button 
              onClick={() => navigate('/profile')}
              className={`group relative w-10 h-10 rounded-xl overflow-hidden border-2 transition-all active:scale-90 ${
                location.pathname === '/profile' ? 'border-blue-600 shadow-lg' : (darkMode ? 'border-slate-800' : 'border-slate-200 shadow-sm')
              }`}
            >
              {user?.logo ? (
                <img src={user.logo} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white font-black text-xs">
                  {user?.firstName?.[0] || 'Q'}{user?.lastName?.[0] || ''}
                </div>
              )}
            </button>
          )}
          
          <div className="flex flex-col">
            <h1 className={`text-sm font-black tracking-tight leading-tight ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
              {hideNav ? 'Konfiguracja Profilu' : (navItems.find(i => i.path === location.pathname)?.label || 'QuoteMaster')}
            </h1>
            <p className={`text-[8px] font-black uppercase tracking-widest leading-none ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              {user?.companyName || 'Nowa Firma'}
            </p>
          </div>
        </div>
      </header>

      <main className={`flex-1 overflow-y-auto px-4 pt-4 no-scrollbar ${shouldHideBottomNav ? 'pb-10' : 'pb-28'}`}>
        {children}
      </main>

      {!shouldHideBottomNav && (
        <nav className={`fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md flex justify-around items-center h-20 px-2 z-20 pb-safe shadow-[0_-8px_30px_rgba(0,0,0,0.08)] border-t transition-all ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            if (item.center) {
              return (
                <NavLink key={item.path} to={item.path} className="flex flex-col items-center -mt-10">
                  <div className={`p-4 rounded-[24px] shadow-2xl transition-all border-8 ${darkMode ? 'border-slate-950' : 'border-slate-50'} ${isActive ? 'bg-blue-700 scale-110' : 'bg-blue-600 active:scale-95'}`}>
                    <Icon className="text-white w-7 h-7" />
                  </div>
                  <span className={`text-[9px] mt-1 font-black uppercase tracking-tighter ${isActive ? 'text-blue-600' : (darkMode ? 'text-slate-400' : 'text-slate-500')}`}>
                    {item.label}
                  </span>
                </NavLink>
              );
            }

            return (
              <NavLink key={item.path} to={item.path} className={`flex flex-col items-center flex-1 py-2 active:scale-95 transition-all ${isActive ? 'text-blue-600' : (darkMode ? 'text-slate-400' : 'text-slate-500')}`}>
                <Icon size={22} className={`transition-all ${isActive ? 'scale-110 font-black' : ''}`} />
                <span className="text-[9px] mt-1 font-black uppercase tracking-tighter">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      )}
    </div>
  );
};

export default Layout;
