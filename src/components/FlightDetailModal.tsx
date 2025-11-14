import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Calendar, Clock, MapPin, User, Plane, Target, FileText, ShieldCheck } from 'lucide-react';

interface FlightLog {
  id: string;
  date: string;
  duration: number;
  location: string;
  droneModel: string;
  weather: string;
  purpose: string;
  notes: string;
  pilot: string;
  isTokuteiFlight?: boolean;
}

interface FlightDetailModalProps {
  flight: FlightLog | null;
  isOpen: boolean;
  onClose: () => void;
}

export function FlightDetailModal({ flight, isOpen, onClose }: FlightDetailModalProps) {
  if (!flight) return null;

  const getWeatherEmoji = (weather: string) => {
    switch (weather) {
      case '晴れ': return '☀️';
      case '曇り': return '☁️';
      case '雨': return '🌧️';
      case '雪': return '❄️';
      case '霧': return '🌫️';
      default: return '🌤️';
    }
  };

  const getPurposeBadgeColor = (purpose: string) => {
    switch (purpose) {
      case '趣味・娯楽': return 'bg-blue-100 text-blue-800';
      case '練習・訓練': return 'bg-green-100 text-green-800';
      case '撮影・映像制作': return 'bg-indigo-100 text-indigo-800';
      case '点検・調査': return 'bg-orange-100 text-orange-800';
      case '測量': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plane className="h-5 w-5" />
            フライト詳細
          </DialogTitle>
          <DialogDescription>
            フライトの詳細情報を確認できます。
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">飛行日</p>
                <p className="font-medium">
                  {new Date(flight.date).toLocaleDateString('ja-JP', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'long'
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">飛行時間</p>
                <p className="font-medium">{flight.duration}分</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">飛行場所</p>
                <p className="font-medium">{flight.location}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">操縦者</p>
                <p className="font-medium">{flight.pilot}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Equipment & Conditions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Plane className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">ドローン機種</p>
                <p className="font-medium">{flight.droneModel}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xl">{getWeatherEmoji(flight.weather)}</span>
              <div>
                <p className="text-sm text-gray-500">天気</p>
                <p className="font-medium">{flight.weather}</p>
              </div>
            </div>

            {flight.isTokuteiFlight && (
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-blue-500">特定飛行</p>
                  <p className="font-medium text-blue-700">カテゴリーⅡ・Ⅲ</p>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Purpose */}
          <div className="flex items-center gap-3">
            <Target className="h-5 w-5 text-gray-500" />
            <div>
              <p className="text-sm text-gray-500">飛行目的</p>
              <Badge className={getPurposeBadgeColor(flight.purpose)}>
                {flight.purpose}
              </Badge>
            </div>
          </div>

          {/* Notes */}
          {flight.notes && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-gray-500" />
                  <p className="text-sm text-gray-500">メモ・備考</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="whitespace-pre-wrap">{flight.notes}</p>
                </div>
              </div>
            </>
          )}

          {/* Flight Summary */}
          <Separator />
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">フライトサマリー</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-blue-700">フライトID:</span>
                <span className="ml-2 font-mono">{flight.id.slice(0, 8)}</span>
              </div>
              <div>
                <span className="text-blue-700">記録日時:</span>
                <span className="ml-2">{new Date(flight.date).toLocaleString('ja-JP')}</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}