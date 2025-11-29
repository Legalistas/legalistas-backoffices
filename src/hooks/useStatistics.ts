/**
 * Hook personalizado para consumir la API de estadísticas mensuales
 */

import { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/constant/api-endpoints';

interface MonthlyStatistic {
  id: number;
  month: string;
  year: number;
  value: string;
  percentage: string | null;
  type: string;
  createdAt: string;
  updatedAt: string;
}

interface YearSummary {
  year: number;
  months: Array<{
    month: string;
    value: string;
    percentage: string | null;
  }>;
  total: number;
  avgPercentage: number;
}

interface UseStatisticsOptions {
  type?: string;
  year?: number;
  startYear?: number;
  endYear?: number;
  autoFetch?: boolean;
}

export function useMonthlyStatistics(options: UseStatisticsOptions = {}) {
  const { type = 'estadistica_general', year, startYear, endYear, autoFetch = true } = options;
  
  const [data, setData] = useState<MonthlyStatistic[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchStatistics = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ type });
      if (year) params.append('year', year.toString());
      if (startYear) params.append('startYear', startYear.toString());
      if (endYear) params.append('endYear', endYear.toString());

      const response = await fetch(`${API_BASE_URL}/statistics/monthly?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        throw new Error(result.message || 'Error al obtener estadísticas');
      }
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching statistics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoFetch) {
      fetchStatistics();
    }
  }, [type, year, startYear, endYear, autoFetch]);

  return { data, loading, error, refetch: fetchStatistics };
}

export function useYearsSummary(type = 'estadistica_general') {
  const [data, setData] = useState<YearSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/statistics/monthly/summary?type=${type}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        throw new Error(result.message || 'Error al obtener resumen');
      }
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [type]);

  return { data, loading, error, refetch: fetchSummary };
}

export function useAvailableYears(type = 'estadistica_general') {
  const [years, setYears] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchYears = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/statistics/monthly/years?type=${type}`);
      const result = await response.json();

      if (result.success) {
        setYears(result.data);
      } else {
        throw new Error(result.message || 'Error al obtener años');
      }
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching years:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchYears();
  }, [type]);

  return { years, loading, error, refetch: fetchYears };
}

// Funciones de utilidad para crear/actualizar/eliminar

export async function createOrUpdateStatistic(data: {
  month: string;
  year: number;
  value: number;
  percentage?: number;
  type?: string;
}) {
  try {
    const response = await fetch(`${API_BASE_URL}/statistics/monthly`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || 'Error al guardar estadística');
    }

    return result.data;
  } catch (error) {
    console.error('Error creating/updating statistic:', error);
    throw error;
  }
}

export async function deleteStatistic(id: number) {
  try {
    const response = await fetch(`${API_BASE_URL}/statistics/monthly/${id}`, {
      method: 'DELETE',
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || 'Error al eliminar estadística');
    }

    return true;
  } catch (error) {
    console.error('Error deleting statistic:', error);
    throw error;
  }
}
