import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Equipos from "./pages/Equipos";
import Contratos from "./pages/Contratos";
import EntradasSalidas from "./pages/EntradasSalidas";
import Mantenimiento from "./pages/Mantenimiento";
import Almacenes from "./pages/Almacenes";
import Inventario from "./pages/Inventario";
import AdminUsuarios from "./pages/AdminUsuarios";
import Configuracion from "./pages/Configuracion";
import Clientes from "./pages/Clientes";
import ReporteInventario from "./pages/ReporteInventario";
import NotFound from "./pages/NotFound";
import Layout from "@/components/Layout";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { InstallPWAPrompt } from "@/components/InstallPWAPrompt";
import { AdminRoute } from "@/components/AdminRoute";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Cargando...</div>;
  }

  if (!user) {
    return <Navigate to="/auth" />;
  }

  return <Layout>{children}</Layout>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Index />
          </ProtectedRoute>
        }
      />
      <Route
        path="/equipo/:id"
        element={
          <ProtectedRoute>
            <Equipos />
          </ProtectedRoute>
        }
      />
      <Route
        path="/contratos"
        element={
          <AdminRoute>
            <Contratos />
          </AdminRoute>
        }
      />
      <Route
        path="/entradas-salidas"
        element={
          <ProtectedRoute>
            <EntradasSalidas />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mantenimiento"
        element={
          <ProtectedRoute>
            <Mantenimiento />
          </ProtectedRoute>
        }
      />
      <Route
        path="/almacenes"
        element={
          <AdminRoute>
            <Almacenes />
          </AdminRoute>
        }
      />
      <Route
        path="/inventario"
        element={
          <ProtectedRoute>
            <Inventario />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <AdminRoute>
            <Dashboard />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/usuarios"
        element={
          <AdminRoute>
            <AdminUsuarios />
          </AdminRoute>
        }
      />
      <Route
        path="/configuracion"
        element={
          <ProtectedRoute>
            <Configuracion />
          </ProtectedRoute>
        }
      />
      <Route
        path="/clientes"
        element={
          <AdminRoute>
            <Clientes />
          </AdminRoute>
        }
      />
      <Route
        path="/reporte-inventario"
        element={
          <AdminRoute>
            <ReporteInventario />
          </AdminRoute>
        }
      />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <OfflineIndicator />
            <InstallPWAPrompt />
            <AppRoutes />
          </TooltipProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
