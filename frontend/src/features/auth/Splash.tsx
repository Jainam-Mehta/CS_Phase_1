import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { SystmLogo } from '../../components/common/SystmLogo';
import { WarehouseBackground } from '../../components/common/WarehouseBackground';

const Splash: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isAuthenticated) {
        navigate('/');
      } else {
        navigate('/role-selection');
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [isAuthenticated, navigate]);

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-950 overflow-hidden text-white">
      <WarehouseBackground mode="role-selection" opacity={0.3} />
      <div className="text-center z-10 px-4">
        <SystmLogo variant="hero" showCompanyLogo={true} />
        <div className="mt-8 flex justify-center">
          <div className="w-8 h-8 border-3 border-sky-400/30 border-t-sky-400 rounded-full animate-spin" />
        </div>
      </div>
    </div>
  );
};

export default Splash;
