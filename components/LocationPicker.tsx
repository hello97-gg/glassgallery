
import React, { useEffect, useRef, useState } from 'react';
import Button from './Button';
import Spinner from './Spinner';

interface LocationPickerProps {
  onSelect: (locationName: string) => void;
  onClose: () => void;
}

declare global {
  interface Window {
    L: any;
  }
}

const LocationPicker: React.FC<LocationPickerProps> = ({ onSelect, onClose }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

  useEffect(() => {
    if (mapContainerRef.current && !mapInstanceRef.current && window.L) {
      const L = window.L;
      
      // Default view (World)
      const map = L.map(mapContainerRef.current).setView([20, 0], 2);
      mapInstanceRef.current = map;

      // Use CartoDB Dark Matter tiles for dark mode aesthetic
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(map);

      // Locate user on start if permitted
      map.locate({ setView: true, maxZoom: 10 });

      map.on('click', async (e: any) => {
        const { lat, lng } = e.latlng;
        
        // Update marker
        if (markerRef.current) {
            markerRef.current.setLatLng(e.latlng);
        } else {
            markerRef.current = L.marker(e.latlng).addTo(map);
        }

        setIsLoading(true);
        try {
            // Reverse Geocoding via Nominatim (OpenStreetMap)
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
            const data = await response.json();
            
            let locationName = "";
            const addr = data.address;
            
            if (addr) {
                const city = addr.city || addr.town || addr.village || addr.county;
                const country = addr.country;
                
                if (city && country) {
                    locationName = `${city}, ${country}`;
                } else if (country) {
                    locationName = country;
                } else {
                    locationName = data.display_name ? data.display_name.split(',')[0] : "Unknown Location";
                }
            }

            setSelectedLocation(locationName);
            
            // Add a popup to the marker
            markerRef.current.bindPopup(`Selected: ${locationName}`).openPopup();

        } catch (error) {
            console.error("Geocoding failed", error);
            setSelectedLocation("Unknown Location");
        } finally {
            setIsLoading(false);
        }
      });
    }

    // Cleanup
    return () => {
        if (mapInstanceRef.current) {
            mapInstanceRef.current.remove();
            mapInstanceRef.current = null;
        }
    };
  }, []);

  const handleConfirm = () => {
      if (selectedLocation) {
          onSelect(selectedLocation);
          onClose();
      }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-3xl h-[80vh] flex flex-col overflow-hidden relative">
        
        {/* Header */}
        <div className="p-4 border-b border-border flex justify-between items-center bg-surface z-10">
            <h3 className="text-lg font-bold text-primary">Pick a Location</h3>
            <button onClick={onClose} className="text-secondary hover:text-primary text-2xl">&times;</button>
        </div>

        {/* Map Container */}
        <div className="flex-grow relative bg-background">
            <div ref={mapContainerRef} className="absolute inset-0 z-0" />
            
            {/* Overlay controls */}
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-[400] flex flex-col items-center gap-3 w-full px-4">
                 {isLoading && (
                     <div className="bg-black/70 backdrop-blur-md text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-lg">
                         <Spinner />
                         <span className="text-sm">Finding location name...</span>
                     </div>
                 )}
                 
                 {selectedLocation && !isLoading && (
                     <div className="bg-surface/90 backdrop-blur-md border border-border p-4 rounded-xl shadow-xl flex flex-col md:flex-row items-center gap-4 w-full md:w-auto max-w-lg animate-fade-in">
                         <div className="text-center md:text-left">
                             <p className="text-xs text-secondary uppercase font-semibold tracking-wider">Selected</p>
                             <p className="text-primary font-bold text-lg">{selectedLocation}</p>
                         </div>
                         <Button onClick={handleConfirm} className="whitespace-nowrap">
                             Confirm Location
                         </Button>
                     </div>
                 )}
            </div>
            
            {!selectedLocation && !isLoading && (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[400] bg-black/60 text-white px-4 py-2 rounded-full pointer-events-none backdrop-blur-sm">
                    <p className="text-sm">Click anywhere on the map</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default LocationPicker;
