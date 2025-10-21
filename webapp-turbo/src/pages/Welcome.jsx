import { useNavigate } from 'react-router-dom';
import broTokenImage from '../assets/images/bro-token.jpg';

export function Welcome() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 px-4">
      <div className="text-center">
        {/* BRO Token Image */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <img 
              src={broTokenImage} 
              alt="BRO Token" 
              className="w-32 h-32 rounded-full object-cover border-4 border-orange-500 shadow-2xl"
            />
            <div className="absolute -bottom-2 -right-2 bg-orange-500 rounded-full p-2 shadow-lg">
              <span className="text-2xl">⚡</span>
            </div>
          </div>
        </div>
        
        <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-6">
          Welcome to BRO <span className="text-orange-400">Turbo</span> Minting
        </h1>
        <p className="text-slate-300 mb-8 max-w-2xl mx-auto text-lg">
          <strong className="text-orange-400">Mine once, mint multiple tokens.</strong><br/>
          Get the most out of your best hash by minting several BRO tokens from a single mining transaction.
        </p>

        <button
          onClick={() => navigate('/wallet-setup')}
          className="px-10 py-4 text-lg font-bold bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-2xl shadow-lg"
        >
          ⚡ Start Turbo Minting
        </button>
      </div>
    </div>
  );
}
