import React from 'react';

export type RoleType = 'farmer' | 'owner' | 'stakeholder' | 'admin' | string | null | undefined;

export interface RoleBackgroundProps {
  role?: RoleType;
  opacity?: number;
  className?: string;
  preferVideo?: boolean;
}

export const RoleBackground: React.FC<RoleBackgroundProps> = ({
  role = 'farmer',
  className = '',
}) => {
  const activeRole = (role || 'farmer').toLowerCase();

  return (
    <div className={`fixed inset-0 pointer-events-none -z-10 bg-[#f4f5f7] overflow-hidden ${className}`}>
      {/* Subtle ambient gradient base matching the clean light enterprise aesthetic */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-[#f4f5f7] to-[#eceef2]" />

      {/* Role-specific subtle organic ambient wash */}
      {activeRole === 'farmer' && (
        <>
          <div className="absolute -top-32 left-1/4 w-[650px] h-[400px] bg-emerald-500/[0.04] rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 -right-32 w-[500px] h-[400px] bg-teal-500/[0.03] rounded-full blur-3xl pointer-events-none" />
        </>
      )}

      {activeRole === 'owner' && (
        <>
          <div className="absolute -top-32 left-1/4 w-[650px] h-[400px] bg-sky-500/[0.04] rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 -right-32 w-[500px] h-[400px] bg-blue-500/[0.03] rounded-full blur-3xl pointer-events-none" />
        </>
      )}

      {activeRole === 'stakeholder' && (
        <>
          <div className="absolute -top-32 left-1/4 w-[650px] h-[400px] bg-indigo-500/[0.04] rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 -right-32 w-[500px] h-[400px] bg-purple-500/[0.03] rounded-full blur-3xl pointer-events-none" />
        </>
      )}

      {/* Very faint structural dot grid for subtle enterprise depth */}
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: 'radial-gradient(#cbd5e1 0.75px, transparent 0.75px)',
          backgroundSize: '24px 24px',
        }}
      />
    </div>
  );
};

export default RoleBackground;
