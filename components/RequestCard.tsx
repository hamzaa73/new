
import React, { useState, useEffect, FC } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { ICONS, allServices } from '../constants';
import { Booking } from '../types';
import { apiService } from '../services/index';

interface RequestCardProps {
  booking: Booking;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
  index: number;
}

const RequestCard: FC<RequestCardProps> = ({ booking, onAccept, onDecline, index }) => {
    const { t, translateOrShowOriginal, language } = useLocalization();
    const serviceInfo = allServices[booking.service] || allServices.otherService;
    const ServiceIcon = serviceInfo ? ICONS[serviceInfo.icon] : () => null;
    
    const [pickupAddress, setPickupAddress] = useState<string | null>(null);
    const [dropAddress, setDropAddress] = useState<string | null>(null);
    const [isLoadingAddresses, setIsLoadingAddresses] = useState(true);
    
    // Mock Price Calculation
    const price = ((parseFloat(booking.distance || '0') * 0.5) + 2).toFixed(2);

    useEffect(() => {
        // Stagger API calls to avoid rate-limiting
        const timer = setTimeout(() => {
            const fetchAddresses = async () => {
                setIsLoadingAddresses(true);
                try {
                    let pAddress = t('notSpecified');
                    let dAddress = t('notSpecified');

                    // Optimistic short address based on lat/lng if reverse geocoding is slow or fails
                    if (booking.pickup) {
                        const fetchedP = await apiService.reverseGeocode(booking.pickup, language);
                        pAddress = fetchedP?.split(',')[0] || `Lat: ${booking.pickup[0].toFixed(3)}`;
                    }
                     setPickupAddress(pAddress);

                    if (booking.drop) {
                        const fetchedD = await apiService.reverseGeocode(booking.drop, language);
                        dAddress = fetchedD?.split(',')[0] || `Lat: ${booking.drop[0].toFixed(3)}`;
                    }
                    setDropAddress(dAddress);

                } catch (error) {
                    console.error("Error reverse geocoding:", error);
                    setPickupAddress(t('routeFetchError'));
                    setDropAddress(t('routeFetchError'));
                } finally {
                    setIsLoadingAddresses(false);
                }
            };
            fetchAddresses();
        }, index * 200); // Faster stagger

        return () => clearTimeout(timer);
    }, [booking.pickup, booking.drop, language, t, index]);

    return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-slate-100 dark:border-gray-700 animate-[fade-in-splash-text_0.5s_ease-out_1] transform transition-all hover:scale-[1.01]">
            {/* Header: Service & Price */}
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg bg-${serviceInfo?.color}/10 shrink-0`}>
                        <ServiceIcon className={`w-4 h-4 text-${serviceInfo?.color}`} />
                    </div>
                    <div className="flex flex-col">
                        <h3 className="font-bold text-sm leading-tight text-slate-900 dark:text-white line-clamp-1">
                            {translateOrShowOriginal(booking.service)}
                        </h3>
                        <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                            {booking.distance} {t('km')} • {booking.duration} {t('minutes')}
                        </p>
                    </div>
                </div>
                <div className="text-end shrink-0 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-md">
                    <p className="text-sm font-black text-green-600 dark:text-green-400 leading-none">${price}</p>
                </div>
            </div>

            {/* Route Details */}
            <div className="relative ps-4 space-y-2 mb-3">
                {/* Dotted Line */}
                <div className="absolute start-[5px] top-1.5 bottom-2 w-px border-s border-dashed border-slate-300 dark:border-gray-600"></div>

                {/* Pickup */}
                <div className="relative">
                    <div className="absolute -start-[13px] top-1 w-2 h-2 bg-green-500 rounded-full ring-2 ring-white dark:ring-gray-800 z-10"></div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5 leading-none">{t('from')}</p>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight truncate">
                        {isLoadingAddresses ? <span className="animate-pulse bg-slate-200 dark:bg-gray-600 h-2 w-16 rounded inline-block"></span> : pickupAddress}
                    </p>
                </div>

                {/* Drop */}
                <div className="relative">
                    <div className="absolute -start-[13px] top-1 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-gray-800 z-10"></div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5 leading-none">{t('to')}</p>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight truncate">
                         {isLoadingAddresses ? <span className="animate-pulse bg-slate-200 dark:bg-gray-600 h-2 w-16 rounded inline-block"></span> : dropAddress}
                    </p>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 mt-2">
                <button 
                    onClick={() => onDecline(booking.id)} 
                    className="flex-1 bg-slate-50 dark:bg-gray-700 text-slate-600 dark:text-slate-300 font-bold py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-600 transition-colors text-[10px] uppercase tracking-wider border border-slate-200 dark:border-gray-600"
                >
                    {t('decline')}
                </button>
                <button 
                    onClick={() => onAccept(booking.id)} 
                    className="flex-[2] bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-[10px] uppercase tracking-wider"
                >
                    {t('accept')}
                </button>
            </div>
        </div>
    );
};

export default RequestCard;
