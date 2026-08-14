import React from 'react';

const RupeeIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    className={className}
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="20" fontFamily="Arial, sans-serif">
      ₹
    </text>
  </svg>
);

export default RupeeIcon;
