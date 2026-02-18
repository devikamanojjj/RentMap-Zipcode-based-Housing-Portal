import React from 'react';

const MapControls = ({ onZoomIn, onZoomOut, onReset }) => {
  return (
    <div className="map-controller">
      <button className="controller-btn" title="Zoom In" onClick={onZoomIn}>+</button>
      <button className="controller-btn" title="Zoom Out" onClick={onZoomOut}>-</button>
      <button className="controller-btn" title="Reset" onClick={onReset}>&#8634;</button>
    </div>
  );
};

export default MapControls;
