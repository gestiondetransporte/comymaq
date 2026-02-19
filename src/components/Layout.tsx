import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, Menu, Search, FileText, Truck, Wrench, Package, List, LayoutDashboard, Shield, Settings, FileBarChart, ClipboardCheck, Home, Users, Building2, Calculator, History, Boxes } from "lucide-react";
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
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menuCategories = {
    operaciones: [
      { path: "/", label: "Buscador", icon: Search },
      { path: "/inventario", label: "Inventario", icon: List },
      { path: "/inventario-fisico", label: "Inventario Físico", icon: Boxes },
      { path: "/entradas-salidas", label: "Entradas/Salidas", icon: Truck },
      { path: "/inspeccion-taller", label: "Inspección Taller", icon: ClipboardCheck },
    ],
    gestion: [
      { path: "/mantenimiento", label: "Mantenimiento", icon: Wrench },
      { path: "/cotizaciones", label: "Cotizaciones", icon: Calculator },
      { path: "/configuracion", label: "Configuración", icon: Settings },
    ],
    administracion: [
      { path: "/contratos", label: "Contratos", icon: FileText },
      { path: "/recolecciones", label: "Recolecciones", icon: Truck },
      { path: "/clientes", label: "Clientes", icon: Users },
      { path: "/almacenes", label: "Almacenes", icon: Building2 },
      { path: "/equipos-log", label: "Historial Equipos", icon: History },
      { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { path: "/reporte-inventario", label: "Reporte Inventario", icon: FileBarChart },
      { path: "/admin/usuarios", label: "Usuarios", icon: Shield },
    ],
  };

  const allNavItems = [
    ...menuCategories.operaciones,
    ...menuCategories.gestion,
    ...(isAdmin ? menuCategories.administracion : []),
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  const NavLinks = () => (
    <>
      <div className="mb-2">
        <p className="px-4 text-xs font-semibold text-muted-foreground mb-2">
          OPERACIONES
        </p>
        {menuCategories.operaciones.map((item) => {
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
      </div>

      <div className="my-2 border-t" />

      <div className="mb-2">
        <p className="px-4 text-xs font-semibold text-muted-foreground mb-2">
          GESTIÓN
        </p>
        {menuCategories.gestion.map((item) => {
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
      </div>

      {isAdmin && (
        <>
          <div className="my-2 border-t" />
          <div className="mb-2">
            <p className="px-4 text-xs font-semibold text-muted-foreground mb-2">
              ADMINISTRACIÓN
            </p>
            {menuCategories.administracion.map((item) => {
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
          </div>
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
            <Button
              variant={location.pathname === "/" ? "default" : "ghost"}
              onClick={() => navigate("/")}
              size="sm"
            >
              <Home className="mr-2 h-4 w-4" />
              Inicio
            </Button>

            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger>Operaciones</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2">
                      {menuCategories.operaciones.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                          <li key={item.path}>
                            <NavigationMenuLink asChild>
                              <button
                                onClick={() => navigate(item.path)}
                                className={`block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground w-full text-left ${
                                  isActive ? "bg-accent" : ""
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <Icon className="h-4 w-4" />
                                  <div className="text-sm font-medium leading-none">{item.label}</div>
                                </div>
                              </button>
                            </NavigationMenuLink>
                          </li>
                        );
                      })}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <NavigationMenuTrigger>Gestión</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[400px] gap-3 p-4">
                      {menuCategories.gestion.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                          <li key={item.path}>
                            <NavigationMenuLink asChild>
                              <button
                                onClick={() => navigate(item.path)}
                                className={`block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground w-full text-left ${
                                  isActive ? "bg-accent" : ""
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <Icon className="h-4 w-4" />
                                  <div className="text-sm font-medium leading-none">{item.label}</div>
                                </div>
                              </button>
                            </NavigationMenuLink>
                          </li>
                        );
                      })}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                {isAdmin && (
                  <NavigationMenuItem>
                    <NavigationMenuTrigger>Administración</NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2">
                        {menuCategories.administracion.map((item) => {
                          const Icon = item.icon;
                          const isActive = location.pathname === item.path;
                          return (
                            <li key={item.path}>
                              <NavigationMenuLink asChild>
                                <button
                                  onClick={() => navigate(item.path)}
                                  className={`block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground w-full text-left ${
                                    isActive ? "bg-accent" : ""
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <Icon className="h-4 w-4" />
                                    <div className="text-sm font-medium leading-none">{item.label}</div>
                                  </div>
                                </button>
                              </NavigationMenuLink>
                            </li>
                          );
                        })}
                      </ul>
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                )}
              </NavigationMenuList>
            </NavigationMenu>
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
