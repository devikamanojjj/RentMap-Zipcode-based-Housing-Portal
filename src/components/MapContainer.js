import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import Map, { Marker, Popup } from 'react-map-gl';
import './MapContainer.css';
import MarkerPopup from './MarkerPopup';
import MapHeader from './MapHeader';
import SidebarPanel from './SidebarPanel';
import SidebarToggleArrow from './SidebarToggleArrow';
import MapControls from './MapControls';
import CompareInsightsModal from './CompareInsightsModal';

const MapContainer = ({ data, onLogout, user }) => {
  const [showOnlyFavs, setShowOnlyFavs] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [compareZipcodes, setCompareZipcodes] = useState([]);
  const [popupInfo, setPopupInfo] = useState(null);
  const [mapStyle, setMapStyle] = useState('mapbox://styles/mapbox/streets-v12');
  const [searchInput, setSearchInput] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [favoriteToast, setFavoriteToast] = useState('');
  const [favoriteToastVisible, setFavoriteToastVisible] = useState(false);
  const [confirmUnfavoriteZipcode, setConfirmUnfavoriteZipcode] = useState('');
  const [isUnfavoriteSaving, setIsUnfavoriteSaving] = useState(false);
  const [viewState, setViewState] = useState({
    longitude: -149.8,
    latitude: 61.1,
    zoom: 8
  });
  const mapRef = useRef();
  const favoriteToastTimerRef = useRef(null);
  const favoriteToastFadeTimerRef = useRef(null);

  const [favZipcodes, setFavZipcodes] = useState([]);
  const [activeFilters, setActiveFilters] = useState({
    rentMin: null,
    rentMax: null,
    roiMin: null,
    roiMax: null
  });
  const [roiTableData, setRoiTableData] = useState([]);
  const [roiByZipcode, setRoiByZipcode] = useState({});
  const [compareInsightsOpen, setCompareInsightsOpen] = useState(false);
  const normalizedUser = String(user ?? '').trim();

  const normalizeZipcode = useCallback((zipcode) => String(zipcode ?? '').trim(), []);

  const showFavoriteAddedToast = useCallback((zipcode) => {
    if (favoriteToastTimerRef.current) {
      clearTimeout(favoriteToastTimerRef.current);
    }
    if (favoriteToastFadeTimerRef.current) {
      clearTimeout(favoriteToastFadeTimerRef.current);
    }
    setFavoriteToast(`${zipcode} has been added to favourites`);
    setFavoriteToastVisible(true);
    favoriteToastTimerRef.current = setTimeout(() => {
      setFavoriteToastVisible(false);
      favoriteToastTimerRef.current = null;
    }, 4000);
    favoriteToastFadeTimerRef.current = setTimeout(() => {
      setFavoriteToast('');
      favoriteToastFadeTimerRef.current = null;
    }, 4400);
  }, []);

  useEffect(() => () => {
    if (favoriteToastTimerRef.current) {
      clearTimeout(favoriteToastTimerRef.current);
    }
    if (favoriteToastFadeTimerRef.current) {
      clearTimeout(favoriteToastFadeTimerRef.current);
    }
  }, []);

  useEffect(() => {
    if (!confirmUnfavoriteZipcode) return;

    const handleEscape = (event) => {
      if (event.key === 'Escape' && !isUnfavoriteSaving) {
        setConfirmUnfavoriteZipcode('');
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [confirmUnfavoriteZipcode, isUnfavoriteSaving]);

  const fetchFavorites = useCallback(async () => {
    if (!normalizedUser) {
      setFavZipcodes([]);
      return;
    }
    try {
      const response = await fetch('/api/favorites', {
        headers: { 'X-User': normalizedUser }
      });
      const result = await response.json();
      if (response.ok && Array.isArray(result.favorites)) {
        setFavZipcodes(result.favorites.map(normalizeZipcode));
      }
    } catch (err) {
      // keep current state if backend is temporarily unavailable
    }
  }, [normalizeZipcode, normalizedUser]);

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

  const passesActiveFilters = useCallback((item) => {
    const { rentMin, rentMax, roiMin, roiMax } = activeFilters;

    if (rentMin != null || rentMax != null) {
      const rentValues = (item.rent || [])
        .map((entry) => Number(entry.avg_price))
        .filter((value) => Number.isFinite(value));

      if (rentValues.length === 0) {
        return false;
      }

      const latestRent = rentValues[rentValues.length - 1];
      if (rentMin != null && latestRent < rentMin) return false;
      if (rentMax != null && latestRent > rentMax) return false;
    }

    if (roiMin != null || roiMax != null) {
      const roiValue = roiByZipcode[normalizeZipcode(item.zipcode)];
      if (!Number.isFinite(roiValue)) {
        return false;
      }
      if (roiMin != null && roiValue < roiMin) return false;
      if (roiMax != null && roiValue > roiMax) return false;
    }

    return true;
  }, [activeFilters, normalizeZipcode, roiByZipcode]);

  const filteredBaseData = useMemo(
    () => data.filter((item) => passesActiveFilters(item)),
    [data, passesActiveFilters]
  );

  const filteredMapData = useMemo(() => {
    if (!showOnlyFavs) {
      return filteredBaseData;
    }

    const favoritesOnly = filteredBaseData.filter(item => favZipcodes.includes(normalizeZipcode(item.zipcode)));

    if (compareMode) {
      return favoritesOnly.filter(item => compareZipcodes.includes(normalizeZipcode(item.zipcode)));
    }

    return favoritesOnly;
  }, [compareMode, compareZipcodes, favZipcodes, filteredBaseData, normalizeZipcode, showOnlyFavs]);

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
    : filteredBaseData.filter(item => 
        item.zipcode.toString().includes(searchInput)
      );

  // Handle zipcode selection from dropdown
  const handleZipcodeSelect = (zipcode) => {
    const normalizedTarget = normalizeZipcode(zipcode);
    const selectedZipcode = filteredBaseData.find(item => normalizeZipcode(item.zipcode) === normalizedTarget);
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
    if (!normalizedZipcode || !normalizedUser) return;

    const isFavorited = favZipcodes.includes(normalizedZipcode);
    if (isFavorited) {
      setConfirmUnfavoriteZipcode(normalizedZipcode);
      return;
    }

    const endpoint = isFavorited
      ? `/api/favorites/${encodeURIComponent(normalizedZipcode)}`
      : '/api/favorites';

    const response = await fetch(endpoint, {
      method: isFavorited ? 'DELETE' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User': normalizedUser
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
    if (!isFavorited) {
      showFavoriteAddedToast(normalizedZipcode);
    }
  }, [favZipcodes, normalizeZipcode, normalizedUser, showFavoriteAddedToast]);

  const handleConfirmUnfavorite = useCallback(async () => {
    const normalizedZipcode = normalizeZipcode(confirmUnfavoriteZipcode);
    if (!normalizedZipcode || !normalizedUser) {
      setConfirmUnfavoriteZipcode('');
      return;
    }

    setIsUnfavoriteSaving(true);
    try {
      const response = await fetch(`/api/favorites/${encodeURIComponent(normalizedZipcode)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-User': normalizedUser
        }
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
      setConfirmUnfavoriteZipcode('');
    } catch (err) {
      // keep dialog open so user can retry or cancel
    } finally {
      setIsUnfavoriteSaving(false);
    }
  }, [confirmUnfavoriteZipcode, normalizeZipcode, normalizedUser]);

  const handleToggleShowOnlyFavs = useCallback(async () => {
    if (!showOnlyFavs) {
      await fetchFavorites();
    }
    setShowOnlyFavs((prev) => !prev);
  }, [fetchFavorites, showOnlyFavs]);

  const handleToggleCompareMode = useCallback(() => {
    if (compareMode) {
      setCompareMode(false);
      return;
    }
    setShowOnlyFavs(true);
    setCompareMode(true);
    setCompareZipcodes([]);
  }, [compareMode]);

  const handleResetMap = () => {
    flyToLocation(-149.8, 61.1, 8);
    setPopupInfo(null);
    setSearchInput('');
    setShowSearchDropdown(false);
  };

  const selectedCompareData = useMemo(() => {
    if (!compareMode || compareZipcodes.length === 0) {
      return [];
    }

    return filteredBaseData.filter((item) => compareZipcodes.includes(normalizeZipcode(item.zipcode)));
  }, [compareMode, compareZipcodes, filteredBaseData, normalizeZipcode]);

  useEffect(() => {
    if (compareMode && compareZipcodes.length > 0) {
      setCompareInsightsOpen(true);
      return;
    }
    setCompareInsightsOpen(false);
  }, [compareMode, compareZipcodes]);


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

  const roiLegendStats = useMemo(() => {
    const validRois = Object.values(roiByZipcode).filter((value) => Number.isFinite(value));
    if (validRois.length === 0) {
      return { hasData: false, minRoi: null, maxRoi: null };
    }

    return {
      hasData: true,
      minRoi: Math.min(...validRois),
      maxRoi: Math.max(...validRois)
    };
  }, [roiByZipcode]);

  const handleToggleSidebar = () => {
    setShowSidebar((prev) => {
      const willOpen = !prev;
      if (!willOpen) {
        setShowOnlyFavs(false);
        setCompareMode(false);
        setCompareZipcodes([]);
      }
      return willOpen;
    });
  };

  return (
    <div className="map-container">
      <CompareInsightsModal
        open={compareInsightsOpen}
        onClose={() => setCompareInsightsOpen(false)}
        selectedZipcodes={compareZipcodes}
        selectedData={selectedCompareData}
        roiByZipcode={roiByZipcode}
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
        data={data}
        roiByZipcode={roiByZipcode}
        onApplyFilters={setActiveFilters}
        onResetFilters={() => setActiveFilters({ rentMin: null, rentMax: null, roiMin: null, roiMax: null })}
      />

      <div className="map-style-overlay" aria-label="Map style selector">
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

      <SidebarPanel
        data={filteredBaseData}
        roiByZipcode={roiByZipcode}
        selectedZipcode={normalizeZipcode(popupInfo?.zipcode)}
        showSidebar={showSidebar}
        compareMode={compareMode}
        compareZipcodes={compareZipcodes}
        favZipcodes={favZipcodes}
        showOnlyFavs={showOnlyFavs}
        onToggleCompareMode={handleToggleCompareMode}
        onToggleShowOnlyFavs={handleToggleShowOnlyFavs}
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
        onToggle={handleToggleSidebar}
      />
      
      {mapError && (
        <div className="map-error-banner">
          {mapError}
        </div>
      )}
      {favoriteToast && (
        <div className={`favorite-toast ${favoriteToastVisible ? 'visible' : 'fading'}`} role="status" aria-live="polite">
          {favoriteToast}
        </div>
      )}
      {confirmUnfavoriteZipcode && (
        <div className="confirm-unfavorite-overlay" role="dialog" aria-modal="true" aria-label="Confirm unfavourite">
          <div className="confirm-unfavorite-modal">
            <h3>Confirm Unfavourite</h3>
            <p>Are you sure you want to unfavourite {confirmUnfavoriteZipcode}?</p>
            <div className="confirm-unfavorite-actions">
              <button
                type="button"
                className="confirm-unfavorite-cancel"
                onClick={() => setConfirmUnfavoriteZipcode('')}
                disabled={isUnfavoriteSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="confirm-unfavorite-yes"
                onClick={handleConfirmUnfavorite}
                disabled={isUnfavoriteSaving}
              >
                {isUnfavoriteSaving ? 'Removing...' : 'Yes, Unfavourite'}
              </button>
            </div>
          </div>
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
      {roiLegendStats.hasData && (
        <div className="roi-gradient-legend" aria-label="ROI color legend">
          <div className="roi-gradient-legend-title">ROI Gradient</div>
          <div className="roi-gradient-bar" />
          <div className="roi-gradient-labels">
            <span>High ROI ({roiLegendStats.maxRoi.toFixed(2)}%)</span>
            <span>Low ROI ({roiLegendStats.minRoi.toFixed(2)}%)</span>
          </div>
        </div>
      )}
      <MapControls
        onZoomIn={() => setViewState(v => ({ ...v, zoom: Math.min(v.zoom + 1, 20) }))}
        onZoomOut={() => setViewState(v => ({ ...v, zoom: Math.max(v.zoom - 1, 1) }))}
        onReset={handleResetMap}
      />
    </div>
  );
};

export default MapContainer;
