import React from 'react';
import ForecastPanel from '../components/dashboard/ForecastPanel';
import { Cloud } from 'lucide-react';

const ForecastPage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <Cloud className="h-6 w-6 text-shamrock" /> Forecast
      </h1>
      <ForecastPanel />
    </div>
  );
};

export default ForecastPage;