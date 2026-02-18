import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import ROITableModal from './ROITableModal';
import ZipcodeSheet from './ZipcodeSheet';
import Map, { Marker, Popup } from 'react-map-gl';
import './MapContainer.css';
import MarkerPopup from './MarkerPopup';

const MapContainer = ({ data, onLogout, user }) => {
  const [showOnlyFavs, setShowOnlyFavs] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [compareZipcodes, setCompareZipcodes] = useState([]);
  const [popupInfo, setPopupInfo] = useState(null);
  const [mapStyle, setMapStyle] = useState('mapbox://styles/mapbox/streets-v12');
  const [searchInput, setSearchInput] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [viewState, setViewState] = useState({
    longitude: -149.8,
    latitude: 61.1,
    zoom: 8
  });
  const mapRef = useRef();

  // Favorited zipcodes state for instant UI update
  const favKey = `favZipcodes_${user}`;
  const getInitialFavs = useCallback(() => {
    try {
      return JSON.parse(localStorage.getItem(favKey)) || [];
    } catch (e) { return []; }
  }, [favKey]);
  const [favZipcodes, setFavZipcodes] = useState(getInitialFavs());

  // Listen for localStorage changes (if user favorites elsewhere)
  React.useEffect(() => {
    const handler = () => {
      setFavZipcodes(getInitialFavs());
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [getInitialFavs]);

  useEffect(() => {
    setCompareZipcodes(prev => prev.filter(zipcode => favZipcodes.includes(zipcode)));
  }, [favZipcodes]);

  useEffect(() => {
    if (!showOnlyFavs && compareMode) {
      setCompareMode(false);
    }
  }, [showOnlyFavs, compareMode]);

  const filteredMapData = useMemo(() => {
    if (compareMode && showOnlyFavs) {
      return data.filter(item => compareZipcodes.includes(item.zipcode));
    }
    return data;
  }, [compareMode, compareZipcodes, data, showOnlyFavs]);

  useEffect(() => {
    if (popupInfo && !filteredMapData.some(item => item.zipcode === popupInfo.zipcode)) {
      setPopupInfo(null);
    }
  }, [filteredMapData, popupInfo]);


  // Read Mapbox token from env to avoid committing secrets
  const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;
  const [mapError, setMapError] = useState(!MAPBOX_TOKEN ? 'Mapbox token is missing. Add REACT_APP_MAPBOX_TOKEN in .env and restart.' : '');

  const mapStyles = [
    { value: 'mapbox://styles/mapbox/streets-v12', label: 'STREET' },
    { value: 'mapbox://styles/mapbox/satellite-v9', label: 'SATELLITE' },
    { value: 'mapbox://styles/mapbox/light-v10', label: 'LIGHT' }
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

  const handleToggleCompareMode = () => {
    if (compareMode) {
      setCompareMode(false);
      return;
    }
    setShowOnlyFavs(true);
    setCompareMode(true);
    setCompareZipcodes(prev => {
      const stillValid = prev.filter(zipcode => favZipcodes.includes(zipcode));
      return stillValid.length > 0 ? stillValid : [...favZipcodes];
    });
  };

  const handleResetMap = () => {
    flyToLocation(-149.8, 61.1, 8);
    setPopupInfo(null);
    setSearchInput('');
    setShowSearchDropdown(false);
  };

  // ROI Table modal state
  const [roiModalOpen, setRoiModalOpen] = useState(false);
  const [roiTableData, setRoiTableData] = useState([]);


  // Prepare data in the format expected by the backend ROI calculation
  function prepareROIData(data) {
    const rows = [];
    data.forEach(item => {
      // For each rent entry, pair with the latest sales price for that zipcode
      const salesPrice = item.sales && item.sales.length > 0 ? item.sales[item.sales.length - 1].price : null;
      if (item.rent && item.rent.length > 0) {
        item.rent.forEach(rentEntry => {
          rows.push({
            zipcode: item.zipcode,
            monthly_rent: rentEntry.avg_price,
            inventory: rentEntry.inventory,
            sales_price: salesPrice
          });
        });
      }
    });
    return rows;
  }

  // Fetch ROI table data from backend
  const fetchROITable = async () => {
    try {
      const roiInput = prepareROIData(data);
      const response = await fetch('/api/roi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roiInput)
      });
      const result = await response.json();
      if (result.agg_roi) {
        // Sort descending by roi_sumproduct
        const sorted = [...result.agg_roi].sort((a, b) => (b.roi_sumproduct || 0) - (a.roi_sumproduct || 0));
        setRoiTableData(sorted);
      } else {
        setRoiTableData([]);
      }
    } catch (err) {
      setRoiTableData([]);
    }
  };

  const handleShowROIModal = () => {
    setRoiModalOpen(true);
    fetchROITable();
  };
  const handleCloseROIModal = () => setRoiModalOpen(false);

  return (
    <div className="map-container">
      <ROITableModal open={roiModalOpen} onClose={handleCloseROIModal} roiData={roiTableData} />
      <div className="map-header">
        <h1>RENTMAP-ZIPCODE-BASED HOUSING PORTAL</h1>
        <p>YOUR ONE STOP DESTINATION FOR ALL HOUSING LAND INSIGHTS</p>

        <div className="top-right-auth">
          <span className="user-label">{user}</span>
          <button className="logout-btn" onClick={onLogout} title="Logout">Logout</button>
        </div>

        {/* Search box row */}
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

        {/* Show ROI Table button row */}
        <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 0' }}>
          <button className="show-roi-btn" type="button" onClick={handleShowROIModal}>
            Show ROI Table
          </button>
        </div>

        {/* Map style toggle group row */}
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

      {/* Sidebar as Sheet View */}
      <div className={`sidebar ${showSidebar ? 'open' : 'closed'}`} style={{ width: showSidebar ? 700 : 0, minWidth: showSidebar ? 700 : 0, maxWidth: 900, transition: 'width 0.3s, min-width 0.3s', overflow: 'hidden' }}>
        <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <h3 style={{ margin: 0 }}>All Zipcodes ({data.length})</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              className={`compare-btn${compareMode ? ' active' : ''}`}
              type="button"
              onClick={handleToggleCompareMode}
              disabled={!compareMode && favZipcodes.length === 0}
              title={compareMode ? 'Exit compare mode' : 'Compare selected favorite zipcodes'}
            >
              {compareMode ? `Comparing (${compareZipcodes.length})` : 'Compare'}
            </button>
            <span
              style={{
                cursor: 'pointer',
                fontSize: '28px',
                color: showOnlyFavs ? '#e25555' : '#bbb',
                marginRight: 8,
                userSelect: 'none',
                transition: 'color 0.2s',
                display: 'flex',
                alignItems: 'center',
                fontWeight: 600
              }}
              onClick={() => setShowOnlyFavs(v => !v)}
              title={showOnlyFavs ? 'Show all zipcodes' : 'Show only favorites'}
            >
              {showOnlyFavs ? '❤️' : '🤍'}
            </span>
          </div>
        </div>
        <div className="sidebar-content" style={{ overflowX: 'auto', padding: 0 }}>
          <ZipcodeSheet
            data={data}
            favZipcodes={favZipcodes}
            showOnlyFavs={showOnlyFavs}
            handleFavoriteClick={(e, item, favZipcodes) => {
              e.stopPropagation();
              let updatedFavs = [];
              const isFavorited = favZipcodes.includes(item.zipcode);
              if (isFavorited) {
                updatedFavs = favZipcodes.filter(z => z !== item.zipcode);
              } else {
                updatedFavs = [...favZipcodes, item.zipcode];
              }
              localStorage.setItem(favKey, JSON.stringify(updatedFavs));
              setFavZipcodes(updatedFavs);
              setCompareZipcodes(prev => prev.filter(zipcode => updatedFavs.includes(zipcode)));
            }}
            handleSidebarZipcodeClick={handleSidebarZipcodeClick}
            compareMode={compareMode}
            compareZipcodes={compareZipcodes}
            onToggleCompareZipcode={(zipcode) => {
              if (!favZipcodes.includes(zipcode)) return;
              setCompareZipcodes(prev => (
                prev.includes(zipcode)
                  ? prev.filter(z => z !== zipcode)
                  : [...prev, zipcode]
              ));
            }}
          />
        </div>
      </div>

      {/* Always-visible sidebar toggle arrow */}
      <button
        className="sidebar-toggle-arrow"
        onClick={() => setShowSidebar(!showSidebar)}
        title={showSidebar ? 'Hide sidebar' : 'Show sidebar'}
        style={{
          position: 'fixed',
          top: '180px',
          left: showSidebar ? 700 : 0,
          zIndex: 2000,
          width: '38px',
          height: '54px',
          background: 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)',
          color: 'white',
          border: 'none',
          borderRadius: showSidebar ? '0 8px 8px 0' : '0 8px 8px 0',
          boxShadow: '2px 0 8px rgba(0,0,0,0.13)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '22px',
          cursor: 'pointer',
          transition: 'left 0.3s',
        }}
      >
        {showSidebar ? '◀' : '▶'}
      </button>
      
      {mapError && (
        <div style={{ position: 'absolute', top: 160, left: 20, zIndex: 2000, background: '#fff3cd', color: '#7a5c00', border: '1px solid #ffeeba', padding: '8px 12px', borderRadius: 6, fontSize: 12 }}>
          {mapError}
        </div>
      )}
      <Map
        key={mapStyle}
        ref={mapRef}
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        style={{ width: '100%', height: '100%' }}
        mapStyle={mapStyle}
        mapboxAccessToken={MAPBOX_TOKEN}
        onError={(e) => setMapError(e?.error?.message || 'Map failed to load.')}
        onLoad={() => setMapError('')}
      >
        {filteredMapData.map((item, idx) => (
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
              <div className="marker-inner">📍</div>
            </div>
          </Marker>
        ))}

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
            <MarkerPopup data={popupInfo} user={user} />
          </Popup>
        )}
      </Map>



      {/* Map Controller - bottom right */}
      <div className="map-controller">
        <button className="controller-btn" title="Zoom In" onClick={() => setViewState(v => ({ ...v, zoom: Math.min(v.zoom + 1, 20) }))}>+</button>
        <button className="controller-btn" title="Zoom Out" onClick={() => setViewState(v => ({ ...v, zoom: Math.max(v.zoom - 1, 1) }))}>-</button>
        <button className="controller-btn" title="Reset" onClick={handleResetMap}>&#8634;</button>
      </div>
    </div>
  );
};

export default MapContainer;
