import { useEffect, useState } from 'react';
import { OWNER_DEMO_DATA, FARMER_DEMO_DATA, STAKEHOLDER_DEMO_DATA, DEMO_EMAILS } from '../data/demoData';

export const useDemoData = () => {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoEmail, setDemoEmail] = useState<string | null>(null);
  const [demoRole, setDemoRole] = useState<'owner' | 'farmer' | 'stakeholder' | null>(null);

  useEffect(() => {
    const demoFlag = localStorage.getItem('isDemoUser');
    const email = localStorage.getItem('demoEmail');
    
    if (demoFlag === 'true' && email) {
      setIsDemoMode(true);
      setDemoEmail(email);
      
      // Determine role from email
      if (email === DEMO_EMAILS.owner) {
        setDemoRole('owner');
      } else if (email === DEMO_EMAILS.farmer) {
        setDemoRole('farmer');
      } else if (email === DEMO_EMAILS.stakeholder) {
        setDemoRole('stakeholder');
      }
    } else {
      setIsDemoMode(false);
      setDemoEmail(null);
      setDemoRole(null);
    }
  }, []);

  const getOwnerData = () => {
    if (!isDemoMode || demoRole !== 'owner') return null;
    return OWNER_DEMO_DATA;
  };

  const getFarmerData = () => {
    if (!isDemoMode || demoRole !== 'farmer') return null;
    return FARMER_DEMO_DATA;
  };

  const getStakeholderData = () => {
    if (!isDemoMode || demoRole !== 'stakeholder') return null;
    return STAKEHOLDER_DEMO_DATA;
  };

  return {
    isDemoMode,
    demoEmail,
    demoRole,
    getOwnerData,
    getFarmerData,
    getStakeholderData,
  };
};
