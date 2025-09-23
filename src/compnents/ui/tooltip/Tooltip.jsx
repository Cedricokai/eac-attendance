import React from 'react';
import PropTypes from 'prop-types';

const Tooltip = ({ content, children, side = 'top' }) => {
  const positionClasses = {
    top: 'bottom-full mb-2',
    right: 'left-full ml-2',
    bottom: 'top-full mt-2',
    left: 'right-full mr-2'
  };

  return (
    <div className="relative group inline-block">
      {children}
      <div className={`absolute z-50 hidden group-hover:block ${positionClasses[side]}`}>
        <div className="bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
          {content}
          <div className={`absolute w-2 h-2 bg-gray-800 transform rotate-45 ${side === 'top' ? 'bottom-[-2px]' : ''} ${side === 'right' ? 'left-[-2px]' : ''} ${side === 'bottom' ? 'top-[-2px]' : ''} ${side === 'left' ? 'right-[-2px]' : ''}`} />
        </div>
      </div>
    </div>
  );
};

Tooltip.propTypes = {
  content: PropTypes.oneOfType([PropTypes.string, PropTypes.node]).isRequired,
  children: PropTypes.node.isRequired,
  side: PropTypes.oneOf(['top', 'right', 'bottom', 'left'])
};

export default Tooltip;