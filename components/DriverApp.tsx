import React, { useState, useEffect, FC, useMemo, useRef } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { ICONS, allServices } from '../constants';
import { Booking, LatLngTuple } from '../types';
import { dbService, driverBackgroundService, apiService } from '../services/index';
import RequestCard from './RequestCard';
import { NavigationTopBar, BottomTripControls } from './ActiveTripView';

declare const L: any; // Using Leaflet from CDN

const DRIVER_HISTORY_KEY = 'driver_trip_history';

const isValidLatLngTuple = (coord: any): coord is LatLngTuple => {
    return Array.isArray(coord) && coord.length === 2 && typeof coord[0] === 'number' && typeof coord[1] === 'number';
};

// ===============================
// Side Menu Drawer
// ===============================
const DriverSideMenu: FC<{ isOpen: boolean; onClose: () => void; earnings: number }> = ({ isOpen, onClose, earnings }) => {
    const { t, language, setLanguage } = useLocalization();
    const { settings, updateSettings } = useSettings();
    const { logout } = useAuth();

    const isRtl = language === 'ar';

    // Helper for inline translations if keys are missing in global constants
    const tr = (en: string, ar: string) => language === 'ar' ? ar : en;

    // Dynamic Profile Data
    const driverProfile = {
        name: tr("Hamza Al-Maqbali", "حمزة المقبلي"),
        vehicle: tr("Toyota Camry", "تويوتا كامري"),
        plate: tr("1234 ABC", "١٢٣٤ أ ب ج"),
        verified: true,
        rating: 4.9
    };

    return (
        <div className={`fixed inset-0 z-[1000] transition-all duration-300 ease-in-out ${isOpen ? 'visible' : 'invisible delay-300'}`}>
            
            {/* Backdrop with blur */}
            <div 
                className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
                onClick={onClose}
            ></div>

            {/* Drawer Content */}
            <div className={`
                absolute top-0 bottom-0 w-[75%] max-w-xs bg-white dark:bg-gray-900 shadow-2xl overflow-y-auto transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] flex flex-col
                ${isRtl ? 'right-0' : 'left-0'}
                ${isOpen 
                    ? 'translate-x-0' 
                    : (isRtl ? 'translate-x-full' : '-translate-x-full')
                }
            `}>
                
                {/* 1. Profile Section */}
                <div className="p-6 bg-slate-900 text-white relative overflow-hidden shrink-0 text-center">
                    <div className={`absolute top-0 p-4 opacity-10 ${isRtl ? 'left-0' : 'right-0'}`}>
                        <ICONS.directions_car className="w-32 h-32" />
                    </div>
                    <div className="relative z-10 flex flex-col items-center">
                        <div className="w-20 h-20 rounded-full bg-slate-700 border-4 border-white shadow-md mb-3 overflow-hidden">
                             {/* Placeholder for user image */}
                             <div className="w-full h-full flex items-center justify-center bg-slate-600 text-2xl font-bold">
                                {driverProfile.name.charAt(0)}
                             </div>
                        </div>
                        <h2 className="text-xl font-bold">{driverProfile.name}</h2>
                        
                        <div className="flex items-center justify-center gap-1 mt-1 text-slate-300 text-sm">
                            {driverProfile.verified && <ICONS.check_circle className="w-4 h-4 text-blue-400" />}
                            <span>{tr("Verified", "موثق")}</span>
                             <span className="mx-1">•</span>
                            <span className="text-yellow-400">★ {driverProfile.rating}</span>
                        </div>

                        <div className="mt-4 bg-white/10 backdrop-blur-md rounded-lg p-2 w-full flex justify-between items-center px-4">
                            <div className="text-left rtl:text-right">
                                <p className="text-xs text-slate-400">{t('vehicle')}</p>
                                <p className="font-bold text-sm">{driverProfile.vehicle}</p>
                            </div>
                            <div className="text-right rtl:text-left">
                                <p className="text-xs text-slate-400">{t('licensePlate') || tr("Plate", "اللوحة")}</p>
                                <div className="bg-white text-slate-900 px-2 py-0.5 rounded font-mono text-xs font-bold">
                                    {driverProfile.plate}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Menu Items */}
                <div className="flex-1 py-2 divide-y divide-slate-100 dark:divide-gray-800">
                    
                    {/* 2. Wallet */}
                    <div className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-gray-800 cursor-pointer">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="p-2 bg-green-100 text-green-600 rounded-full">
                                <ICONS.money className="w-5 h-5" />
                            </div>
                            <div className="flex-1 text-left rtl:text-right">
                                <h3 className="font-bold text-slate-800 dark:text-white">{t('earnings')}</h3>
                                <p className="text-2xl font-black text-slate-900 dark:text-slate-200">${earnings.toFixed(2)}</p>
                            </div>
                        </div>
                        <div className="flex gap-2 mt-2">
                            <button className="flex-1 bg-slate-900 text-white text-xs py-2 rounded-lg font-bold">{tr("Withdraw", "سحب")}</button>
                            <button className="flex-1 bg-slate-100 text-slate-700 text-xs py-2 rounded-lg font-bold">{tr("History", "السجل")}</button>
                        </div>
                    </div>

                    {/* 3. Trips */}
                    <MenuItem icon="history" label={tr("Trip History", "سجل الرحلات")} subLabel={tr("View all past trips", "عرض كل الرحلات السابقة")} />

                    {/* 5. Documents */}
                    <MenuItem icon="inventory" label={t('documents')} subLabel={tr("License, Registration", "رخصة القيادة، الاستمارة")} />

                    {/* 6. Support */}
                    <MenuItem icon="message" label={tr("Support", "الدعم والمساعدة")} subLabel={tr("Report an issue", "الإبلاغ عن مشكلة")} />

                    {/* 4. Settings & 8. Language */}
                    <div className="px-4 py-4">
                        <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 tracking-wider text-left rtl:text-right">{t('settings')}</h4>
                        
                        {/* Language Switcher */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <ICONS.my_location className="w-5 h-5 text-slate-500" />
                                <span className="font-medium text-sm">{t('language')}</span>
                            </div>
                            <div className="flex bg-slate-100 rounded-lg p-1" dir="ltr">
                                <button 
                                    onClick={() => setLanguage('ar')}
                                    className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${language === 'ar' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}
                                >
                                    عربي
                                </button>
                                <button 
                                    onClick={() => setLanguage('en')}
                                    className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${language === 'en' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}
                                >
                                    En
                                </button>
                            </div>
                        </div>

                        {/* Dark Mode */}
                        <ToggleItem 
                            label={t('darkMode')} 
                            checked={settings.isDarkMode} 
                            onChange={(val) => updateSettings({ isDarkMode: val })} 
                            isRtl={isRtl}
                        />
                         {/* Map Type (Mock) */}
                        <ToggleItem label={tr("Satellite View", "صور القمر الصناعي")} checked={false} onChange={() => {}} isRtl={isRtl} />
                         {/* Vibration (Mock) */}
                        <ToggleItem label={tr("Vibration", "الاهتزاز عند الطلب")} checked={true} onChange={() => {}} isRtl={isRtl} />

                    </div>
                </div>

                {/* 7. Logout */}
                <div className="p-4 border-t border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 shrink-0">
                    <button 
                        onClick={logout}
                        className="w-full flex items-center justify-center gap-2 text-red-600 font-bold py-3 rounded-xl hover:bg-red-50 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg " className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                        {t('logout')}
                    </button>
                    <p className="text-center text-[10px] text-slate-400 mt-2">{tr("Version 2.2.0", "إصدار 2.2.0")}</p>
                </div>
            </div>
        </div>
    );
};

const MenuItem: FC<{ icon: keyof typeof ICONS; label: string; subLabel?: string }> = ({ icon, label, subLabel }) => {
    const Icon = ICONS[icon];
    return (
        <button className="w-full flex items-center gap-4 px-4 py-3 hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors text-left rtl:text-right">
            <div className="p-2 bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-slate-300 rounded-lg">
                <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1">
                <h3 className="font-semibold text-sm text-slate-800 dark:text-white">{label}</h3>
                {subLabel && <p className="text-xs text-slate-500">{subLabel}</p>}
            </div>
            <ICONS.chevron_down className="w-4 h-4 text-slate-400 rtl:rotate-90 ltr:-rotate-90" />
        </button>
    );
};

const ToggleItem: FC<{ label: string; checked: boolean; onChange: (val: boolean) => void, isRtl: boolean }> = ({ label, checked, onChange, isRtl }) => (
    <div className="flex items-center justify-between mb-3 last:mb-0">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
        <button 
            onClick={() => onChange(!checked)}
            className={`w-10 h-5 rounded-full relative transition-colors duration-300 ${checked ? 'bg-blue-600' : 'bg-slate-300'}`}
        >
            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-300 
                ${checked 
                    ? (isRtl ? '-translate-x-5' : 'translate-x-5') 
                    : 'translate-x-0'
                }
                ${isRtl ? 'right-1' : 'left-1'}
            `}></div>
        </button>
    </div>
);

// ===============================
// Uber Style Light Top Bar
// ===============================
const DriverTopBar: FC<{ isOnline: boolean; earnings: number; onMenuClick: () => void }> = ({ isOnline, earnings, onMenuClick }) => {
    const { t } = useLocalization();

    return (
        <div className="absolute top-4 left-4 right-4 z-[500] flex justify-between items-start pointer-events-none">

            {/* Menu Button - Enhanced Design */}
            <button 
                onClick={onMenuClick}
                className="pointer-events-auto w-12 h-12 bg-white/90 backdrop-blur-xl shadow-[0_8px_20px_rgba(0,0,0,0.12)] rounded-2xl flex flex-col items-center justify-center border border-white/50 active:scale-95 transition-all duration-300 group hover:shadow-[0_8px_25px_rgba(0,0,0,0.15)] hover:bg-white"
            >
                <div className="w-5 flex flex-col gap-[5px] items-start group-hover:gap-[4px] transition-all duration-300">
                    <span className="w-full h-[2.5px] bg-slate-800 rounded-full transition-all duration-300 group-hover:w-full"></span>
                    <span className="w-[70%] h-[2.5px] bg-slate-800 rounded-full transition-all duration-300 group-hover:w-full"></span>
                    <span className="w-[40%] h-[2.5px] bg-slate-800 rounded-full transition-all duration-300 group-hover:w-full"></span>
                </div>
            </button>

            {/* Center Earnings */}
            <div className="flex flex-col items-center gap-2 pointer-events-auto mt-1">

                {/* Earnings - Redesigned to match UI (White Glassmorphism) */}
                <div className="px-5 py-2.5 bg-white/90 backdrop-blur-xl shadow-[0_8px_20px_rgba(0,0,0,0.12)] rounded-full flex items-center gap-3 border border-white/50 transform transition-transform hover:scale-105 cursor-pointer group">
                    <span className="text-slate-800 text-xl font-black tracking-tight">${earnings.toFixed(2)}</span>
                    <div className="w-px h-4 bg-slate-200 group-hover:bg-slate-300 transition-colors"></div>
                    <span className="text-emerald-600 text-[10px] font-bold uppercase tracking-wider">{t('dailyEarnings')}</span>
                </div>

            </div>

            {/* Search/Notifications Button - Enhanced Design */}
            <button className="pointer-events-auto w-12 h-12 bg-white/90 backdrop-blur-xl shadow-[0_8px_20px_rgba(0,0,0,0.12)] rounded-2xl flex items-center justify-center border border-white/50 active:scale-95 transition-all duration-300 group hover:shadow-[0_8px_25px_rgba(0,0,0,0.15)] hover:bg-white relative overflow-hidden">
                <div className="absolute inset-0 bg-blue-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <ICONS.search className="w-6 h-6 text-slate-800 relative z-10 group-hover:scale-110 transition-transform duration-300 stroke-[2.5]" />
            </button>

        </div>
    );
};

const GoButton: FC<{ isOnline: boolean; onClick: () => void }> = ({ isOnline, onClick }) => {
    const { t, language } = useLocalization();
    
    // Inline translation helper
    const tr = (en: string, ar: string) => language === 'ar' ? ar : en;

    return (
        <div className="flex justify-center -mt-10 mb-2 relative z-30">
            <button 
                onClick={onClick}
                className={`
                    relative w-20 h-20 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.2)] flex items-center justify-center transition-all duration-500 transform hover:scale-105 active:scale-95 group border-[4px] border-white
                    ${isOnline 
                        ? 'bg-emerald-500 text-white' 
                        : 'bg-red-500 text-white'}
                `}
            >
                {/* Pulse rings for offline state (now RED) */}
                {!isOnline && (
                    <>
                        <span className="absolute inset-0 rounded-full bg-red-500 opacity-20 animate-ping"></span>
                        <span className="absolute -inset-4 rounded-full border border-red-500/30 animate-pulse"></span>
                    </>
                )}
                
                
                <div className="flex flex-col items-center justify-center relative z-10">
                     {isOnline ? (
                         <div className="flex flex-col items-center">
                             <svg xmlns="http://www.w3.org/2000/svg " viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 mb-1 text-white animate-pulse">
                               <path fillRule="evenodd" d="M1.371 8.143c5.858-5.857 15.356-5.857 21.213 0a.75.75 0 010 1.061l-.53.53a.75.75 0 01-1.06 0c-4.98-4.979-13.053-4.979-18.032 0a.75.75 0 01-1.06 0l-.53-.53a.75.75 0 010-1.06zm3.182 3.182c4.1-4.1 10.749-4.1 14.85 0a.75.75 0 010 1.06l-.53.53a.75.75 0 01-1.062 0 6.75 6.75 0 00-9.546 0 .75.75 0 01-1.06 0l-.53-.53a.75.75 0 010-1.06zm3.204 3.182a6 6 0 018.486 0 .75.75 0 010 1.061l-.53.53a.75.75 0 01-1.061 0 3.75 3.75 0 00-5.304 0 .75.75 0 01-1.06 0l-.53-.53a.75.75 0 010-1.06zm3.182 3.182a1.5 1.5 0 012.122 0 .75.75 0 010 1.06l-.53.53a.75.75 0 01-1.061 0l-.53-.53a.75.75 0 010-1.06z" clipRule="evenodd" />
                             </svg>
                             <span className="font-bold text-[10px] uppercase tracking-wider text-white shadow-sm">{t('online')}</span>
                         </div>
                     ) : (
                         <>
                            <span className="font-black text-2xl uppercase tracking-widest leading-none mb-0.5 drop-shadow-md">{tr("GO", "ابدأ")}</span>
                            <span className="text-[9px] font-bold uppercase tracking-wide opacity-90 bg-red-700 px-1.5 rounded-full shadow-sm">{t('offline')}</span>
                         </>
                     )}
                </div>
            </button>
        </div>
    );
};

const StatusIndicator: FC<{ isOnline: boolean }> = ({ isOnline }) => {
    const { t } = useLocalization();
    if (!isOnline) return <div className="text-center text-slate-400 font-medium py-4 text-xs">{t('youAreOffline')}</div>;

    return (
        <div className="flex flex-col items-center justify-center py-4">
            <div className="relative w-12 h-12 flex items-center justify-center mb-3">
                <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-75"></div>
                <div className="absolute inset-2 bg-blue-50 rounded-full animate-pulse"></div>
                <div className="relative bg-white p-2 rounded-full shadow-sm border border-blue-100">
                     <ICONS.search className="w-5 h-5 text-blue-500" />
                </div>
            </div>
            <p className="text-slate-800 font-bold text-sm animate-pulse">{t('searching')}</p>
        </div>
    );
}

const DriverDashboard: FC<{ 
    isOnline: boolean;
    activeTrip: Booking | null;
    pendingRequests: Booking[]; 
    onAccept: (id: string) => void;
    onDecline: (id: string) => void;
    onToggleOnline: () => void;
    onTripUpdate: (newStatus: Booking['status']) => void;
    driverPosition: LatLngTuple | null;
    earnings: number;
}> = ({ isOnline, activeTrip, pendingRequests, onAccept, onDecline, onToggleOnline, onTripUpdate, driverPosition, earnings }) => {
    const { t, language } = useLocalization();
    const [shouldFollow, setShouldFollow] = useState(true);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [tripRoute, setTripRoute] = useState<LatLngTuple[] | null>(null);
    const [destinationAddress, setDestinationAddress] = useState<string>('');
    const [isSummaryVisible, setIsSummaryVisible] = useState(false);
    
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const driverMarkerRef = useRef<any>(null);
    const layersRef = useRef<any[]>([]);

     const driverIcon = useMemo(() => L.divIcon({
        html: `<div class="relative flex items-center justify-center">
                 <div class="absolute -inset-4 bg-blue-500/20 rounded-full animate-pulse"></div>
                 <div class="w-6 h-6 bg-blue-500 rounded-full border-2 border-white shadow-lg z-10 transform transition-transform duration-300"></div>
               </div>`,
        className: 'custom-leaflet-icon', iconSize: [24, 24], iconAnchor: [12, 12],
    }), []);

    // ✅ التعديل 1: تهيئة الخريطة مع cleanup صحيح
    useEffect(() => {
        if (!mapContainerRef.current) return;

        mapRef.current = L.map(mapContainerRef.current, { 
            zoomControl: false, 
            attributionControl: false 
        }).setView(driverPosition || [15.3694, 44.1910], 15);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(mapRef.current);

        const timer = setTimeout(() => {
            mapRef.current?.invalidateSize();
        }, 250);

        mapRef.current.on('dragstart', () => setShouldFollow(false));

        return () => {
            clearTimeout(timer);
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
                driverMarkerRef.current = null;
                layersRef.current = [];
            }
        };
    }, [driverPosition]);

    // ✅ التعديل 2: Effect منفصل لإدارة موقع السائق
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !driverPosition) return;

        // إزالة الماركر القديم
        if (driverMarkerRef.current) {
            map.removeLayer(driverMarkerRef.current);
        }

        // إضافة الماركر الجديد
        driverMarkerRef.current = L.marker(driverPosition, { 
            icon: driverIcon, 
            zIndexOffset: 1000 
        }).addTo(map);

        // تتبع السائق تلقائياً
        if (shouldFollow) {
            map.setView(driverPosition, 16, { animate: true });
        }
    }, [driverPosition, shouldFollow, driverIcon]);

    // ✅ التعديل 3: Effect منفصل لإدارة مسار الرحلة
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        // مسح المسار القديم
        layersRef.current.forEach(layer => map.removeLayer(layer));
        layersRef.current = [];

        // رسم المسار الجديد
        if (tripRoute && activeTrip) {
            const routeOutline = L.polyline(tripRoute, { 
                color: '#fff', weight: 10, opacity: 0.8, 
                lineJoin: 'round', lineCap: 'round' 
            }).addTo(map);
            
            const routeLine = L.polyline(tripRoute, { 
                color: '#3b82f6', weight: 6, opacity: 1, 
                lineJoin: 'round', lineCap: 'round' 
            }).addTo(map);
            
            layersRef.current.push(routeOutline, routeLine);

            // دبوس الوجهة
            const target = activeTrip.status === 'accepted' ? activeTrip.pickup : activeTrip.drop;
            if (target && isValidLatLngTuple(target)) {
                const pinIcon = L.divIcon({ 
                    html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-12 h-12 text-red-600 drop-shadow-xl"><path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" /></svg>`, 
                    className: 'custom-leaflet-icon', 
                    iconSize: [48, 48], 
                    iconAnchor: [24, 48] 
                });
                const marker = L.marker(target, { icon: pinIcon }).addTo(map);
                layersRef.current.push(marker);
            }
        }
    }, [tripRoute, activeTrip]);

    // Handle Trip Routing Logic (When active trip changes)
    useEffect(() => {
        const updateRoute = async () => {
            if (activeTrip && driverPosition) {
                let target = activeTrip.status === 'accepted' ? activeTrip.pickup : activeTrip.drop;
                
                if (target && isValidLatLngTuple(target)) {
                    const addr = await apiService.reverseGeocode(target, language);
                    setDestinationAddress(addr?.split(',')[0] || 'Destination');

                    const { info } = await apiService.fetchRoute(driverPosition, target);
                    if (info?.route) {
                        setTripRoute(info.route);
                        
                        if (mapRef.current) {
                            const bounds = L.latLngBounds([driverPosition, target]);
                            mapRef.current.fitBounds(bounds.pad(0.2));
                        }
                    }
                }
            } else {
                setTripRoute(null);
            }
        };

        updateRoute();
    }, [activeTrip, activeTrip?.status, driverPosition, language]);

    const getTripState = () => {
        if (!activeTrip) return null;
        if (activeTrip.status === 'accepted') return { label: t('arrivedAtPickup'), color: 'bg-blue-600', dist: '2.3 km', instr: t('headNorth'), sub: destinationAddress };
        if (activeTrip.status === 'arrived') return { label: t('go'), color: 'bg-green-500', dist: '0 km', instr: t('pickUpClient'), sub: t('arrivedAtLocation') };
        if (activeTrip.status === 'in_progress') return { label: t('endTrip'), color: 'bg-red-500', dist: '5.1 km', instr: t('dropOffClient'), sub: destinationAddress };
        return { label: t('completed'), color: 'bg-slate-600', dist: '0 km', instr: t('tripEnded'), sub: '' };
    };
    const tripState = getTripState();

    return (
       <div className="flex-1 flex flex-col relative h-screen overflow-hidden bg-slate-100">
            
            {/* MAP LAYER - KEY FIX: MOVED TO FIRST CHILD TO PREVENT REMOUNTING */}
            <div ref={mapContainerRef} className="absolute inset-0 z-0 bg-slate-200"></div>

            {/* Conditionally Render Navigation Top Bar if Trip is Active */}
            {activeTrip && tripState && (
                <NavigationTopBar distance={tripState.dist} instruction={tripState.instr} nextTurn={tripState.sub} />
            )}

            {/* Conditionally Render Dashboard Top Bar if NO Trip */}
            {!activeTrip && (
                <DriverTopBar 
                    isOnline={isOnline} 
                    earnings={earnings} 
                    onMenuClick={() => setIsMenuOpen(true)}
                />
            )}
            

            {/* Map Controls - Recenter (Moved to Bottom Left) */}
            <div className="absolute left-4 bottom-64 z-[400] flex flex-col gap-3 pointer-events-auto">
                 <button 
                    onClick={() => {
                        setShouldFollow(true);
                        if (driverPosition && mapRef.current) {
                             mapRef.current.setView(driverPosition, 16, { animate: true });
                        }
                    }} 
                    className={`p-3 rounded-full shadow-lg transition-colors border ${shouldFollow ? 'bg-blue-600 text-white border-blue-500' : 'bg-white text-slate-700 border-transparent'}`}
                >
                    <ICONS.directions_car className="w-6 h-6" />
                </button>
            </div>

            {/* Side Menu Drawer */}
            <DriverSideMenu 
                isOpen={isMenuOpen} 
                onClose={() => setIsMenuOpen(false)} 
                earnings={earnings}
            />

            {/* ---------------- BOTTOM AREA ---------------- */}
            
            {/* CASE 1: ACTIVE TRIP CONTROLS */}
            {activeTrip && tripState ? (
                <>
                    <BottomTripControls 
                        trip={activeTrip} 
                        actionLabel={tripState.label} 
                        actionColor={tripState.color}
                        onAction={() => {
                            if(activeTrip.status === 'accepted') onTripUpdate('arrived');
                            else if(activeTrip.status === 'arrived') onTripUpdate('in_progress');
                            else if(activeTrip.status === 'in_progress') setIsSummaryVisible(true);
                        }}
                    />
                    {isSummaryVisible && (
                        <div className="absolute inset-0 bg-black/50 z-[1000] flex items-center justify-center p-6 backdrop-blur-sm">
                            <div className="bg-white w-full max-w-sm rounded-3xl p-8 text-center border border-slate-100 shadow-2xl animate-[fade-in-splash-text_0.3s_ease-out_1]">
                                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <ICONS.check_circle className="w-10 h-10 text-emerald-600" />
                                </div>
                                <h2 className="text-2xl font-black text-slate-900 mb-2">{t('tripCompleted')}</h2>
                                <p className="text-slate-500 mb-8 text-lg font-semibold">$8.50 {t('earnings')}</p>
                                <button onClick={() => onTripUpdate('completed')} className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl text-lg hover:bg-black transition-all">{t('confirm')}</button>
                            </div>
                        </div>
                    )}
                </>
            ) : (
            /* CASE 2: DASHBOARD (PENDING REQUESTS) */
                <div className="absolute bottom-0 left-0 right-0 z-10 flex flex-col justify-end pointer-events-none h-auto">
                    
                    {/* GO Button Container - Fixed Position */}
                    <div className={`pointer-events-auto w-full flex justify-center transition-transform duration-500 translate-y-0 opacity-100`}>
                        <GoButton isOnline={isOnline} onClick={onToggleOnline} />
                    </div>

                    {/* Main Sheet - Fixed Unified Height (Compact size approx 220px) */}
                    <div className={`bg-white rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.08)] pointer-events-auto transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] overflow-hidden flex flex-col border-t border-slate-100/50 h-[220px]`}>
                        
                        {/* Handle - Visual only, no interaction */}
                        <div className="w-full h-9 flex items-center justify-center cursor-default">
                            <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
                        </div>

                        <div className="px-6 pb-6 flex-1 flex flex-col text-slate-800 overflow-hidden">
                            {!isOnline ? (
                                <div className="text-center flex-1 flex flex-col justify-start items-center pt-2">
                                    <h3 className="text-lg font-black text-slate-800 mb-1">{t('youAreOffline')}</h3>
                                    <p className="text-slate-500 text-xs max-w-[260px] leading-relaxed">{t('goOnlineMessage')}</p>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center justify-between mb-4 shrink-0 px-1">
                                        <h3 className="font-bold text-lg text-slate-800">{t('newRequests')}</h3>
                                        {pendingRequests.length > 0 && (
                                            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                                                {pendingRequests.length}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex-1 overflow-y-auto scrollbar-hide pb-4">
                                        {pendingRequests.length === 0 ? (
                                            <StatusIndicator isOnline={isOnline} />
                                        ) : (
                                            <div className="space-y-4">
                                                {pendingRequests.map((req, idx) => (
                                                    <RequestCard key={req.id} booking={req} onAccept={onAccept} onDecline={onDecline} index={idx} />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
       </div>
    );
};

const DriverApp: React.FC = () => {
  const { t } = useLocalization();
  const [isOnline, setIsOnline] = useState(false);
  const [activeTrip, setActiveTrip] = useState<Booking | null>(null);
  const [pendingRequests, setPendingRequests] = useState<Booking[]>([]);
  const [tripHistory, setTripHistory] = useState<Booking[]>([]);
  const [driverPosition, setDriverPosition] = useState<LatLngTuple | null>(null);
  const [earnings, setEarnings] = useState(0);

  useEffect(() => {
    // Load history
    const stored = localStorage.getItem(DRIVER_HISTORY_KEY);
    if (stored) setTripHistory(JSON.parse(stored));

    const unsub = dbService.subscribeToBookings((allBookings) => {
        const myActive = allBookings.find(b => b.driverId === 'current_driver_id' && ['accepted', 'arrived', 'in_progress'].includes(b.status));
        setActiveTrip(myActive || null);

        const pending = allBookings.filter(b => b.status === 'pending');
        setPendingRequests(pending);
        
        // Update history from DB
        const myHistory = allBookings.filter(b => b.driverId === 'current_driver_id' && b.status === 'completed');
        if(myHistory.length > 0) {
            setTripHistory(myHistory);
            const total = myHistory.reduce((acc, curr) => acc + ((parseFloat(curr.distance || '0') * 0.5) + 2), 0);
            setEarnings(total);
        }
    });

    return () => unsub();
  }, []);

  const handleToggleOnline = () => {
      if (!isOnline) {
          driverBackgroundService.goOnline();
          navigator.geolocation.getCurrentPosition(pos => {
              setDriverPosition([pos.coords.latitude, pos.coords.longitude]);
              dbService.updateDriverLocation("current_driver_id", pos.coords.latitude, pos.coords.longitude, true, 'idle');
          }, (err) => {
              console.error(err);
              const def: LatLngTuple = [15.3694, 44.1910];
              setDriverPosition(def);
              dbService.updateDriverLocation("current_driver_id", def[0], def[1], true, 'idle'); // ✅ تم إصلاح الخطأ هنا
          });
      } else {
          driverBackgroundService.goOffline();
      }
      setIsOnline(!isOnline);
  };

  const handleAcceptTrip = (id: string) => {
      dbService.updateBookingStatus(id, 'accepted', 'current_driver_id');
  };

  const handleDeclineTrip = (id: string) => {
      setPendingRequests(prev => prev.filter(r => r.id !== id));
  };
  
  const handleTripUpdate = (newStatus: Booking['status']) => {
      if (activeTrip) {
          dbService.updateBookingStatus(activeTrip.id, newStatus);
          if (newStatus === 'completed') {
             setActiveTrip(null);
          }
      }
  };

  return (
    <DriverDashboard 
        isOnline={isOnline} 
        activeTrip={activeTrip}
        pendingRequests={pendingRequests}
        onAccept={handleAcceptTrip}
        onDecline={handleDeclineTrip}
        onToggleOnline={handleToggleOnline}
        onTripUpdate={handleTripUpdate}
        driverPosition={driverPosition}
        earnings={earnings}
    />
  );
};

export default DriverApp;