// Forecast Engine - predicts storage runway
export class ForecastEngine {
  calculateRunway(currentUsage, growthRate, totalCapacity) {
    // Calculate days until storage is full
    const availableSpace = totalCapacity - currentUsage;
    const dailyGrowth = (currentUsage * growthRate) / 30;
    
    if (dailyGrowth <= 0) {
      return Infinity;
    }

    return Math.floor(availableSpace / dailyGrowth);
  }

  generateForecast(files, period = 30) {
    const forecast = [];
    const now = new Date();

    for (let i = 0; i < period; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() + i);
      
      const expiringCount = files.filter(f => {
        const expiry = new Date(f.expiryDate);
        return expiry.toDateString() === date.toDateString();
      }).length;

      forecast.push({
        date: date.toISOString().split('T')[0],
        expiringCount,
        totalActive: files.filter(f => new Date(f.expiryDate) >= date).length
      });
    }

    return forecast;
  }

  predictRenewalCost(files, forecastDays) {
    let totalCost = 0;
    files.forEach(file => {
      const renewals = Math.ceil(forecastDays / 30);
      totalCost += file.monthlyRate * renewals;
    });
    return totalCost;
  }
}

export default ForecastEngine;
