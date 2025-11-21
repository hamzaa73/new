
import React, { FC, useEffect, useRef, useState } from 'react';
import { Booking, LatLngTuple } from '../types';
import { useLocalization } from '../contexts/LocalizationContext';
import { apiService, driverBackgroundService, dbService } from '../services'; 
import { ICONS } from '../constants';

declare const L: any; // Using Leaflet from CDN

const isValidLatLngTuple = (coord: any): coord is LatLngTuple => {
    return Array.isArray(coord) && coord.length === 2 && typeof coord[0] === 'number' && typeof coord[1] === 'number';
};

interface ActiveTripViewProps {
    trip: Booking;
    onTripUpdate: (newStatus: Booking['status']) => void;
}

// --- NEW PROFESSIONAL UI COMPONENTS (LIGHT THEME MATCHING REFERENCE LAYOUT) ---

export const NavigationTopBar: FC<{ distance: string, instruction: string, nextTurn: string }> = ({ distance, instruction, nextTurn }) => (
    <div className="absolute top-0 left-0 right-0 z-[500] bg-white shadow-md rounded-b-3xl overflow-hidden flex pointer-events-auto">
        {/* Turn Icon Area (Green Box) */}
        <div className="bg-emerald-500 w-24 flex flex-col items-center justify-center text-white p-2 shrink-0">
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 mb-1"><path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm.53 5.47a.75.75 0 00-1.06 0l-3 3a.75.75 0 101.06 1.06l1.72-1.72v5.69a.75.75 0 001.5 0v-5.69l1.72 1.72a.75.75 0 101.06-1.06l-3-3z" clipRule="evenodd" /></svg>
             <span className="text-xl font-black" dir="ltr">{distance}</span>
        </div>

        {/* Text Instruction Area */}
        <div className="flex-1 p-4 flex flex-col justify-center">
            <div className="text-xl font-black text-slate-800 leading-none mb-2 text-left rtl:text-right">{instruction}</div>
            <div className="text-sm text-slate-500 font-medium truncate flex items-center gap-1 text-left rtl:text-right">
                <span className="w-2 h-2 bg-slate-300 rounded-full"></span>
                {nextTurn}
            </div>
        </div>
    </div>
);

export const BottomTripControls: FC<{ trip: Booking, onAction: () => void, actionLabel: string, actionColor: string }> = ({ trip, onAction, actionLabel, actionColor }) => {
    const { t, language } = useLocalization();
    const isRtl = language === 'ar';
    
    return (
        <div className="absolute bottom-0 left-0 right-0 z-[500] pointer-events-none">
            
            {/* The Floating Action Button - Centered and overlapping the sheet */}
            <div className="flex justify-center relative z-20 -mb-10 pointer-events-auto">
                 <button 
                    onClick={onAction}
                    className={`h-20 min-w-[5rem] px-8 rounded-full shadow-[0_8px_25px_rgba(0,0,0,0.3)] flex items-center justify-center border-[6px] border-slate-100 ${actionColor} transform transition-transform active:scale-95 hover:scale-105`}
                 >
                    <span className="text-white font-black text-base md:text-lg uppercase tracking-wide text-center whitespace-nowrap">{actionLabel}</span>
                 </button>
            </div>

            {/* Info Sheet - White Background */}
            <div className="bg-white pt-14 pb-8 px-6 rounded-t-[2.5rem] shadow-[0_-5px_30px_rgba(0,0,0,0.1)] pointer-events-auto relative z-10 border-t border-slate-100">
                
                {/* Trip Stats Row */}
                <div className="flex items-center justify-between mb-6" dir="ltr">
                     <div className="text-center w-1/3">
                        <p className="text-2xl font-black text-slate-800">12 <span className="text-xs font-bold text-slate-400">{t('km')}</span></p>
                     </div>
                     
                     <div className="text-center w-1/3 border-l border-r border-slate-100">
                        <div className="flex flex-col items-center">
                             <ICONS.people className="w-6 h-6 text-blue-600 mb-1" />
                             <p className="text-xs font-bold text-slate-800 truncate max-w-[100px]">{t('mockDriverName')}</p>
                        </div>
                     </div>

                     <div className="text-center w-1/3">
                        <p className="text-2xl font-black text-slate-800">15 <span className="text-xs font-bold text-slate-400">{t('minute')}</span></p>
                     </div>
                </div>

                {/* Bottom Actions Row */}
                <div className="flex items-center justify-between">
                    <button className="p-3 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors flex items-center gap-2">
                         <ICONS.menu className="w-6 h-6" />
                         <span className="text-xs font-bold hidden sm:block">{t('more')}</span>
                    </button>

                    <p className="text-xs text-center text-slate-400 font-medium">
                        {t('dropOffLabel')}: <span className="text-slate-800 font-bold">Al-Sabeen St</span>
                    </p>

                    <button className="p-3 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors">
                         <div className="w-6 h-6 flex items-center justify-center">
                             <ICONS.directions_car className="w-5 h-5" />
                         </div>
                    </button>
                </div>
            </div>
        </div>
    );
};


const ActiveTripView: FC<ActiveTripViewProps> = ({ trip, onTripUpdate }) => {
    // NOTE: This component is being phased out in favor of the integrated DriverDashboard
    // to prevent map reloads. However, we keep the logic here for reference or standalone usage.
    
    const { t, language } = useLocalization();
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const driverMarkerRef = useRef<any>(null);
    const layersRef = useRef<any[]>([]);

    const [driverPosition, setDriverPosition] = useState<LatLngTuple | null>(null);
    const [currentRoute, setCurrentRoute] = useState<LatLngTuple[] | null>(null);
    const [destinationAddress, setDestinationAddress] = useState<string>('');
    const [isSummaryVisible, setIsSummaryVisible] = useState(false);
    const [shouldFollow, setShouldFollow] = useState(true);

    // Driver Icon (Car)
    const driverIcon = L.divIcon({
        html: `<div class="relative flex items-center justify-center">
                <div class="w-14 h-14 bg-blue-600 rounded-full border-[3px] border-white shadow-2xl flex items-center justify-center relative z-10 transform">
                     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-7 h-7 text-white"><path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 001.218.75 60.517 60.517 0 003.478-2.405z"/></svg>
                </div>
               </div>`,
        className: 'custom-leaflet-icon',
        iconSize: [56, 56], 
        iconAnchor: [28, 28],
    });

    // --- MAP INITIALIZATION ---
    useEffect(() => {
        if (mapContainerRef.current && !mapRef.current) {
            mapRef.current = L.map(mapContainerRef.current, { 
                zoomControl: false, 
                attributionControl: false,
                zoomAnimation: true
            }).setView([15.3694, 44.1910], 18);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(mapRef.current);

            setTimeout(() => {
                mapRef.current?.invalidateSize();
            }, 250);

            mapRef.current.on('dragstart', () => setShouldFollow(false));
        }
        driverBackgroundService.setActiveTripStatus(trip.status);
    }, [trip.status]);

    // --- GPS & ROUTE LOGIC ---
    useEffect(() => {
        const updatePosition = () => {
            const data = localStorage.getItem("driver_location");
            if (data) {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.driver_lat && parsed.driver_lng) {
                        setDriverPosition([parsed.driver_lat, parsed.driver_lng]);
                    }
                } catch(e) {}
            }
        };
        const intervalId = setInterval(updatePosition, 1000); 
        return () => clearInterval(intervalId);
    }, []);

    useEffect(() => {
        const updateNavigation = async () => {
            let target = trip.status === 'accepted' ? trip.pickup : trip.drop;
            if (target && isValidLatLngTuple(target)) {
                 if (!destinationAddress) {
                    const addr = await apiService.reverseGeocode(target, language);
                    setDestinationAddress(addr?.split(',')[0] || 'Destination');
                 }
                 if (driverPosition) {
                    const { info } = await apiService.fetchRoute(driverPosition, target);
                    if (info?.route) setCurrentRoute(info.route);
                 }
            }
        };
        const timer = setTimeout(updateNavigation, 1000);
        return () => clearTimeout(timer);
    }, [trip.status, trip.pickup, trip.drop, driverPosition, language]);

    // --- RENDER MAP LAYERS ---
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        layersRef.current.forEach(layer => map.removeLayer(layer));
        layersRef.current = [];

        if (currentRoute) {
            const routeOutline = L.polyline(currentRoute, { color: '#fff', weight: 10, opacity: 0.8, lineJoin: 'round', lineCap: 'round' }).addTo(map);
            const routeLine = L.polyline(currentRoute, { color: '#3b82f6', weight: 6, opacity: 1, lineJoin: 'round', lineCap: 'round' }).addTo(map);
            layersRef.current.push(routeOutline, routeLine);
        }

        if (driverPosition) {
            if (!driverMarkerRef.current) {
                driverMarkerRef.current = L.marker(driverPosition, { icon: driverIcon, zIndexOffset: 1000 }).addTo(map);
            } else {
                 driverMarkerRef.current.setLatLng(driverPosition);
                 driverMarkerRef.current.setZIndexOffset(1000);
            }
            if (shouldFollow) {
                const offsetLat = driverPosition[0] - (0.00002 * (21 - map.getZoom())); 
                map.panTo([offsetLat, driverPosition[1]], { animate: true, duration: 0.8, easeLinearity: 0.2 });
            }
        }
        
        const target = trip.status === 'accepted' ? trip.pickup : trip.drop;
        if (target && isValidLatLngTuple(target)) {
             const pinIcon = L.divIcon({ html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-12 h-12 text-red-600 drop-shadow-xl"><path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" /></svg>`, className: 'custom-leaflet-icon', iconSize: [48, 48], iconAnchor: [24, 48] });
             const m = L.marker(target, { icon: pinIcon }).addTo(map);
             layersRef.current.push(m);
        }
    }, [driverPosition, currentRoute, shouldFollow]);

    const handleMyLocationClick = () => {
        setShouldFollow(true);
        if (driverPosition && mapRef.current) mapRef.current.setView(driverPosition, 18, { animate: true });
    };
    
    const getTripState = () => {
        if (trip.status === 'accepted') return { label: t('arrivedAtPickup'), color: 'bg-blue-600', dist: '2.3 km', instr: t('headNorth'), sub: destinationAddress };
        if (trip.status === 'arrived') return { label: t('go'), color: 'bg-green-500', dist: '0 km', instr: t('pickUpClient'), sub: t('arrivedAtLocation') };
        if (trip.status === 'in_progress') return { label: t('endTrip'), color: 'bg-red-500', dist: '5.1 km', instr: t('dropOffClient'), sub: destinationAddress };
        return { label: t('completed'), color: 'bg-slate-600', dist: '0 km', instr: t('tripEnded'), sub: '' };
    };
    const state = getTripState();

    return (
        <main className="flex-1 flex flex-col h-screen relative bg-slate-50 overflow-hidden font-sans text-slate-900">
            <NavigationTopBar distance={state.dist} instruction={state.instr} nextTurn={state.sub} />
            
            <div ref={mapContainerRef} className="absolute inset-0 z-0 bg-slate-200"></div>

            <div className="absolute right-4 top-1/3 z-[400] flex flex-col gap-3 pointer-events-auto">
                <button onClick={handleMyLocationClick} className={`p-3 rounded-full shadow-lg transition-colors border ${shouldFollow ? 'bg-blue-600 text-white border-blue-500' : 'bg-white text-slate-700 border-transparent'}`}>
                    <ICONS.directions_car className="w-6 h-6" />
                </button>
            </div>

            <BottomTripControls 
                trip={trip} 
                actionLabel={state.label} 
                actionColor={state.color}
                onAction={() => {
                    if(trip.status === 'accepted') onTripUpdate('arrived');
                    else if(trip.status === 'arrived') onTripUpdate('in_progress');
                    else if(trip.status === 'in_progress') setIsSummaryVisible(true);
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
        </main>
    );
};

export default ActiveTripView;
