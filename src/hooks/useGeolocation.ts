import { useState, useEffect } from 'react';
import { Geolocation, Position } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import { useToast } from '@/hooks/use-toast';

export function useGeolocation() {
  const [position, setPosition] = useState<Position | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [isNative, setIsNative] = useState<boolean>(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform());
  }, []);

  const checkPermissions = async () => {
    try {
      const permission = await Geolocation.checkPermissions();
      setHasPermission(permission.location === 'granted');
      return permission.location === 'granted';
    } catch (err) {
      console.error('Error checking geolocation permissions:', err);
      return false;
    }
  };

  const requestPermissions = async () => {
    if (!isNative) {
      // En web, intentar usar la API de geolocalización del navegador
      try {
        await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });
        setHasPermission(true);
        return true;
      } catch (err) {
        toast({
          title: "Permiso denegado",
          description: "El navegador no permite acceder a la ubicación",
          variant: "destructive"
        });
        return false;
      }
    }
    
    try {
      const permission = await Geolocation.requestPermissions();
      const granted = permission.location === 'granted';
      setHasPermission(granted);
      
      if (!granted) {
        toast({
          title: "Permiso denegado",
          description: "No se puede acceder a la ubicación sin permisos",
          variant: "destructive"
        });
      }
      
      return granted;
    } catch (err) {
      setError('Error al solicitar permisos de ubicación');
      toast({
        title: "Error",
        description: "No se pudieron solicitar los permisos de ubicación",
        variant: "destructive"
      });
      return false;
    }
  };

  const getCurrentPosition = async () => {
    try {
      const hasPerms = hasPermission || await requestPermissions();
      if (!hasPerms) return null;

      const position = await Geolocation.getCurrentPosition();
      setPosition(position);
      setError(null);
      return position;
    } catch (err) {
      const errorMsg = 'No se pudo obtener la ubicación';
      setError(errorMsg);
      toast({
        title: "Error de ubicación",
        description: errorMsg,
        variant: "destructive"
      });
      return null;
    }
  };

  useEffect(() => {
    checkPermissions();
  }, []);

  return {
    position,
    error,
    hasPermission,
    isNative,
    checkPermissions,
    requestPermissions,
    getCurrentPosition
  };
}
