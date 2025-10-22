import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function LocalStorageDebugPage() {
  const navigate = useNavigate();
  const [localStorageData, setLocalStorageData] = useState({});
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  // Load localStorage data
  useEffect(() => {
    loadLocalStorageData();
  }, [lastUpdate]);

  const loadLocalStorageData = () => {
    const data = {};
    const allKeys = Object.keys(localStorage);
    
    allKeys.forEach(key => {
      try {
        const value = localStorage.getItem(key);
        try {
          data[key] = JSON.parse(value);
        } catch {
          data[key] = value;
        }
      } catch (error) {
        data[key] = `Error: ${error.message}`;
      }
    });
    
    setLocalStorageData(data);
  };

  const handleRefresh = () => {
    setLastUpdate(Date.now());
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors mb-4"
          >
            <span>←</span>
            <span>Back</span>
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-slate-200 mb-2">
                � localStorage Debug
              </h1>
              <p className="text-slate-400">
                View and manage browser localStorage data
              </p>
            </div>
            
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={handleRefresh}
                className="inline-flex items-center justify-center gap-2 rounded-xl font-semibold px-6 py-3 transition-all duration-200 shadow-sm border-2 border-slate-500 text-slate-200 hover:border-slate-400 hover:bg-slate-700/40"
              >
                <span>🔄</span>
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-800/50 border border-slate-600 rounded-xl p-4">
            <div className="text-slate-400 text-sm mb-1">Total Keys</div>
            <div className="text-3xl font-bold text-slate-200">
              {Object.keys(localStorageData).length}
            </div>
          </div>
          
          <div className="bg-slate-800/50 border border-slate-600 rounded-xl p-4">
            <div className="text-slate-400 text-sm mb-1">Last Updated</div>
            <div className="text-lg font-mono text-slate-200">
              {new Date(lastUpdate).toLocaleTimeString()}
            </div>
          </div>
          
          <div className="bg-slate-800/50 border border-slate-600 rounded-xl p-4">
            <div className="text-slate-400 text-sm mb-1">Total Size</div>
            <div className="text-lg font-mono text-slate-200">
              {(JSON.stringify(localStorageData).length / 1024).toFixed(2)} KB
            </div>
          </div>
        </div>

        {/* JSON Display */}
        <div className="bg-slate-800/50 border border-slate-600 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-200">
              localStorage Data (JSON)
            </h2>
          </div>
          
          {Object.keys(localStorageData).length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <div className="text-6xl mb-4"></div>
              <div className="text-xl">localStorage is empty</div>
            </div>
          ) : (
            <pre className="bg-slate-900/50 border border-slate-700 rounded-lg p-6 overflow-x-auto text-xs font-mono text-slate-300 max-h-[600px] overflow-y-auto">
              {JSON.stringify(localStorageData, null, 2)}
            </pre>
          )}
        </div>

      </div>
    </div>
  );
}
