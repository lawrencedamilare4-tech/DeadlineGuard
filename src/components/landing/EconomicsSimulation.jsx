import { Card } from '../common/Card';
import { Slider } from '../ui/Slider';
import { useState } from 'react';

export function EconomicsSimulation() {
  const [dataSize, setDataSize] = useState(100);
  const [duration, setDuration] = useState(12);

  const monthlyCost = (dataSize / 100) * 5;
  const totalCost = monthlyCost * duration;

  return (
    <section className="py-16">
      <div className="max-w-2xl mx-auto px-4">
        <h2 className="text-3xl font-bold mb-8 text-center">Cost Simulator</h2>
        <Card>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Data Size (GB): {dataSize}
              </label>
              <Slider
                value={dataSize}
                onChange={setDataSize}
                min={1}
                max={1000}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Duration (months): {duration}
              </label>
              <Slider
                value={duration}
                onChange={setDuration}
                min={1}
                max={36}
              />
            </div>
            <div className="bg-blue-50 p-4 rounded-lg mt-6">
              <div className="flex justify-between mb-2">
                <span className="text-gray-700">Monthly Cost</span>
                <span className="font-bold">${monthlyCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Total Cost</span>
                <span className="font-bold text-lg">${totalCost.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}
