import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogOut, Briefcase, Users, Settings, User } from 'lucide-react';

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/jobs');
  };

  const getNavItems = () => {
    const items = [{ path: '/jobs', label: 'Jobs', icon: Briefcase }];

    if (!user) return items;

    switch (user.role) {
      case 'admin':
        items.push({ path: '/admin', label: 'Admin', icon: Settings });
        break;
      case 'hr':
        items.push({ path: '/hr', label: 'HR', icon: Users });
        break;
      case 'applicant':
        items.push({ path: '/account', label: 'Mein Bereich', icon: User });
        break;
    }

    return items;
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link to="/jobs" className="text-xl font-bold text-white hover:text-gray-300">
                🍫 Chocadies
              </Link>
              <div className="ml-10 flex items-baseline space-x-4">
                {getNavItems().map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${
                        location.pathname === item.path
                          ? 'bg-gray-900 text-white'
                          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      }`}
                    >
                      <Icon size={16} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-4">
              {user ? (
                <>
                  <span className="text-sm text-gray-300">
                    {user.email} ({user.role})
                  </span>
                  <button
                    onClick={handleLogout}
                    className="text-gray-300 hover:text-white flex items-center gap-2"
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    to="/login"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Anmelden
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
