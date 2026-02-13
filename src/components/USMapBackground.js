import React, { useState } from 'react';
import Map from 'react-map-gl';

const USMapBackground = () => {
  const token = process.env.REACT_APP_MAPBOX_TOKEN;
  const [mapError, setMapError] = useState(!token ? 'Mapbox token is missing. Add REACT_APP_MAPBOX_TOKEN in .env and restart.' : '');
  return (
    <div className="us-map-bg">
      {mapError && (
        <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10, background: '#fff3cd', color: '#7a5c00', border: '1px solid #ffeeba', padding: '8px 12px', borderRadius: 6, fontSize: 12 }}>
          {mapError}
        </div>
      )}
      <Map
        initialViewState={{
          longitude: -98.5795,
          latitude: 39.8283,
          zoom: 2.8
        }}
        style={{ width: '100vw', height: '100vh' }}
        mapStyle="mapbox://styles/mapbox/light-v11"
        mapboxAccessToken={token}
        attributionControl={false}
        interactive={false}
        onError={(e) => setMapError(e?.error?.message || 'Map failed to load.')}
        onLoad={() => setMapError('')}
      />
    </div>
  );
};

export default USMapBackground;
