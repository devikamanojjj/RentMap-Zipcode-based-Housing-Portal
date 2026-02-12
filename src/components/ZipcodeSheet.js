import React from 'react';

const ZipcodeSheet = ({ data, favZipcodes, showOnlyFavs, handleFavoriteClick, handleSidebarZipcodeClick }) => {
  const filteredData = showOnlyFavs ? data.filter(item => favZipcodes.includes(item.zipcode)) : data;

  return (
    <div className="zipcode-sheet-container">
      <table className="zipcode-sheet-table">
        <thead>
          <tr>
            <th>Favorite</th>
            <th>Zipcode</th>
            <th>Sales Records</th>
            <th>Avg Sale Price</th>
            <th>Rent Records</th>
            <th>Avg Rent</th>
          </tr>
        </thead>
        <tbody>
          {filteredData.map(item => {
            const salesStats = item.sales.length > 0 
              ? item.sales.reduce((acc, s) => acc + s.price, 0) / item.sales.length 
              : 0;
            const rentStats = item.rent.length > 0 
              ? item.rent.filter(r => r.avg_price).reduce((acc, r) => acc + r.avg_price, 0) / item.rent.filter(r => r.avg_price).length
              : 0;
            return (
              <tr key={item.zipcode} onClick={() => handleSidebarZipcodeClick(item.zipcode)} style={{ cursor: 'pointer' }}>
                <td onClick={e => { e.stopPropagation(); handleFavoriteClick(e, item, favZipcodes); }} style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: '18px', color: favZipcodes.includes(item.zipcode) ? '#e25555' : '#bbb', cursor: 'pointer' }}>
                    {favZipcodes.includes(item.zipcode) ? '❤️' : '🤍'}
                  </span>
                </td>
                <td>{item.zipcode}</td>
                <td>{item.sales.length}</td>
                <td>{salesStats > 0 ? `$${salesStats.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}` : '-'}</td>
                <td>{item.rent.length}</td>
                <td>{rentStats > 0 ? `$${rentStats.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}` : '-'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ZipcodeSheet;
