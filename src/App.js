import React, { useState, useEffect } from 'react';
import Map from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import Papa from 'papaparse';
import MapContainer from './components/MapContainer';
import './App.css';

function App() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load both CSV files
        const latLongResponse = await fetch('/latlong.csv');
        const latLongText = await latLongResponse.text();
        const latLongData = Papa.parse(latLongText, { header: true });

        const salesRentResponse = await fetch('/sales_rent_result 1.csv');
        const salesRentText = await salesRentResponse.text();
        const salesRentData = Papa.parse(salesRentText, { header: true });

        // Merge data
        const mergedData = mergeData(latLongData.data, salesRentData.data);
        setData(mergedData);
        setLoading(false);
      } catch (err) {
        setError('Error loading data: ' + err.message);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const mergeData = (latLongArray, salesRentArray) => {
    const latLongMap = {};
    
    // Create a map of zipcodes to lat/long
    latLongArray.forEach(item => {
      if (item.zipcodes) {
        latLongMap[item.zipcodes] = {
          zipcode: item.zipcodes,
          latitude: parseFloat(item.latitude),
          longitude: parseFloat(item.longitude),
          sales: [],
          rent: []
        };
      }
    });

    // Add sales and rent data to the map
    salesRentArray.forEach(item => {
      if (item.sales_zipcode && latLongMap[item.sales_zipcode]) {
        if (item.sales_price) {
          latLongMap[item.sales_zipcode].sales.push({
            bedrooms: item.sales_bedrooms,
            month_year: item.sales_month_year,
            price: parseFloat(item.sales_price)
          });
        }
      }
      if (item.rent_zipcode && latLongMap[item.rent_zipcode]) {
        if (item.rent_avg_price) {
          latLongMap[item.rent_zipcode].rent.push({
            bedrooms: item.rent_bedrooms,
            month_year: item.rent_month_year,
            inventory: item.rent_inventory,
            avg_price: parseFloat(item.rent_avg_price)
          });
        }
      }
    });

    return Object.values(latLongMap).filter(item => item.latitude && item.longitude);
  };

  if (loading) {
    return <div className="loading">Loading data...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="App">
      {data && <MapContainer data={data} />}
    </div>
  );
}

export default App;
