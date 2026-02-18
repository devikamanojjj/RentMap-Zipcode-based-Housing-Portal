import React from 'react';

const SidebarToggleArrow = ({ showSidebar, onToggle }) => {
  return (
    <button
      className={`sidebar-toggle-arrow ${showSidebar ? 'open' : 'closed'}`}
      onClick={onToggle}
      title={showSidebar ? 'Hide sidebar' : 'Show sidebar'}
    >
      {showSidebar ? '◀' : '▶'}
    </button>
  );
};

export default SidebarToggleArrow;
