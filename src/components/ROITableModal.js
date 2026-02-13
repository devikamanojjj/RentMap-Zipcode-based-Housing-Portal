import React from 'react';
import './ROITableModal.css';

const ROITableModal = ({ open, onClose, roiData }) => {
  if (!open) return null;
  return (
    <div className="roi-modal-overlay">
      <div className="roi-modal-content">
        <button className="roi-modal-close" onClick={onClose}>×</button>
        <h2>ROI Table (Descending Order)</h2>
        <div className="roi-table-wrapper">
          <table className="roi-table">
            <thead>
              <tr>
                <th>Zipcode</th>
                <th>ROI (%)</th>
              </tr>
            </thead>
            <tbody>
              {roiData.map((row) => (
                <tr key={row.zipcode}>
                  <td>{row.zipcode}</td>
                  <td>{row.roi_sumproduct ? row.roi_sumproduct.toFixed(2) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ROITableModal;
