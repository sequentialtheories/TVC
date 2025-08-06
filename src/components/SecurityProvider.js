
import React, { useEffect } from 'react';

export const SecurityProvider = ({ children }) => {
  useEffect(() => {
    const cspMeta = document.createElement('meta');
    cspMeta.httpEquiv = 'Content-Security-Policy';
    cspMeta.content = `
      default-src 'self';
      script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://esm.sh;
      style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
      font-src 'self' https://fonts.gstatic.com;
      img-src 'self' data: https:;
      connect-src 'self' https://*.supabase.co wss://*.supabase.co https://waas.sequence.app https://polygon-mainnet.g.alchemy.com https://api.sequencetheory.com;
      frame-ancestors 'none';
      object-src 'none';
      base-uri 'self';
      form-action 'self';
      upgrade-insecure-requests;
    `.replace(/\s+/g, ' ').trim();
    
    document.head.appendChild(cspMeta);
    
    const frameMeta = document.createElement('meta');
    frameMeta.httpEquiv = 'X-Frame-Options';
    frameMeta.content = 'DENY';
    document.head.appendChild(frameMeta);
    
    const contentTypeMeta = document.createElement('meta');
    contentTypeMeta.httpEquiv = 'X-Content-Type-Options';
    contentTypeMeta.content = 'nosniff';
    document.head.appendChild(contentTypeMeta);
    
    return () => {
      if (cspMeta.parentNode) cspMeta.parentNode.removeChild(cspMeta);
      if (frameMeta.parentNode) frameMeta.parentNode.removeChild(frameMeta);
      if (contentTypeMeta.parentNode) contentTypeMeta.parentNode.removeChild(contentTypeMeta);
    };
  }, []);
  
  return <>{children}</>;
};
