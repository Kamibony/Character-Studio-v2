
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebase';
import { useAuth } from '../App';
import { LogOut, User as UserIcon, PlusCircle, Library } from 'lucide-react';

const Header: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <header className="bg-gray-800/50 backdrop-blur-sm sticky top-0 z-50">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
        <Link to="/" className="text-2xl font-bold text-purple-400 hover:text-purple-300 transition-colors">
          Character Studio
        </Link>
        
        {user && (
          <div className="flex items-center space-x-4">
             <Link to="/create" className="flex items-center text-gray-300 hover:text-white transition-colors">
              <PlusCircle className="w-5 h-5 mr-2" />
              <span className="hidden sm:inline">Create</span>
            </Link>
             <Link to="/" className="flex items-center text-gray-300 hover:text-white transition-colors">
              <Library className="w-5 h-5 mr-2" />
              <span className="hidden sm:inline">Library</span>
            </Link>
            <div className="flex items-center">
              {user.photoURL ? (
                <img src={user.photoURL} alt="User" className="w-8 h-8 rounded-full" />
              ) : (
                <UserIcon className="w-8 h-8 rounded-full bg-gray-600 p-1" />
              )}
              <button
                onClick={handleSignOut}
                className="ml-4 p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                aria-label="Sign Out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};

export default Header;
