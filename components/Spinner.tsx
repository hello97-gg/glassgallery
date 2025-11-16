
import React from 'react';

const Spinner: React.FC = () => {
  return (
    <div className="w-6 h-6 border-4 border-t-text-muted border-r-text-muted border-b-text-muted border-l-transparent rounded-full animate-spin"></div>
  );
};

export default Spinner;