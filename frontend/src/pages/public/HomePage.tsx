import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import Hero from '../../components/public/Hero';
import Team from '../../components/public/Team';
import Gallery from '../../components/public/Gallery';
import BookingCTA from '../../components/public/BookingCTA';
import Location from '../../components/public/Location';
import Faq from '../../components/public/Faq';
import { serviciosApi, galeriaApi, usuariosApi } from '../../services';
import type { ConfigSitio, Servicio, ImagenGaleria, Usuario } from '../../types';

export default function HomePage() {
  const config = useOutletContext<ConfigSitio>();
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [galeria, setGaleria] = useState<ImagenGaleria[]>([]);
  const [equipo, setEquipo] = useState<Usuario[]>([]);

  useEffect(() => {
    serviciosApi.publicos().then(setServicios).catch(() => {});
    galeriaApi.publicas().then(setGaleria).catch(() => {});
    usuariosApi.equipoPublic().then(setEquipo).catch(() => {});
  }, []);

  return (
    <>
      <Hero config={config} />
      <Team equipo={equipo} />
      <Gallery imagenes={galeria} />
      <BookingCTA servicios={servicios} config={config} />
      <Location config={config} />
      <Faq config={config} />
    </>
  );
}
