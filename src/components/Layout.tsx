import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, Menu, Search, FileText, Truck, Wrench, Package, List, LayoutDashboard, Shield, Settings, FileBarChart, ChevronDown, ClipboardCheck } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import comymaqLogo from "@/assets/comymaq-logo.png";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { SyncButton } from "@/components/SyncButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { path: "/", label: "Buscador", icon: Search },
    { path: "/inventario", label: "Inventario", icon: List },
    { path: "/entradas-salidas", label: "Entradas/Salidas", icon: Truck },
    { path: "/inspeccion-taller", label: "Inspección Taller", icon: ClipboardCheck },
    { path: "/mantenimiento", label: "Mantenimiento", icon: Wrench },
    { path: "/configuracion", label: "Configuración", icon: Settings },
  ];

  const adminNavItems = [
    { path: "/contratos", label: "Contratos", icon: FileText },
    { path: "/clientes", label: "Clientes", icon: Shield },
    { path: "/almacenes", label: "Almacenes", icon: Package },
    { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "/reporte-inventario", label: "Reporte Inventario", icon: FileBarChart },
    { path: "/admin/usuarios", label: "Usuarios", icon: Shield },
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  const NavLinks = () => (
    <>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;
        return (
          <Button
            key={item.path}
            variant={isActive ? "default" : "ghost"}
            onClick={() => handleNavigation(item.path)}
            className="w-full justify-start"
          >
            <Icon className="mr-2 h-4 w-4" />
            {item.label}
          </Button>
        );
      })}
      {isAdmin && (
        <>
          <div className="my-2 border-t" />
          <p className="px-4 text-xs font-semibold text-muted-foreground mb-2">
            ADMINISTRACIÓN
          </p>
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Button
                key={item.path}
                variant={isActive ? "default" : "ghost"}
                onClick={() => handleNavigation(item.path)}
                className="w-full justify-start"
              >
                <Icon className="mr-2 h-4 w-4" />
                {item.label}
              </Button>
            );
          })}
        </>
      )}
    </>
  );

  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 w-full border-b bg-card shadow-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64">
                <div className="flex flex-col gap-4 mt-8">
                  <NavLinks />
                </div>
              </SheetContent>
            </Sheet>
            
            <img
              src={comymaqLogo}
              alt="COMYMAQ"
              className="h-10 object-contain cursor-pointer"
              onClick={() => navigate("/")}
            />
          </div>

          <div className="hidden lg:flex items-center gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Button
                  key={item.path}
                  variant={isActive ? "default" : "ghost"}
                  onClick={() => navigate(item.path)}
                  size="sm"
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {item.label}
                </Button>
              );
            })}
            {isAdmin && (
              <>
                <div className="h-6 w-px bg-border mx-2" />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Shield className="mr-2 h-4 w-4" />
                      Administración
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Opciones de Administración</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {adminNavItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.path;
                      return (
                        <DropdownMenuItem
                          key={item.path}
                          onClick={() => navigate(item.path)}
                          className={isActive ? "bg-muted" : ""}
                        >
                          <Icon className="mr-2 h-4 w-4" />
                          {item.label}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <SyncButton />
            <span className="text-sm text-muted-foreground hidden sm:block">
              {user.email}
            </span>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-4 lg:p-8">
        {children}
      </main>
    </div>
  );
}
