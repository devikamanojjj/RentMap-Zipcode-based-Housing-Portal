import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import ROITableModal from './ROITableModal';
import Map, { Marker, Popup } from 'react-map-gl';
import './MapContainer.css';
import MarkerPopup from './MarkerPopup';
import MapHeader from './MapHeader';
import SidebarPanel from './SidebarPanel';
import SidebarToggleArrow from './SidebarToggleArrow';
import MapControls from './MapControls';

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

  const [favZipcodes, setFavZipcodes] = useState([]);

  const normalizeZipcode = useCallback((zipcode) => String(zipcode ?? '').trim(), []);

  const fetchFavorites = useCallback(async () => {
    if (!user) {
      setFavZipcodes([]);
      return;
    }
    try {
      const response = await fetch('/api/favorites', {
        headers: { 'X-User': user }
      });
      const result = await response.json();
      if (response.ok && Array.isArray(result.favorites)) {
        setFavZipcodes(result.favorites.map(normalizeZipcode));
      }
    } catch (err) {
      // keep current state if backend is temporarily unavailable
    }
  }, [normalizeZipcode, user]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

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
      return data.filter(item => compareZipcodes.includes(normalizeZipcode(item.zipcode)));
    }
    return data;
  }, [compareMode, compareZipcodes, data, normalizeZipcode, showOnlyFavs]);

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
    const normalizedTarget = normalizeZipcode(zipcode);
    const selectedZipcode = data.find(item => normalizeZipcode(item.zipcode) === normalizedTarget);
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

  const handleToggleFavorite = useCallback(async (zipcode) => {
    const normalizedZipcode = normalizeZipcode(zipcode);
    if (!normalizedZipcode || !user) return;

    const isFavorited = favZipcodes.includes(normalizedZipcode);
    const endpoint = isFavorited
      ? `/api/favorites/${encodeURIComponent(normalizedZipcode)}`
      : '/api/favorites';

    const response = await fetch(endpoint, {
      method: isFavorited ? 'DELETE' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User': user
      },
      body: isFavorited ? undefined : JSON.stringify({ zipcode: normalizedZipcode })
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.error || 'Failed to update favorites');
    }

    const updatedFavorites = Array.isArray(result.favorites)
      ? result.favorites.map(normalizeZipcode)
      : [];
    setFavZipcodes(updatedFavorites);
    setCompareZipcodes(prev => prev.filter(z => updatedFavorites.includes(normalizeZipcode(z))));
  }, [favZipcodes, normalizeZipcode, user]);

  const handleToggleCompareMode = useCallback(() => {
    if (compareMode) {
      setCompareMode(false);
      return;
    }
    setShowOnlyFavs(true);
    setCompareMode(true);
    setCompareZipcodes(prev => {
      const stillValid = prev.filter(zipcode => favZipcodes.includes(normalizeZipcode(zipcode)));
      return stillValid.length > 0 ? stillValid : [...favZipcodes];
    });
  }, [compareMode, favZipcodes, normalizeZipcode]);

  const handleResetMap = () => {
    flyToLocation(-149.8, 61.1, 8);
    setPopupInfo(null);
    setSearchInput('');
    setShowSearchDropdown(false);
  };

  // ROI Table modal state
  const [roiModalOpen, setRoiModalOpen] = useState(false);
  const [roiTableData, setRoiTableData] = useState([]);
  const [roiByZipcode, setRoiByZipcode] = useState({});


  // Prepare data in the format expected by the backend ROI calculation
  function prepareROIData(data) {
    const rows = [];
    data.forEach(item => {
      // For each rent entry, pair with the latest sales price for that zipcode
      const salesPrice = item.sales && item.sales.length > 0
        ? Number(item.sales[item.sales.length - 1].price)
        : null;
      if (item.rent && item.rent.length > 0) {
        item.rent.forEach(rentEntry => {
          const monthlyRent = Number(rentEntry.avg_price);
          const inventory = Number(rentEntry.inventory);
          rows.push({
            zipcode: item.zipcode,
            monthly_rent: Number.isFinite(monthlyRent) ? monthlyRent : 0,
            inventory: Number.isFinite(inventory) ? inventory : 0,
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
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch ROI data');
      }

      const aggRoi = Array.isArray(result.agg_roi) ? result.agg_roi : [];
      const normalized = aggRoi
        .map((row) => ({
          zipcode: String(row.zipcode ?? '').trim(),
          roi_sumproduct: row.roi_sumproduct == null ? null : Number(row.roi_sumproduct)
        }))
        .filter((row) => row.zipcode !== '');

      const sorted = normalized.sort((a, b) => (b.roi_sumproduct || 0) - (a.roi_sumproduct || 0));
      setRoiTableData(sorted);
      
      // Create zipcode -> ROI lookup map
      const roiMap = {};
      normalized.forEach((row) => {
        roiMap[row.zipcode] = row.roi_sumproduct;
      });
      setRoiByZipcode(roiMap);
    } catch (err) {
      console.error('ROI table fetch failed:', err);
      setRoiTableData([]);
      setRoiByZipcode({});
    }
  };

  // Fetch ROI data on component mount
  useEffect(() => {
    if (data && data.length > 0) {
      fetchROITable();
    }
  }, [data]);

  // Get color based on ROI value (bright red-yellow gradient)
  const getMarkerColor = useCallback((zipcode) => {
    const roi = roiByZipcode[normalizeZipcode(zipcode)];
    
    if (roi == null) {
      return '#9E9E9E'; // Grey for null values
    }

    // Get all valid ROI values for normalization
    const validRois = Object.values(roiByZipcode).filter(r => r != null);
    if (validRois.length === 0) return '#9E9E9E';

    const minRoi = Math.min(...validRois);
    const maxRoi = Math.max(...validRois);
    
    if (maxRoi === minRoi) {
      return '#FF8800'; // Bright orange if all ROIs are the same
    }

    // Normalize ROI to 0-1 range
    const normalized = (roi - minRoi) / (maxRoi - minRoi);
    
    // Bright gradient: lowest ROI -> yellow (#FFFF00), highest ROI -> dark red (#DC0000)
    // Mid-range values naturally form orange shades.
    const r = Math.round(255 - (255 - 220) * normalized);
    const g = Math.round(255 * (1 - normalized));
    const b = 0;
    
    return `rgb(${r}, ${g}, ${b})`;
  }, [roiByZipcode, normalizeZipcode]);

  const handleToggleROIModal = () => {
    if (!roiModalOpen) {
      fetchROITable();
    }
    setRoiModalOpen(prev => !prev);
  };
  const handleCloseROIModal = () => setRoiModalOpen(false);

  const handleROIZipcodeClick = (zipcode) => {
    handleZipcodeSelect(zipcode);
  };

  return (
    <div className="map-container">
      <ROITableModal
        open={roiModalOpen}
        onClose={handleCloseROIModal}
        roiData={roiTableData}
        onZipcodeClick={handleROIZipcodeClick}
      />
      <MapHeader
        user={user}
        onLogout={onLogout}
        searchInput={searchInput}
        onSearchInputChange={(value) => {
          setSearchInput(value);
          setShowSearchDropdown(true);
        }}
        onSearchFocus={() => setShowSearchDropdown(true)}
        showSearchDropdown={showSearchDropdown}
        filteredZipcodes={filteredZipcodes}
        onZipcodeSelect={handleZipcodeSelect}
        mapStyles={mapStyles}
        mapStyle={mapStyle}
        onMapStyleChange={setMapStyle}
      />

      <SidebarPanel
        data={data}
        showSidebar={showSidebar}
        compareMode={compareMode}
        compareZipcodes={compareZipcodes}
        favZipcodes={favZipcodes}
        showOnlyFavs={showOnlyFavs}
        onToggleCompareMode={handleToggleCompareMode}
        onToggleShowOnlyFavs={() => setShowOnlyFavs(v => !v)}
        onFavoriteClick={async (e, item) => {
          e.stopPropagation();
          try {
            await handleToggleFavorite(item.zipcode);
          } catch (err) {
            // noop; keep UI stable
          }
        }}
        onSidebarZipcodeClick={handleSidebarZipcodeClick}
        onToggleCompareZipcode={(zipcode) => {
          const normalizedZipcode = normalizeZipcode(zipcode);
          if (!favZipcodes.includes(normalizedZipcode)) return;
          setCompareZipcodes(prev => (
            prev.includes(normalizedZipcode)
              ? prev.filter(z => z !== normalizedZipcode)
              : [...prev, normalizedZipcode]
          ));
        }}
      />

      <SidebarToggleArrow
        showSidebar={showSidebar}
        onToggle={() => setShowSidebar(!showSidebar)}
      />
      
      {mapError && (
        <div className="map-error-banner">
          {mapError}
        </div>
      )}
      <button
        className={`roi-map-toggle-btn ${roiModalOpen ? 'open' : 'closed'}`}
        type="button"
        onClick={handleToggleROIModal}
      >
        ROI TABLE
      </button>
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
        {filteredMapData.map((item, idx) => {
          const markerColor = getMarkerColor(item.zipcode);
          const isNull = markerColor === '#9E9E9E';
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
                <svg
                  width="32"
                  height="42"
                  viewBox="0 0 24 36"
                  className="marker-pin"
                  style={{
                    filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.3))'
                  }}
                >
                  {/* Pin body */}
                  <path
                    d="M12 0C7.03 0 3 4.03 3 9c0 6.75 9 18 9 18s9-11.25 9-18c0-4.97-4.03-9-9-9z"
                    fill={markerColor}
                    stroke={isNull ? '#666' : 'rgba(0,0,0,0.2)'}
                    strokeWidth={isNull ? '1.5' : '0.5'}
                  />
                  {/* Inner circle */}
                  <circle
                    cx="12"
                    cy="9"
                    r="3.5"
                    fill="rgba(255,255,255,0.9)"
                  />
                </svg>
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
            <MarkerPopup
              data={popupInfo}
              favZipcodes={favZipcodes}
              onToggleFavorite={handleToggleFavorite}
            />
          </Popup>
        )}
      </Map>
      <MapControls
        onZoomIn={() => setViewState(v => ({ ...v, zoom: Math.min(v.zoom + 1, 20) }))}
        onZoomOut={() => setViewState(v => ({ ...v, zoom: Math.max(v.zoom - 1, 1) }))}
        onReset={handleResetMap}
      />
    </div>
  );
};

export default MapContainer;
