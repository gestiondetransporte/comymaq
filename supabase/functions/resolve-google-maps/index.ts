import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AddressResult {
  direccion: string;
  municipio: string;
  estado: string;
  coordenadas: string;
  success: boolean;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mapsUrl } = await req.json();

    if (!mapsUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL de Google Maps requerida' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Resolve short URL to get final URL with coordinates
    let finalUrl = mapsUrl;
    let lat: number | null = null;
    let lng: number | null = null;

    // If it's a short URL, we need to follow redirects
    if (mapsUrl.includes('maps.app.goo.gl') || mapsUrl.includes('goo.gl')) {
      try {
        const response = await fetch(mapsUrl, { redirect: 'follow' });
        finalUrl = response.url;
      } catch (e) {
        console.log('Error following redirect:', e);
      }
    }

    // Extract coordinates from various Google Maps URL formats
    // Format 1: @lat,lng,zoom (e.g., @25.7506574,-100.3697832,17z)
    const atMatch = finalUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atMatch) {
      lat = parseFloat(atMatch[1]);
      lng = parseFloat(atMatch[2]);
    }

    // Format 2: ?q=lat,lng
    if (!lat || !lng) {
      const qMatch = finalUrl.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (qMatch) {
        lat = parseFloat(qMatch[1]);
        lng = parseFloat(qMatch[2]);
      }
    }

    // Format 3: /place/lat,lng
    if (!lat || !lng) {
      const placeMatch = finalUrl.match(/\/place\/(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (placeMatch) {
        lat = parseFloat(placeMatch[1]);
        lng = parseFloat(placeMatch[2]);
      }
    }

    // Format 4: ll=lat,lng
    if (!lat || !lng) {
      const llMatch = finalUrl.match(/ll=(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (llMatch) {
        lat = parseFloat(llMatch[1]);
        lng = parseFloat(llMatch[2]);
      }
    }

    if (!lat || !lng) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No se pudieron extraer las coordenadas de la URL. Intenta copiar la URL completa desde Google Maps.',
          debug: { finalUrl }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Use Nominatim (OpenStreetMap) for reverse geocoding (free, no API key required)
    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=es`;
    
    const geoResponse = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'ComyMaq-RentalSystem/1.0'
      }
    });

    if (!geoResponse.ok) {
      return new Response(
        JSON.stringify({ 
          success: true,
          direccion: '',
          municipio: '',
          estado: '',
          coordenadas: `${lat}, ${lng}`,
          error: 'No se pudo obtener la dirección, pero se guardaron las coordenadas'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geoData = await geoResponse.json();
    const address = geoData.address || {};

    // Build address parts
    const addressParts: string[] = [];
    
    // Street address
    if (address.road) {
      let street = address.road;
      if (address.house_number) {
        street += ` ${address.house_number}`;
      }
      addressParts.push(street);
    }
    
    // Neighborhood/suburb
    if (address.suburb || address.neighbourhood || address.residential) {
      addressParts.push(address.suburb || address.neighbourhood || address.residential);
    }

    // Municipality (can be city, town, municipality, etc.)
    const municipio = address.city || address.town || address.municipality || address.county || address.village || '';
    
    // State
    const estado = address.state || '';

    // Full address
    const direccion = addressParts.join(', ');

    const result: AddressResult = {
      success: true,
      direccion,
      municipio,
      estado,
      coordenadas: `${lat}, ${lng}`,
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Error interno del servidor' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
