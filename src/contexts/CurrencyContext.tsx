import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

interface CurrencyContextType {
    currency: string;
    locale: string;
    formatCurrency: (value: number) => string;
    updateSettings: (currency: string, locale: string) => Promise<void>;
    loading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider = ({ children }: { children: React.ReactNode }) => {
    const { user } = useAuth();
    const [currency, setCurrency] = useState('BRL');
    const [locale, setLocale] = useState('pt-BR');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchSettings();
        } else {
            setLoading(false);
        }
    }, [user]);

    const fetchSettings = async () => {
        try {
            const settings = await api.get<any>('/settings/organization');
            if (settings) {
                setCurrency(settings.currency || 'BRL');
                setLocale(settings.locale || 'pt-BR');
            }
        } catch (error) {
            console.error('Error fetching currency settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateSettings = async (newCurrency: string, newLocale: string) => {
        try {
            await api.put('/settings/organization', {
                currency: newCurrency,
                locale: newLocale,
            });

            setCurrency(newCurrency);
            setLocale(newLocale);
        } catch (error) {
            console.error('Error updating currency settings:', error);
            throw error;
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency,
        }).format(value);
    };

    return (
        <CurrencyContext.Provider value={{ currency, locale, formatCurrency, updateSettings, loading }}>
            {children}
        </CurrencyContext.Provider>
    );
};

export const useCurrency = () => {
    const context = useContext(CurrencyContext);
    if (context === undefined) {
        throw new Error('useCurrency must be used within a CurrencyProvider');
    }
    return context;
};
