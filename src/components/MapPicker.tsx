import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { MapPin, Locate } from 'lucide-react';

// Fix for default marker icons in Leaflet with webpack/vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface MapPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLocationSelect: (location: string, lat: number, lng: number) => void;
}

interface LocationClickHandlerProps {
  onClick: (lat: number, lng: number) => void;
}

function LocationClickHandler({ onClick }: LocationClickHandlerProps) {
  useMapEvents({
    click: (e) => {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
}

export function MapPicker({ open, onOpenChange, onLocationSelect }: MapPickerProps) {
  // Default to Tokyo
  const [position, setPosition] = useState<[number, number]>([35.6762, 139.6503]);
  const [selectedPosition, setSelectedPosition] = useState<[number, number] | null>(null);
  const [locationName, setLocationName] = useState<string>('');
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  const handleMapClick = async (lat: number, lng: number) => {
    setSelectedPosition([lat, lng]);
    setIsLoadingLocation(true);
    
    try {
      const name = await reverseGeocode(lat, lng);
      setLocationName(name);
    } catch (error) {
      console.error('Geocoding error:', error);
      setLocationName(`緯度: ${lat.toFixed(4)}, 経度: ${lng.toFixed(4)}`);
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newPos: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setPosition(newPos);
          handleMapClick(pos.coords.latitude, pos.coords.longitude);
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('現在地を取得できませんでした');
        }
      );
    }
  };

  const handleConfirm = () => {
    if (selectedPosition && locationName) {
      onLocationSelect(locationName, selectedPosition[0], selectedPosition[1]);
      onOpenChange(false);
    }
  };

  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    // Using Nominatim (OpenStreetMap) for free reverse geocoding
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ja`
      );
      const data = await response.json();
      
      if (data && data.display_name) {
        return data.display_name;
      }
    } catch (error) {
      console.error('Nominatim geocoding error:', error);
    }
    
    // Fallback to simple prefecture detection
    return fallbackGeocode(lat, lng);
  };

  const fallbackGeocode = (lat: number, lng: number): string => {
    const prefectures = [
      { name: '東京都', lat: 35.6762, lng: 139.6503 },
      { name: '神奈川県', lat: 35.4478, lng: 139.6425 },
      { name: '千葉県', lat: 35.6074, lng: 140.1065 },
      { name: '埼玉県', lat: 35.8617, lng: 139.6455 },
      { name: '大阪府', lat: 34.6937, lng: 135.5023 },
      { name: '京都府', lat: 35.0116, lng: 135.7681 },
      { name: '愛知県', lat: 35.1802, lng: 136.9066 },
      { name: '兵庫県', lat: 34.6913, lng: 135.1830 },
      { name: '北海道', lat: 43.0642, lng: 141.3469 },
      { name: '福岡県', lat: 33.6064, lng: 130.4181 },
    ];

    let closestPrefecture = prefectures[0];
    let minDistance = Number.MAX_VALUE;

    prefectures.forEach(prefecture => {
      const distance = Math.sqrt(
        Math.pow(lat - prefecture.lat, 2) + Math.pow(lng - prefecture.lng, 2)
      );
      if (distance < minDistance) {
        minDistance = distance;
        closestPrefecture = prefecture;
      }
    });

    return `${closestPrefecture.name}（緯度: ${lat.toFixed(4)}, 経度: ${lng.toFixed(4)}）`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-xl md:text-lg">地図から場所を選択</DialogTitle>
          <DialogDescription className="text-base md:text-sm">
            地図をクリックして飛行場所を選択してください
          </DialogDescription>
        </DialogHeader>
        
        <div className="px-6">
          <div className="relative h-[60vh] w-full rounded-xl overflow-hidden border-2 border-gray-200">
            <MapContainer
              center={position}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
              zoomControl={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <LocationClickHandler onClick={handleMapClick} />
              <RecenterMap lat={position[0]} lng={position[1]} />
              {selectedPosition && <Marker position={selectedPosition} />}
            </MapContainer>
            
            {/* Current Location Button */}
            <div className="absolute bottom-4 right-4 z-[1000]">
              <Button
                onClick={handleGetCurrentLocation}
                className="shadow-lg bg-white hover:bg-gray-100 text-gray-700 h-12 w-12 p-0 rounded-full md:h-10 md:w-10"
                variant="outline"
              >
                <Locate className="h-6 w-6 md:h-5 md:w-5" />
              </Button>
            </div>
          </div>

          {/* Selected Location Info */}
          {selectedPosition && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-start gap-3">
                <MapPin className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5 md:h-5 md:w-5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-blue-600 font-medium mb-1">選択された場所</p>
                  {isLoadingLocation ? (
                    <p className="text-base text-gray-600 md:text-sm">読み込み中...</p>
                  ) : (
                    <p className="text-base text-gray-800 break-words md:text-sm">{locationName}</p>
                  )}
                  <p className="text-sm text-gray-500 mt-1 md:text-xs">
                    緯度: {selectedPosition[0].toFixed(6)}, 経度: {selectedPosition[1].toFixed(6)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 p-6 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 h-14 text-base md:h-10 md:text-sm"
            size="lg"
          >
            キャンセル
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedPosition || isLoadingLocation}
            className="flex-1 h-14 text-base md:h-10 md:text-sm"
            size="lg"
          >
            この場所を選択
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

