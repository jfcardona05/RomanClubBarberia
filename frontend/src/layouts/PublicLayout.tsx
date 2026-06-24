import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/public/Navbar';
import Footer from '../components/public/Footer';
import { configApi } from '../services';
import type { ConfigSitio } from '../types';

export default function PublicLayout() {
  const [config, setConfig] = useState<ConfigSitio>({});

  useEffect(() => {
    configApi.publica().then(setConfig).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-ink">
      <Navbar />
      <main>
        {/* La landing recibe la config por contexto del Outlet */}
        <Outlet context={config} />
      </main>
      <Footer config={config} />
    </div>
  );
}
