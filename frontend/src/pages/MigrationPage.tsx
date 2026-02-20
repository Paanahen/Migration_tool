import React, { useState, useMemo, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEnvironments } from '@/contexts/EnvironmentContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowRight, Box, Layers, Cog, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { listObjects, migrateObjects } from '@/services/api';
import type { MigratableObject } from '@/types/environment';

const TYPE_CONFIG = {
  dimension: { icon: Layers, label: 'Dimensions', color: 'text-primary' },
  cube: { icon: Box, label: 'Cubes', color: 'text-warning' },
  process: { icon: Cog, label: 'Processes', color: 'text-success' },
} as const;

const MigrationPage = () => {
  const { environments } = useEnvironments();
  const { toast } = useToast();
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [objects, setObjects] = useState<MigratableObject[]>([]);
  const [loading, setLoading] = useState(false);
  const [migrating, setMigrating] = useState(false);

  const sourceEnv = environments.find(e => e.id === sourceId);
  const targetEnv = environments.find(e => e.id === targetId);

  // Fetch objects when source environment changes
  useEffect(() => {
    if (!sourceEnv) {
      setObjects([]);
      return;
    }
    const fetchObjects = async () => {
      setLoading(true);
      try {
        const result = await listObjects(sourceEnv);
        setObjects(result.map(o => ({ ...o, selected: false })));
      } catch (err: any) {
        toast({
          title: 'Failed to list objects',
          description: err.message || 'Is Flask running?',
          variant: 'destructive',
        });
        setObjects([]);
      } finally {
        setLoading(false);
      }
    };
    fetchObjects();
  }, [sourceId]);

  const toggleObject = (name: string) => {
    setObjects(prev => prev.map(o => o.name === name ? { ...o, selected: !o.selected } : o));
  };

  const toggleAllOfType = (type: MigratableObject['type']) => {
    const ofType = objects.filter(o => o.type === type);
    const allSelected = ofType.every(o => o.selected);
    setObjects(prev => prev.map(o => o.type === type ? { ...o, selected: !allSelected } : o));
  };

  const selectedCount = objects.filter(o => o.selected).length;

  const grouped = useMemo(() => ({
    dimension: objects.filter(o => o.type === 'dimension'),
    cube: objects.filter(o => o.type === 'cube'),
    process: objects.filter(o => o.type === 'process'),
  }), [objects]);

  const handleMigrate = async () => {
    if (!sourceEnv || !targetEnv) return;
    setMigrating(true);
    try {
      const selected = objects.filter(o => o.selected);
      const result = await migrateObjects(sourceEnv, targetEnv, selected);
      toast({
        title: result.success ? 'Migration complete' : 'Migration failed',
        description: result.message,
        variant: result.success ? 'default' : 'destructive',
      });
    } catch (err: any) {
      toast({
        title: 'Migration failed',
        description: err.message || 'Is Flask running?',
        variant: 'destructive',
      });
    } finally {
      setMigrating(false);
    }
  };

  const canMigrate = sourceId && targetId && sourceId !== targetId && selectedCount > 0;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Migration</h1>
        <p className="text-muted-foreground mt-1">Migrate objects between Planning Analytics environments</p>
      </div>

      {/* Environment selectors */}
      <div className="flex items-center gap-4">
        <Card className="flex-1">
          <CardContent className="p-4 space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Source Environment</label>
            <Select value={sourceId} onValueChange={setSourceId}>
              <SelectTrigger>
                <SelectValue placeholder="Select source..." />
              </SelectTrigger>
              <SelectContent>
                {environments.map(env => (
                  <SelectItem key={env.id} value={env.id} disabled={env.id === targetId}>
                    {env.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <ArrowRight className="h-5 w-5 text-primary" />
        </div>

        <Card className="flex-1">
          <CardContent className="p-4 space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Target Environment</label>
            <Select value={targetId} onValueChange={setTargetId}>
              <SelectTrigger>
                <SelectValue placeholder="Select target..." />
              </SelectTrigger>
              <SelectContent>
                {environments.map(env => (
                  <SelectItem key={env.id} value={env.id} disabled={env.id === sourceId}>
                    {env.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {environments.length < 2 && (
        <div className="flex items-center gap-3 rounded-md border border-warning/30 bg-warning/5 p-4">
          <AlertCircle className="h-5 w-5 text-warning flex-shrink-0" />
          <p className="text-sm text-muted-foreground">
            You need at least two environments configured to perform migrations.
          </p>
        </div>
      )}

      {/* Object selection */}
      {sourceId && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Select Objects to Migrate</h2>
            <span className="text-sm text-muted-foreground">
              {loading ? 'Loading...' : `${selectedCount} selected`}
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {(['dimension', 'cube', 'process'] as const).map(type => {
                const config = TYPE_CONFIG[type];
                const Icon = config.icon;
                const items = grouped[type];
                if (items.length === 0) return null;
                const allSelected = items.every(o => o.selected);
                const someSelected = items.some(o => o.selected) && !allSelected;

                return (
                  <Card key={type} className="flex flex-col">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${config.color}`} />
                          <CardTitle className="text-sm font-semibold">{config.label}</CardTitle>
                        </div>
                        <Checkbox
                          checked={allSelected}
                          className={someSelected ? 'data-[state=checked]:bg-primary' : ''}
                          onCheckedChange={() => toggleAllOfType(type)}
                        />
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-hidden p-0">
                      <ScrollArea className="h-[480px] px-6 pb-4">
                        <div className="space-y-1">
                          {items.map(obj => (
                            <label
                              key={obj.name}
                              className="flex items-start gap-3 rounded-md px-2 py-2 hover:bg-muted/50 cursor-pointer transition-colors min-w-0 overflow-hidden"
                            >
                              <Checkbox
                                checked={obj.selected}
                                onCheckedChange={() => toggleObject(obj.name)}
                                className="flex-shrink-0 mt-0.5"
                              />
                              <span className="text-sm font-mono min-w-0" style={{ overflowWrap: 'anywhere' }}>{obj.name}</span>
                            </label>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <div className="flex justify-end pt-4">
            <Button
              onClick={handleMigrate}
              disabled={!canMigrate || migrating}
              className={`min-w-[180px] transition-all duration-300 ${canMigrate ? 'bg-primary text-primary-foreground hover:bg-primary/80 shadow-[0_0_25px_5px_hsl(var(--primary)/0.5)] ring-2 ring-primary/50' : 'bg-muted text-muted-foreground opacity-60'}`}
            >
              {migrating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Migrating...
                </>
              ) : (
                <>Migrate {selectedCount} Object{selectedCount !== 1 ? 's' : ''}</>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MigrationPage;
