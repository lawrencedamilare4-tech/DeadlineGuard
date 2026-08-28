import React from 'react';
import { Sun, Cloud, CloudRain } from 'lucide-react';

const mockForecast = [
  { day: 'Today', state: 'STORM', runway: 4 },
  { day: '+1', state: 'RAIN', runway: 5 },
  { day: '+2', state: 'RAIN', runway: 6 },
  { day: '+3', state: 'WATCH', runway: 8 },
  { day: '+4', state: 'WATCH', runway: 9 },
  { day: '+5', state: 'CLEAR', runway: 12 },
  { day: '+6', state: 'CLEAR', runway: 14 },
];

const stateIcons = {
  CLEAR: Sun,
  WATCH: Cloud,
  RAIN: CloudRain,
  STORM: CloudRain,
};

const ForecastPanel = () => {
  return (
    <div className="p-6 bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">7-Day Forecast</h3>
      <div className="grid grid-cols-7 gap-2 text-center">
        {mockForecast.map((day) => {
          const Icon = stateIcons[day.state];
          return (
            <div key={day.day} className="flex flex-col items-center">
              <span className="text-xs text-gray-500">{day.day}</span>
              <Icon className="h-6 w-6 my-1 text-shamrock" />
              <span className="text-xs font-medium">{day.runway} ep</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ForecastPanel;