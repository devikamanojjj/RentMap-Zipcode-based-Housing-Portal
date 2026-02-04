import React, { useState, useRef, useEffect } from 'react';
import Map, { Marker, Popup } from 'react-map-gl';
import './MapContainer.css';
import MarkerPopup from './MarkerPopup';

const MapContainer = ({ data, onLogout, user }) => {
  const [popupInfo, setPopupInfo] = useState(null);
  const [mapStyle, setMapStyle] = useState('mapbox://styles/mapbox/streets-v12');
  const [searchInput, setSearchInput] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [viewState, setViewState] = useState({
    longitude: -149.8,
    latitude: 61.1,
    zoom: 8
  });
  const [roiMap, setRoiMap] = useState({});
  const [roiMin, setRoiMin] = useState(0);
  const [roiMax, setRoiMax] = useState(0);
  const mapRef = useRef();
  // Fetch ROI data from backend and merge with map data
  useEffect(() => {
    async function fetchROI() {
      try {
        // Prepare data for backend (flatten sales/rent to one row per zipcode/bedroom_type)
        const flatData = [];
        data.forEach(item => {
          // Use avg rent and sales for each zipcode/bedroom_type
          const avgRent = item.rent && item.rent.length > 0 ? item.rent.reduce((a, b) => a + (b.avg_price || 0), 0) / item.rent.length : 0;
          const avgSales = item.sales && item.sales.length > 0 ? item.sales.reduce((a, b) => a + (b.price || 0), 0) / item.sales.length : 0;
          flatData.push({
            zipcode: item.zipcode,
            bedroom_type: item.sales && item.sales[0] ? item.sales[0].bedrooms : 'N/A',
            monthly_rent: avgRent,
            sales_price: avgSales,
            inventory: item.rent && item.rent[0] ? item.rent[0].inventory : 1,
            date: item.rent && item.rent[0] ? item.rent[0].month_year : '2024-01'
          });
        });
        const response = await fetch('http://localhost:5000/api/roi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(flatData)
        });
        const result = await response.json();
        // Map ROI by zipcode
        const roiByZip = {};
        let min = Infinity, max = -Infinity;
        result.pred_df.forEach(row => {
          roiByZip[row.zipcode] = row.predicted_roi;
          if (row.predicted_roi !== null && !isNaN(row.predicted_roi)) {
            min = Math.min(min, row.predicted_roi);
            max = Math.max(max, row.predicted_roi);
          }
        });
        setRoiMap(roiByZip);
        setRoiMin(min);
        setRoiMax(max);
      } catch (e) {
        console.error('Failed to fetch ROI:', e);
      }
    }
    if (data && data.length > 0) fetchROI();
  }, [data]);

  const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN || 'pk.eyJ1IjoiZXhhbXBsZSIsImEiOiJjbHNmMzZ1eW4wMDAwMzJwcHZmMGQxMHMwIn0.EXAMPLE_TOKEN';

  const mapStyles = [
    { value: 'mapbox://styles/mapbox/streets-v12', label: 'STREET' },
    { value: 'mapbox://styles/mapbox/satellite-v9', label: 'SATELLITE' },
    { value: 'mapbox://styles/mapbox/light-v11', label: 'LIGHT' }
  ];

  const flyToLocation = (longitude, latitude, zoom = 10) => {
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [longitude, latitude],
        zoom,
        speed: 1.2,
        curve: 1.8,
        essential: true
      });
    } else {
      setViewState({ longitude, latitude, zoom });
    }
  };

  // Filter zipcodes based on search input
  const filteredZipcodes = searchInput.trim() === '' 
    ? [] 
    : data.filter(item => 
        item.zipcode.toString().includes(searchInput)
      );

  // Handle zipcode selection from dropdown
  const handleZipcodeSelect = (zipcode) => {
    const selectedZipcode = data.find(item => item.zipcode === zipcode);
    if (selectedZipcode) {
      flyToLocation(selectedZipcode.longitude, selectedZipcode.latitude, 10);
      setPopupInfo(selectedZipcode);
      setSearchInput('');
      setShowSearchDropdown(false);
    }
  };

  const handleSidebarZipcodeClick = (zipcode) => {
    handleZipcodeSelect(zipcode);
  };

  const handleResetMap = () => {
    flyToLocation(-149.8, 61.1, 8);
    setPopupInfo(null);
    setSearchInput('');
    setShowSearchDropdown(false);
  };

  return (
    <div className="map-container">
      <div className="map-header">
        <h1>RENTMAP-ZIPCODE-BASED HOUSING PORTAL</h1>
        <p>YOUR ONE STOP DESTINATION FOR ALL HOUSING LAND INSIGHTS</p>

        <div className="top-right-auth">
          <span className="user-label">{user}</span>
          <button className="logout-btn" onClick={onLogout} title="Logout">Logout</button>
        </div>

        <div className="search-box">
          <input
            type="text"
            placeholder="🔍 SEARCH ZIPCODE..."
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setShowSearchDropdown(true);
            }}
            onFocus={() => setShowSearchDropdown(true)}
            className="search-input"
          />
          {showSearchDropdown && filteredZipcodes.length > 0 && (
            <div className="search-dropdown">
              {filteredZipcodes.map((item, idx) => (
                <div
                  key={idx}
                  className="dropdown-item"
                  onClick={() => handleZipcodeSelect(item.zipcode)}
                >
                  <div className="dropdown-zipcode">{item.zipcode}</div>
                  <div className="dropdown-coords">
                    {item.latitude.toFixed(2)}, {item.longitude.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
          {showSearchDropdown && searchInput && filteredZipcodes.length === 0 && (
            <div className="search-dropdown no-results">
              No zipcodes found
            </div>
          )}
        </div>



        <div className="style-toggle-group">
          {mapStyles.map((style) => (
            <button
              key={style.value}
              className={`style-toggle-btn${mapStyle === style.value ? ' active' : ''}`}
              onClick={() => style.value && setMapStyle(style.value)}
              type="button"
            >
              {style.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sidebar */}
      <div className={`sidebar ${showSidebar ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <h3>All Zipcodes ({data.length})</h3>
          <button 
            className="toggle-btn" 
            onClick={() => setShowSidebar(!showSidebar)}
            title={showSidebar ? 'Hide sidebar' : 'Show sidebar'}
          >
            {showSidebar ? '◀' : '▶'}
          </button>
        </div>
        
        <div className="sidebar-content">
          {data.map((item, idx) => {
            const salesStats = item.sales.length > 0 
              ? item.sales.reduce((acc, s) => acc + s.price, 0) / item.sales.length 
              : 0;
            const rentStats = item.rent.length > 0 
              ? item.rent.filter(r => r.avg_price).reduce((acc, r) => acc + r.avg_price, 0) / item.rent.filter(r => r.avg_price).length
              : 0;

            return (
              <div 
                key={idx} 
                className="sidebar-zipcode-item"
                onClick={() => handleSidebarZipcodeClick(item.zipcode)}
              >
                <div className="sidebar-zipcode-header">
                  <span className="sidebar-zipcode-number">📍 {item.zipcode}</span>
                </div>
                <div className="sidebar-zipcode-details">
                  <div className="sidebar-detail-row">
                    <span className="detail-label">Location:</span>
                    <span className="detail-value">{item.latitude.toFixed(2)}, {item.longitude.toFixed(2)}</span>
                  </div>
                  <div className="sidebar-detail-row">
                    <span className="detail-label">Sales Records:</span>
                    <span className="detail-value">{item.sales.length}</span>
                  </div>
                  {salesStats > 0 && (
                    <div className="sidebar-detail-row">
                      <span className="detail-label">Avg Sale Price:</span>
                      <span className="detail-value">${salesStats.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</span>
                    </div>
                  )}
                  <div className="sidebar-detail-row">
                    <span className="detail-label">Rent Records:</span>
                    <span className="detail-value">{item.rent.length}</span>
                  </div>
                  {rentStats > 0 && (
                    <div className="sidebar-detail-row">
                      <span className="detail-label">Avg Rent:</span>
                      <span className="detail-value">${rentStats.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {console.log('Current mapStyle:', mapStyle)}
      <Map
        key={mapStyle}
        ref={mapRef}
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        style={{ width: '100%', height: '100%' }}
        mapStyle={mapStyle}
        mapboxAccessToken={MAPBOX_TOKEN}
      >
        {data.map((item, idx) => {
          // Compute blue gradient color based on ROI
          const roi = roiMap[item.zipcode];
          let color = '#b3c6ff'; // fallback light blue
          if (roi !== undefined && roiMax > roiMin) {
            // roiNorm: 0 (min) to 1 (max)
            const roiNorm = (roi - roiMin) / (roiMax - roiMin);
            // Gradient from #b3c6ff (light) to #0033cc (dark)
            const r = Math.round(179 + (0 - 179) * roiNorm);
            const g = Math.round(198 + (51 - 198) * roiNorm);
            const b = Math.round(255 + (204 - 255) * roiNorm);
            color = `rgb(${r},${g},${b})`;
          }
          return (
            <Marker
              key={idx}
              longitude={item.longitude}
              latitude={item.latitude}
              anchor="bottom"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                flyToLocation(item.longitude, item.latitude, 10);
                setPopupInfo(item);
              }}
            >
              <div className="marker">
                <div className="marker-inner" style={{ color }}>{'📍'}</div>
              </div>
            </Marker>
          );
        })}

        {popupInfo && (
          <Popup
            anchor="left"
            longitude={popupInfo.longitude}
            latitude={popupInfo.latitude}
            offset={[30, 0]}
            closeOnClick={false}
            focusAfterOpen={false}
            onClose={() => setPopupInfo(null)}
            className="popup-container"
          >
            <MarkerPopup data={popupInfo} />
          </Popup>
        )}
      </Map>

      <div className="data-legend">
        <div className="legend-item">
          <span className="legend-icon">📍</span>
          <span>Click on markers to view sales & rental data</span>
        </div>
      </div>

      {/* Map Controller - bottom right */}
      <div className="map-controller">
        <button className="controller-btn" title="Zoom In" onClick={() => setViewState(v => ({ ...v, zoom: Math.min(v.zoom + 1, 20) }))}>+</button>
        <button className="controller-btn" title="Zoom Out" onClick={() => setViewState(v => ({ ...v, zoom: Math.max(v.zoom - 1, 1) }))}>-</button>
        <button className="controller-btn" title="Reset" onClick={() => flyToLocation(-149.8, 61.1, 8)}>&#8634;</button>
      </div>
    </div>
  );
};

export default MapContainer;
