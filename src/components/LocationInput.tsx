import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from './ui/dialog';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { MapPin, Navigation, History, Map as MapIcon, Loader2, AlertCircle } from 'lucide-react';
import { MapPicker } from './MapPicker';

interface LocationSelection {
  displayName: string;
  address: string;
  latitude?: number;
  longitude?: number;
  source: 'history' | 'geocode' | 'manual';
}

interface LocationInputProps {
  value: LocationSelection | string | null;
  onChange: (location: LocationSelection) => void;
  flightHistory?: Array<{ location: string; locationAddressDetail?: string; locationLatitude?: number; locationLongitude?: number }>;
}

interface GeolocationPosition {
  coords: {
    latitude: number;
    longitude: number;
  };
}

export function LocationInput({ value, onChange, flightHistory = [] }: LocationInputProps) {
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);

  // Normalize value to LocationSelection
  const currentValue: LocationSelection | null = typeof value === 'string' 
    ? value ? { displayName: value, address: value, source: 'manual' as const } : null
    : value;

  // Extract unique locations from flight history
  const uniqueLocations = Array.from(
    new Map(
      flightHistory
        .filter(flight => flight.location && flight.location.trim() !== '')
        .map(flight => [
          flight.location,
          {
            displayName: flight.location, // 历史记录中显示简短名称
            address: flight.location, // 完整地址
            latitude: flight.locationLatitude,
            longitude: flight.locationLongitude,
            source: 'history' as const
          }
        ])
    ).values()
  );

  const getCurrentLocation = async () => {
    setIsGettingLocation(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError('お使いのブラウザは位置情報をサポートしていません');
      setIsGettingLocation(false);
      return;
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            console.log('Geolocation success:', pos);
            resolve(pos);
          },
          (err) => {
            console.error('Geolocation error details:', {
              code: err.code,
              message: err.message,
              timestamp: new Date().toISOString()
            });
            reject(err);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000 // 5 minutes
          }
        );
      });

      const { latitude, longitude } = position.coords;
      
      try {
        // Reverse geocoding to get detailed address
        const addressInfo = await reverseGeocode(latitude, longitude);
        onChange({
          displayName: addressInfo.address, // 使用详细地址作为显示名称
          address: addressInfo.address,
          latitude,
          longitude,
          source: 'geocode'
        });
      } catch (geocodeError) {
        console.error('Reverse geocoding error:', geocodeError);
        // Use basic coordinates if geocoding fails
        const basicLocation = `緯度: ${latitude.toFixed(4)}, 経度: ${longitude.toFixed(4)}`;
        onChange({
          displayName: basicLocation,
          address: basicLocation,
          latitude,
          longitude,
          source: 'geocode'
        });
      }
      
    } catch (error: any) {
      console.error('Geolocation error:', error);
      let errorMessage = '位置情報の取得中にエラーが発生しました。';
      
      if (error && typeof error.code === 'number') {
        switch (error.code) {
          case 1: // PERMISSION_DENIED
            errorMessage = '位置情報の利用が拒否されました。ブラウザの設定を確認してください。';
            break;
          case 2: // POSITION_UNAVAILABLE
            errorMessage = '位置情報を取得できませんでした。';
            break;
          case 3: // TIMEOUT
            errorMessage = '位置情報の取得がタイムアウトしました。';
            break;
          default:
            errorMessage = '位置情報の取得中にエラーが発生しました。';
        }
      } else if (error && error.message) {
        errorMessage = `位置情報エラー: ${error.message}`;
      } else if (error && error.toString) {
        errorMessage = `位置情報エラー: ${error.toString()}`;
      }
      
      setLocationError(errorMessage);
    } finally {
      setIsGettingLocation(false);
    }
  };

  const reverseGeocode = async (lat: number, lng: number): Promise<{ displayName: string; address: string }> => {
    // Try using OpenStreetMap Nominatim API for reverse geocoding
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=ja`,
        {
          headers: {
            'User-Agent': 'DroneFlightRecordApp/1.0'
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        const address = data.address;
        
        // Build detailed Japanese address
        const parts = [];
        if (address.prefecture || address.state) parts.push(address.prefecture || address.state);
        if (address.city || address.town) parts.push(address.city || address.town);
        if (address.suburb) parts.push(address.suburb);
        if (address.neighbourhood) parts.push(address.neighbourhood);
        if (address.quarter) parts.push(address.quarter);
        if (address.road) parts.push(address.road);
        if (address.house_number) parts.push(address.house_number);
        
        const detailedAddress = parts.length > 0 ? parts.join('') : data.display_name;
        const displayName = parts.slice(0, 2).join('') || data.display_name.split(',')[0];
        
        return {
          displayName,
          address: detailedAddress
        };
      }
    } catch (error) {
      console.error('OpenStreetMap geocoding error:', error);
    }
    
    // Fallback to simple prefecture approximation
    const prefectures = [
      { name: '東京都', lat: 35.6762, lng: 139.6503 },
      { name: '神奈川県', lat: 35.4478, lng: 139.6425 },
      { name: '千葉県', lat: 35.6074, lng: 140.1065 },
      { name: '埼玉県', lat: 35.8617, lng: 139.6455 },
      { name: '大阪府', lat: 34.6937, lng: 135.5023 },
      { name: '京都府', lat: 35.0116, lng: 135.7681 },
      { name: '愛知県', lat: 35.1802, lng: 136.9066 },
      { name: '兵庫県', lat: 34.6913, lng: 135.1830 },
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

    const fallbackAddress = `${closestPrefecture.name}（緯度: ${lat.toFixed(4)}, 経度: ${lng.toFixed(4)}）`;
    return {
      displayName: closestPrefecture.name,
      address: fallbackAddress
    };
  };

  const handleMapLocationSelect = async (location: string, lat: number, lng: number) => {
    try {
      const addressInfo = await reverseGeocode(lat, lng);
      onChange({
        displayName: addressInfo.address, // 使用详细地址作为显示名称
        address: addressInfo.address,
        latitude: lat,
        longitude: lng,
        source: 'geocode'
      });
    } catch (error) {
      onChange({
        displayName: location,
        address: location,
        latitude: lat,
        longitude: lng,
        source: 'manual'
      });
    }
    setMapDialogOpen(false);
  };

  const handleHistorySelect = (selection: LocationSelection) => {
    onChange(selection);
    setHistoryDialogOpen(false);
  };

  const handleManualInput = (inputValue: string) => {
    onChange({
      displayName: inputValue,
      address: inputValue,
      source: 'manual'
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Input
          placeholder="点検・離陸場所を入力または選択してください"
          value={currentValue?.address || ''}
          onChange={(e) => handleManualInput(e.target.value)}
          className="flex-1"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-2">
        {/* Current Location */}
        <Button
          type="button"
          variant="outline"
          onClick={getCurrentLocation}
          disabled={isGettingLocation}
          className="flex items-center justify-center gap-2 h-14 text-base md:h-10 md:text-sm"
        >
          {isGettingLocation ? (
            <Loader2 className="h-5 w-5 animate-spin md:h-4 md:w-4" />
          ) : (
            <Navigation className="h-5 w-5 md:h-4 md:w-4" />
          )}
          現在地を取得
        </Button>

        {/* Map Selection */}
        <Button
          type="button"
          variant="outline"
          onClick={() => setMapDialogOpen(true)}
          className="flex items-center justify-center gap-2 h-14 text-base md:h-10 md:text-sm"
        >
          <MapIcon className="h-5 w-5 md:h-4 md:w-4" />
          地図から選択
        </Button>
        
        <MapPicker
          open={mapDialogOpen}
          onOpenChange={setMapDialogOpen}
          onLocationSelect={handleMapLocationSelect}
        />

        {/* History Selection */}
        <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="flex items-center justify-center gap-2 h-14 text-base md:h-10 md:text-sm"
              disabled={uniqueLocations.length === 0}
            >
              <History className="h-5 w-5 md:h-4 md:w-4" />
              履歴から選択
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>過去の飛行場所から選択</DialogTitle>
              <DialogDescription>
                過去に飛行した場所から選択できます
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {uniqueLocations.length === 0 ? (
                <div className="text-center py-8">
                  <History className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    過去の飛行記録がありません
                  </p>
                </div>
              ) : (
                <>
                  <div className="text-sm text-muted-foreground">
                    {uniqueLocations.length}件の場所が利用可能です
                  </div>
                  
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {uniqueLocations.map((location) => (
                      <Card 
                        key={location.displayName} 
                        className="cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => handleHistorySelect(location)}
                      >
                        <CardContent className="p-4 md:p-3">
                          <div className="flex items-center gap-3 md:gap-2">
                            <MapPin className="h-5 w-5 text-gray-400 flex-shrink-0 md:h-4 md:w-4" />
                            <div className="flex-1">
                              <div className="text-base md:text-sm">{location.displayName}</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Status Messages */}
      {locationError && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg md:p-3 md:gap-2">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 md:h-4 md:w-4" />
          <span className="text-base text-red-700 md:text-sm">{locationError}</span>
        </div>
      )}

      <p className="text-sm text-muted-foreground md:text-xs">
        ※ 正確な住所または施設名を入力してください。地図選択で詳細な住所とGPS座標を自動取得できます。
      </p>
    </div>
  );
}