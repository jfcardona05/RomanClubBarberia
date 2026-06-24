import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './routes/ProtectedRoute';

// Público
import PublicLayout from './layouts/PublicLayout';
import HomePage from './pages/public/HomePage';
import BookingPage from './pages/public/BookingPage';
import PagoPage from './pages/public/PagoPage';

// Admin
import LoginPage from './pages/admin/LoginPage';
import AdminLayout from './layouts/AdminLayout';
import DashboardPage from './pages/admin/DashboardPage';
import AppointmentsPage from './pages/admin/AppointmentsPage';
import ClientsPage from './pages/admin/ClientsPage';
import ServicesPage from './pages/admin/ServicesPage';
import EmployeesPage from './pages/admin/EmployeesPage';
import GalleryPage from './pages/admin/GalleryPage';
import InventoryPage from './pages/admin/InventoryPage';
import ReportsPage from './pages/admin/ReportsPage';
import ReceiptPage from './pages/admin/ReceiptPage';
import WhatsappPage from './pages/admin/WhatsappPage';

export default function App() {
  return (
    <Routes>
      {/* ---- Landing pública ---- */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
      </Route>

      {/* ---- Reserva de citas (página dedicada) ---- */}
      <Route path="/reservar" element={<BookingPage />} />
      <Route path="/pago" element={<PagoPage />} />

      {/* ---- Login ---- */}
      <Route path="/admin/login" element={<LoginPage />} />

      {/* ---- Panel administrativo ---- */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="citas" element={<AppointmentsPage />} />
        <Route path="clientes" element={<ClientsPage />} />
        <Route path="reportes" element={<ReportsPage />} />
        <Route path="recibo" element={<ReceiptPage />} />
        {/* Solo ADMIN */}
        <Route path="servicios" element={<ProtectedRoute requireAdmin><ServicesPage /></ProtectedRoute>} />
        <Route path="empleados" element={<ProtectedRoute requireAdmin><EmployeesPage /></ProtectedRoute>} />
        <Route path="galeria" element={<ProtectedRoute requireAdmin><GalleryPage /></ProtectedRoute>} />
        <Route path="whatsapp" element={<ProtectedRoute requireAdmin><WhatsappPage /></ProtectedRoute>} />
        <Route path="inventario" element={<InventoryPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
