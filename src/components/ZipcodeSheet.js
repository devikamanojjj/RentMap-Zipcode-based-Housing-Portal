import React from 'react';

const ZipcodeSheet = ({
  data,
  favZipcodes,
  showOnlyFavs,
  handleFavoriteClick,
  handleSidebarZipcodeClick,
  compareMode,
  compareZipcodes,
  onToggleCompareZipcode
}) => {
  const normalizeZipcode = (zipcode) => String(zipcode ?? '').trim();
  const filteredData = showOnlyFavs
    ? data.filter(item => favZipcodes.includes(normalizeZipcode(item.zipcode)))
    : data;
  const showCompareColumn = compareMode && showOnlyFavs;

  return (
    <div className="zipcode-sheet-container">
      <table className="zipcode-sheet-table">
        <thead>
          <tr>
            {showCompareColumn && <th>Compare</th>}
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
                {showCompareColumn && (
                  <td
                    onClick={e => e.stopPropagation()}
                    style={{ textAlign: 'center' }}
                  >
                    <input
                      type="checkbox"
                      checked={compareZipcodes.includes(normalizeZipcode(item.zipcode))}
                      disabled={!favZipcodes.includes(normalizeZipcode(item.zipcode))}
                      onChange={() => onToggleCompareZipcode(normalizeZipcode(item.zipcode))}
                    />
                  </td>
                )}
                <td onClick={e => { e.stopPropagation(); handleFavoriteClick(e, item, favZipcodes); }} style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: '18px', color: favZipcodes.includes(normalizeZipcode(item.zipcode)) ? '#e25555' : '#bbb', cursor: 'pointer' }}>
                    {favZipcodes.includes(normalizeZipcode(item.zipcode)) ? '❤️' : '🤍'}
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
