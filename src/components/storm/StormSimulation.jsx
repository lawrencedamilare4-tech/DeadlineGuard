import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloudLightning, Sun, Activity, Lock, Archive, CheckCircle, Loader2 } from 'lucide-react';
import { generateGroqReport } from '../../services/ai/groqService';

const StormSimulation = () => {
  const [phase, setPhase] = useState('idle'); // idle, storm, recovery, done
  const [runway, setRunway] = useState(14);
  const [balance, setBalance] = useState(4.82);
  const [weather, setWeather] = useState('CLEAR');
  const [actions, setActions] = useState([]);
  const [report, setReport] = useState('');
  const [loading, setLoading] = useState(false);

  const addAction = (type, description) => {
    setActions((prev) => [...prev, { type, description, time: new Date().toLocaleTimeString() }]);
  };

  const simulateStorm = async () => {
    setLoading(true);
    setReport('');
    setActions([]);
    setPhase('storm');

    // Phase 1: Storm approaches – runway decreases rapidly
    for (let i = 0; i < 5; i++) {
      setRunway((prev) => Math.max(0, prev - 2.5));
      setBalance((prev) => Math.max(0, prev - 0.8));
      setWeather(i > 2 ? 'STORM' : 'RAIN');
      await new Promise((res) => setTimeout(res, 600));
    }

    // Phase 2: Agent activates
    addAction('ALERT', 'STORAGE STORM DETECTED');
    addAction('PROTECT', 'Protected Senior_Project_Final.pdf');
    addAction('ARCHIVE', 'Archived Fall2025_Group_Project.zip (850 MB)');
    addAction('VERIFY', 'Verified storage providers (2/2 healthy)');

    // Brief pause to show actions
    await new Promise((res) => setTimeout(res, 1200));

    // Phase 3: Recovery – runway climbs
    setPhase('recovery');
    for (let i = 0; i < 5; i++) {
      setRunway((prev) => Math.min(20, prev + 2.5));
      setBalance((prev) => Math.min(10, prev + 0.8));
      setWeather(i > 2 ? 'CLEAR' : 'WATCH');
      await new Promise((res) => setTimeout(res, 500));
    }

    // Phase 4: Generate Groq report
    const context = {
      initial: { runway: 14, balance: 4.82, weather: 'CLEAR' },
      storm: { runway: 4, balance: 0.82, weather: 'STORM' },
      recovery: { runway: 11, balance: 4.82, weather: 'CLEAR' },
      actions: actions.map((a) => a.description),
    };
    const reportText = await generateGroqReport(context);
    setReport(reportText);
    setPhase('done');
    setLoading(false);
  };

  const WeatherIcon = weather === 'CLEAR' ? Sun : weather === 'STORM' ? CloudLightning : CloudLightning;

  return (
    <div className="card max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Storage Storm Simulation</h2>
        <button
          onClick={simulateStorm}
          disabled={loading}
          className="btn-primary disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="inline h-4 w-4 mr-2 animate-spin" />
              Simulating...
            </>
          ) : (
            'Simulate Storm'
          )}
        </button>
      </div>

      {/* Weather & Runway display */}
      <div className="flex items-center justify-between bg-shamrock-darker/20 p-4 rounded-lg mb-6">
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ rotate: weather === 'CLEAR' ? 0 : 360 }}
            transition={{ duration: 2 }}
          >
            <WeatherIcon className={`h-12 w-12 ${weather === 'CLEAR' ? 'text-shamrock' : 'text-storm-warning'}`} />
          </motion.div>
          <div>
            <p className="text-sm text-gray-300">Weather</p>
            <p className="font-mono text-lg font-bold">{weather}</p>
          </div>
        </div>
        <div>
          <p className="text-sm text-gray-300">Runway</p>
          <p className="font-mono text-lg font-bold">{runway.toFixed(1)} epochs</p>
        </div>
        <div>
          <p className="text-sm text-gray-300">Balance</p>
          <p className="font-mono text-lg font-bold">${balance.toFixed(2)} USDFC</p>
        </div>
      </div>

      {/* Agent Actions */}
      {actions.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-3">
            Agent Activity
          </h3>
          <ul className="space-y-2">
            {actions.map((action, idx) => {
              const Icon = action.type === 'PROTECT' ? Lock : action.type === 'ARCHIVE' ? Archive : CheckCircle;
              return (
                <motion.li
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.15 }}
                  className="flex items-center gap-3 text-sm"
                >
                  <Icon className="h-4 w-4 text-shamrock" />
                  <span className="text-gray-300">{action.time}</span>
                  <span className="font-medium">{action.description}</span>
                </motion.li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Groq Report */}
      {report && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-shamrock-darker/30 rounded-lg p-4"
        >
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-2">
            Agent Report
          </h3>
          <p className="text-gray-200 leading-relaxed">{report}</p>
        </motion.div>
      )}
    </div>
  );
};

export default StormSimulation;