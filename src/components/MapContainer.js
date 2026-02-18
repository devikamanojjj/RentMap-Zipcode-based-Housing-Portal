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
        onShowRoiModal={handleShowROIModal}
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
        onFavoriteClick={(e, item, currentFavZipcodes) => {
          e.stopPropagation();
          let updatedFavs = [];
          const isFavorited = currentFavZipcodes.includes(item.zipcode);
          if (isFavorited) {
            updatedFavs = currentFavZipcodes.filter(z => z !== item.zipcode);
          } else {
            updatedFavs = [...currentFavZipcodes, item.zipcode];
          }
          localStorage.setItem(favKey, JSON.stringify(updatedFavs));
          setFavZipcodes(updatedFavs);
          setCompareZipcodes(prev => prev.filter(zipcode => updatedFavs.includes(zipcode)));
        }}
        onSidebarZipcodeClick={handleSidebarZipcodeClick}
        onToggleCompareZipcode={(zipcode) => {
          if (!favZipcodes.includes(zipcode)) return;
          setCompareZipcodes(prev => (
            prev.includes(zipcode)
              ? prev.filter(z => z !== zipcode)
              : [...prev, zipcode]
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
      <MapControls
        onZoomIn={() => setViewState(v => ({ ...v, zoom: Math.min(v.zoom + 1, 20) }))}
        onZoomOut={() => setViewState(v => ({ ...v, zoom: Math.max(v.zoom - 1, 1) }))}
        onReset={handleResetMap}
      />
    </div>
  );
};

export default MapContainer;
