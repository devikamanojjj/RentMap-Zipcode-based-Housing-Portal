import React from 'react';
import Map, { Source, Layer } from 'react-map-gl';

const USMapBackground = () => {
  return (
    <div className="us-map-bg">
      <Map
        initialViewState={{
          longitude: -98.5795,
          latitude: 39.8283,
          zoom: 2.8
        }}
        style={{ width: '100vw', height: '100vh' }}
        mapStyle="mapbox://styles/mapbox/light-v11"
        mapboxAccessToken={process.env.REACT_APP_MAPBOX_TOKEN}
        attributionControl={false}
        interactive={false}
      />
    </div>
  );
};

export default USMapBackground;
