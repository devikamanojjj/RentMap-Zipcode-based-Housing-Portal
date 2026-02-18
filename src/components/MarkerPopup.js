import React, { useState } from 'react';
import './MarkerPopup.css';

const MarkerPopup = ({ data, favZipcodes, onToggleFavorite }) => {
  const [activeTab, setActiveTab] = useState('sales');
  const normalizedZipcode = String(data.zipcode);
  const isFavorited = favZipcodes.includes(normalizedZipcode);
  const handleFavoriteClick = async (e) => {
    e.stopPropagation();
    try {
      await onToggleFavorite(normalizedZipcode);
    } catch (err) {
      // noop; keep popup interactive even if backend is unavailable
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  const getSalesStats = () => {
    if (data.sales.length === 0) return null;
    const prices = data.sales.map(s => s.price);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    
    // Get bedroom breakdown with stats
    const bedroomStats = {};
    data.sales.forEach(s => {
      const bedrooms = s.bedrooms || 'Unknown';
      if (!bedroomStats[bedrooms]) {
        bedroomStats[bedrooms] = { prices: [], count: 0 };
      }
      bedroomStats[bedrooms].prices.push(s.price);
      bedroomStats[bedrooms].count += 1;
    });

    // Calculate stats for each bedroom type
    const bedroomBreakdown = {};
    Object.entries(bedroomStats).forEach(([bedrooms, data]) => {
      const bhkPrices = data.prices;
      bedroomBreakdown[bedrooms] = {
        count: data.count,
        avgPrice: bhkPrices.reduce((a, b) => a + b, 0) / bhkPrices.length,
        minPrice: Math.min(...bhkPrices),
        maxPrice: Math.max(...bhkPrices)
      };
    });
    
    return { avgPrice, minPrice, maxPrice, count: prices.length, bedroomBreakdown };
  };

  const getRentStats = () => {
    if (data.rent.length === 0) return null;
    const prices = data.rent.map(r => r.avg_price).filter(p => p);
    if (prices.length === 0) return null;
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    
    // Get bedroom breakdown with stats
    const bedroomStats = {};
    data.rent.forEach(r => {
      const bedrooms = r.bedrooms || 'Unknown';
      const price = r.avg_price;
      if (price) {
        if (!bedroomStats[bedrooms]) {
          bedroomStats[bedrooms] = { prices: [], count: 0 };
        }
        bedroomStats[bedrooms].prices.push(price);
        bedroomStats[bedrooms].count += 1;
      }
    });

    // Calculate stats for each bedroom type
    const bedroomBreakdown = {};
    Object.entries(bedroomStats).forEach(([bedrooms, data]) => {
      const bhkPrices = data.prices;
      if (bhkPrices.length > 0) {
        bedroomBreakdown[bedrooms] = {
          count: data.count,
          avgPrice: bhkPrices.reduce((a, b) => a + b, 0) / bhkPrices.length,
          minPrice: Math.min(...bhkPrices),
          maxPrice: Math.max(...bhkPrices)
        };
      }
    });
    
    return { avgPrice, minPrice, maxPrice, count: prices.length, bedroomBreakdown };
  };

  const salesStats = getSalesStats();
  const rentStats = getRentStats();

  return (
    <div className="popup">
      <div className="popup-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ display: 'inline-block', marginRight: 8 }}>Zipcode: {data.zipcode}</h3>
          <p className="location" style={{ margin: 0 }}>Lat: {data.latitude.toFixed(4)}, Long: {data.longitude.toFixed(4)}</p>
        </div>
        <span
          className="popup-heart"
          title={isFavorited ? 'Unfavorite' : 'Favorite'}
          style={{ cursor: 'pointer', fontSize: '24px', color: isFavorited ? '#e25555' : '#bbb', marginLeft: '8px', transition: 'color 0.2s' }}
          onClick={handleFavoriteClick}
        >
          {isFavorited ? '❤️' : '🤍'}
        </span>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'sales' ? 'active' : ''}`}
          onClick={() => setActiveTab('sales')}
        >
          Sales ({salesStats?.count || 0})
        </button>
        <button
          className={`tab ${activeTab === 'rent' ? 'active' : ''}`}
          onClick={() => setActiveTab('rent')}
        >
          Rent ({rentStats?.count || 0})
        </button>
      </div>

      <div className="popup-content">
        {activeTab === 'sales' && (
          <div className="tab-content">
            {salesStats ? (
              <div className="stats">
                <div className="fun-header">🏠 Sales Overview</div>
                
                <div className="bedroom-breakdown">
                  <div className="breakdown-title">🛏️ Price Stats by BHK:</div>
                  <div className="bedroom-grid">
                    {Object.entries(salesStats.bedroomBreakdown)
                      .sort((a, b) => {
                        if (a[0] === 'Unknown') return 1;
                        if (b[0] === 'Unknown') return -1;
                        return Number(a[0]) - Number(b[0]);
                      })
                      .map(([bedrooms, stats]) => (
                        <div key={bedrooms} className="bhk-stats-chip">
                          <div className="bhk-header">{bedrooms} BHK (×{stats.count})</div>
                          <div className="bhk-stat-row">
                            <span className="bhk-label">Avg:</span>
                            <span className="bhk-value">{formatCurrency(stats.avgPrice)}</span>
                          </div>
                          <div className="bhk-stat-row">
                            <span className="bhk-label">Min:</span>
                            <span className="bhk-value">{formatCurrency(stats.minPrice)}</span>
                          </div>
                          <div className="bhk-stat-row">
                            <span className="bhk-label">Max:</span>
                            <span className="bhk-value">{formatCurrency(stats.maxPrice)}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="stat-item highlight">

                  <label>📊 Total Records:</label>
                  <span className="stat-value">{salesStats.count}</span>
                </div>
              </div>
            ) : (
              <p className="no-data">😔 No sales data available</p>
            )}
          </div>
        )}

        {activeTab === 'rent' && (
          <div className="tab-content">
            {rentStats ? (
              <div className="stats">
                <div className="fun-header">🏘️ Rental Overview</div>
                
                <div className="bedroom-breakdown">
                  <div className="breakdown-title">🛏️ Rent Stats by BHK:</div>
                  <div className="bedroom-grid">
                    {Object.entries(rentStats.bedroomBreakdown)
                      .sort((a, b) => {
                        if (a[0] === 'Unknown') return 1;
                        if (b[0] === 'Unknown') return -1;
                        return Number(a[0]) - Number(b[0]);
                      })
                      .map(([bedrooms, stats]) => (
                        <div key={bedrooms} className="bhk-stats-chip">
                          <div className="bhk-header">{bedrooms} BHK (×{stats.count})</div>
                          <div className="bhk-stat-row">
                            <span className="bhk-label">Avg:</span>
                            <span className="bhk-value">{formatCurrency(stats.avgPrice)}</span>
                          </div>
                          <div className="bhk-stat-row">
                            <span className="bhk-label">Min:</span>
                            <span className="bhk-value">{formatCurrency(stats.minPrice)}</span>
                          </div>
                          <div className="bhk-stat-row">
                            <span className="bhk-label">Max:</span>
                            <span className="bhk-value">{formatCurrency(stats.maxPrice)}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>


                <div className="stat-item">
                  <label>📊 Total Records:</label>
                  <span className="stat-value">{rentStats.count}</span>
                </div>
              </div>
            ) : (
              <p className="no-data">😔 No rental data available</p>
            )}
          </div>
        )}
      </div>

      <div className="popup-footer">
        <small>Click marker to close</small>
      </div>
    </div>
  );
};

export default MarkerPopup;
