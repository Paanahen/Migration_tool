import React, { useState } from 'react';
import { useEnvironments } from '@/contexts/EnvironmentContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Plus, Server, Trash2, Globe, Pencil, Loader2, CheckCircle2, XCircle, Cloud, Monitor } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { testConnection } from '@/services/api';
import type { PAEnvironment, EnvironmentType } from '@/types/environment';

type LocalForm = { name: string; host: string; port: number; username: string; password: string; ssl: boolean };
type AWSForm = { name: string; serverName: string; dataCenter: string; tenant: string; apiKey: string };
type CloudForm = { name: string; connectionName: string; environmentName: string; serverName: string; tm1AutomationUsername: string; tm1AutomationPassword: string; camNamespace: string };

const defaultLocal: LocalForm = { name: '', host: '', port: 8010, username: '', password: '', ssl: true };
const defaultAWS: AWSForm = { name: '', serverName: '', dataCenter: '', tenant: '', apiKey: '' };
const defaultCloud: CloudForm = { name: '', connectionName: '', environmentName: '', serverName: '', tm1AutomationUsername: '', tm1AutomationPassword: '', camNamespace: '' };

const EnvironmentsPage = () => {
  const { environments, addEnvironment, updateEnvironment, removeEnvironment } = useEnvironments();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [envType, setEnvType] = useState<EnvironmentType>('local');
  const [localForm, setLocalForm] = useState<LocalForm>(defaultLocal);
  const [awsForm, setAwsForm] = useState<AWSForm>(defaultAWS);
  const [cloudForm, setCloudForm] = useState<CloudForm>(defaultCloud);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  const resetForms = () => {
    setLocalForm(defaultLocal);
    setAwsForm(defaultAWS);
    setCloudForm(defaultCloud);
    setEnvType('local');
    setEditingId(null);
    setTestResult(null);
  };

  const openCreate = () => {
    resetForms();
    setOpen(true);
  };

  const openEdit = (env: PAEnvironment) => {
    setEditingId(env.id);
    setEnvType(env.type);
    setTestResult(null);
    if (env.type === 'local') {
      setLocalForm({ name: env.name, host: env.host, port: env.port, username: env.username, password: env.password, ssl: env.ssl });
    } else if (env.type === 'aws') {
      setAwsForm({ name: env.name, serverName: env.serverName, dataCenter: env.dataCenter, tenant: env.tenant, apiKey: env.apiKey });
    } else {
      setCloudForm({ name: env.name, connectionName: env.connectionName, environmentName: env.environmentName, serverName: env.serverName, tm1AutomationUsername: env.tm1AutomationUsername, tm1AutomationPassword: env.tm1AutomationPassword, camNamespace: env.camNamespace });
    }
    setOpen(true);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const formData = getFormData();
      const result = await testConnection(formData);
      setTestResult(result.success ? 'success' : 'error');
      toast({
        title: result.success ? 'Connection successful' : 'Connection failed',
        description: result.message,
        variant: result.success ? 'default' : 'destructive',
      });
    } catch (err: any) {
      setTestResult('error');
      toast({
        title: 'Connection failed',
        description: err.message || 'Could not reach the backend. Is Flask running?',
        variant: 'destructive',
      });
    } finally {
      setTesting(false);
    }
  };

  const getFormData = (): Omit<PAEnvironment, 'id' | 'createdAt'> => {
    if (envType === 'local') return { ...localForm, type: 'local' };
    if (envType === 'aws') return { ...awsForm, type: 'aws' };
    return { ...cloudForm, type: 'cloud' };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = getFormData();
    if (editingId) {
      updateEnvironment(editingId, data);
      toast({ title: 'Environment updated' });
    } else {
      addEnvironment(data);
      toast({ title: 'Environment created' });
    }
    resetForms();
    setOpen(false);
  };

  const getEnvSubtitle = (env: PAEnvironment) => {
    if (env.type === 'local') return `${env.host}:${env.port}`;
    if (env.type === 'aws') return `${env.serverName} • ${env.dataCenter}`;
    return `${env.serverName} • ${env.environmentName}`;
  };

  const getEnvIcon = (type: EnvironmentType) => {
    if (type === 'aws') return <Globe className="h-4 w-4 text-primary" />;
    if (type === 'cloud') return <Cloud className="h-4 w-4 text-primary" />;
    return <Monitor className="h-4 w-4 text-primary" />;
  };

  const getTypeBadge = (type: EnvironmentType) => {
    const labels = { local: 'Local', aws: 'AWS', cloud: 'Cloud' };
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
        {labels[type]}
      </span>
    );
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Environments</h1>
          <p className="text-muted-foreground mt-1">Manage your Planning Analytics connections</p>
        </div>

        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForms(); }}>
          <DialogTrigger asChild>
            <Button className="glow-primary" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add Environment
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Environment' : 'New Environment Connection'}</DialogTitle>
            </DialogHeader>

            {/* Type selector */}
            <div className="mt-4 space-y-2">
              <label className="text-sm font-medium">Connection Type</label>
              <RadioGroup value={envType} onValueChange={(v) => setEnvType(v as EnvironmentType)} className="flex gap-4">
                {(['local', 'aws', 'cloud'] as EnvironmentType[]).map(t => (
                  <label key={t} className={`flex items-center gap-2 cursor-pointer rounded-md border px-4 py-2.5 text-sm transition-colors ${envType === t ? 'border-primary bg-primary/5 text-foreground' : 'border-border text-muted-foreground hover:border-primary/30'}`}>
                    <RadioGroupItem value={t} />
                    {t === 'local' ? 'Local' : t === 'aws' ? 'AWS' : 'Cloud'}
                  </label>
                ))}
              </RadioGroup>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              {/* Common name field */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Display Name</label>
                <Input
                  value={envType === 'local' ? localForm.name : envType === 'aws' ? awsForm.name : cloudForm.name}
                  onChange={e => {
                    const v = e.target.value;
                    if (envType === 'local') setLocalForm(f => ({ ...f, name: v }));
                    else if (envType === 'aws') setAwsForm(f => ({ ...f, name: v }));
                    else setCloudForm(f => ({ ...f, name: v }));
                  }}
                  placeholder="e.g. Production, Dev, Staging"
                  required
                />
              </div>

              {/* LOCAL fields */}
              {envType === 'local' && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Host</label>
                    <Input value={localForm.host} onChange={e => setLocalForm(f => ({ ...f, host: e.target.value }))} placeholder="tm1server.company.com" required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">HTTP Port</label>
                      <Input type="number" value={localForm.port} onChange={e => setLocalForm(f => ({ ...f, port: parseInt(e.target.value) }))} required />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Username</label>
                      <Input value={localForm.username} onChange={e => setLocalForm(f => ({ ...f, username: e.target.value }))} placeholder="admin" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Password</label>
                    <Input type="password" value={localForm.password} onChange={e => setLocalForm(f => ({ ...f, password: e.target.value }))} required />
                  </div>
                  <div className="flex items-center justify-between rounded-md border border-border p-3">
                    <label className="text-sm font-medium">SSL Enabled</label>
                    <Switch checked={localForm.ssl} onCheckedChange={v => setLocalForm(f => ({ ...f, ssl: v }))} />
                  </div>
                </>
              )}

              {/* AWS fields */}
              {envType === 'aws' && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Server Name</label>
                    <Input value={awsForm.serverName} onChange={e => setAwsForm(f => ({ ...f, serverName: e.target.value }))} placeholder="pa-server-01" required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Data Center</label>
                      <Input value={awsForm.dataCenter} onChange={e => setAwsForm(f => ({ ...f, dataCenter: e.target.value }))} placeholder="us-east-1" required />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Tenant</label>
                      <Input value={awsForm.tenant} onChange={e => setAwsForm(f => ({ ...f, tenant: e.target.value }))} placeholder="my-tenant" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">API Key</label>
                    <Input type="password" value={awsForm.apiKey} onChange={e => setAwsForm(f => ({ ...f, apiKey: e.target.value }))} placeholder="Enter API key" required />
                  </div>
                </>
              )}

              {/* Cloud fields */}
              {envType === 'cloud' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Connection Name</label>
                      <Input value={cloudForm.connectionName} onChange={e => setCloudForm(f => ({ ...f, connectionName: e.target.value }))} required />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Environment Name</label>
                      <Input value={cloudForm.environmentName} onChange={e => setCloudForm(f => ({ ...f, environmentName: e.target.value }))} required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Server Name</label>
                    <Input value={cloudForm.serverName} onChange={e => setCloudForm(f => ({ ...f, serverName: e.target.value }))} required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">TM1 Automation Username</label>
                      <Input value={cloudForm.tm1AutomationUsername} onChange={e => setCloudForm(f => ({ ...f, tm1AutomationUsername: e.target.value }))} required />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">TM1 Automation Password</label>
                      <Input type="password" value={cloudForm.tm1AutomationPassword} onChange={e => setCloudForm(f => ({ ...f, tm1AutomationPassword: e.target.value }))} required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">CAM Namespace</label>
                    <Input value={cloudForm.camNamespace} onChange={e => setCloudForm(f => ({ ...f, camNamespace: e.target.value }))} required />
                  </div>
                </>
              )}

              {/* Test connection */}
              <div className="flex items-center gap-3 pt-2">
                <Button type="button" variant="outline" onClick={handleTestConnection} disabled={testing} className="flex-1">
                  {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : testResult === 'success' ? <CheckCircle2 className="h-4 w-4 mr-2 text-success" /> : testResult === 'error' ? <XCircle className="h-4 w-4 mr-2 text-destructive" /> : null}
                  {testing ? 'Testing…' : 'Test Connection'}
                </Button>
              </div>

              <Button type="submit" className="w-full">{editingId ? 'Update Connection' : 'Create Connection'}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {environments.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Globe className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">No environments yet</h3>
            <p className="text-muted-foreground mt-1 max-w-sm">
              Add your first Planning Analytics environment to get started with migrations.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {environments.map(env => (
            <Card key={env.id} className="group hover:border-primary/30 transition-colors">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center">
                    {getEnvIcon(env.type)}
                  </div>
                  <div>
                    <CardTitle className="text-base">{env.name}</CardTitle>
                    <p className="text-sm text-muted-foreground font-mono">{getEnvSubtitle(env)}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground h-8 w-8"
                    onClick={() => openEdit(env)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive h-8 w-8"
                    onClick={() => removeEnvironment(env.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  {getTypeBadge(env.type)}
                  {env.type === 'local' && (
                    <>
                      <span>User: <span className="font-mono text-foreground">{env.username}</span></span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${env.ssl ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                        {env.ssl ? 'SSL' : 'No SSL'}
                      </span>
                    </>
                  )}
                  {env.type === 'aws' && <span>Tenant: <span className="font-mono text-foreground">{env.tenant}</span></span>}
                  {env.type === 'cloud' && <span>NS: <span className="font-mono text-foreground">{env.camNamespace}</span></span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default EnvironmentsPage;
