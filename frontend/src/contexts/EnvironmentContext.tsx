import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { PAEnvironment } from '@/types/environment';
import {
  fetchEnvironments,
  createEnvironment,
  updateEnvironmentApi,
  deleteEnvironment,
} from '@/services/api';

interface EnvironmentContextType {
  environments: PAEnvironment[];
  loading: boolean;
  addEnvironment: (env: Omit<PAEnvironment, 'id' | 'createdAt'>) => Promise<void>;
  updateEnvironment: (id: string, env: Omit<PAEnvironment, 'id' | 'createdAt'>) => Promise<void>;
  removeEnvironment: (id: string) => Promise<void>;
  refreshEnvironments: () => Promise<void>;
}

const EnvironmentContext = createContext<EnvironmentContextType | null>(null);

export const useEnvironments = () => {
  const ctx = useContext(EnvironmentContext);
  if (!ctx) throw new Error('useEnvironments must be inside EnvironmentProvider');
  return ctx;
};

export const EnvironmentProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [environments, setEnvironments] = useState<PAEnvironment[]>([]);
  const [loading, setLoading] = useState(false);

  const loadEnvs = useCallback(async () => {
    if (!user?.username) {
      setEnvironments([]);
      return;
    }
    setLoading(true);
    try {
      const envs = await fetchEnvironments(user.username);
      setEnvironments(envs);
    } catch (err) {
      console.error('Failed to load environments:', err);
      setEnvironments([]);
    } finally {
      setLoading(false);
    }
  }, [user?.username]);

  useEffect(() => {
    loadEnvs();
  }, [loadEnvs]);

  const addEnvironment = async (env: Omit<PAEnvironment, 'id' | 'createdAt'>) => {
    if (!user?.username) return;
    const created = await createEnvironment(user.username, env);
    setEnvironments(prev => [...prev, created]);
  };

  const updateEnvironment = async (id: string, env: Omit<PAEnvironment, 'id' | 'createdAt'>) => {
    if (!user?.username) return;
    const updated = await updateEnvironmentApi(user.username, id, env);
    setEnvironments(prev => prev.map(e => (e.id === id ? updated : e)));
  };

  const removeEnvironment = async (id: string) => {
    if (!user?.username) return;
    await deleteEnvironment(user.username, id);
    setEnvironments(prev => prev.filter(e => e.id !== id));
  };

  return (
    <EnvironmentContext.Provider
      value={{ environments, loading, addEnvironment, updateEnvironment, removeEnvironment, refreshEnvironments: loadEnvs }}
    >
      {children}
    </EnvironmentContext.Provider>
  );
};
