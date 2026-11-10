import { useState, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { HardDrive, Download, Trash2, Upload, AlertTriangle, RefreshCcw, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { api, getAuthToken } from '@/lib/api';

const fmtDate = (d: string) => d ? format(new Date(d), "dd/MM/yyyy HH:mm", { locale: ptBR }) : '—';
const fmtSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

interface BackupFile { filename: string; size_bytes: number; created_at: string; }
interface BackupHistory { id: string; filename: string; size_bytes: number; status: string; created_at: string; }

export const BackupManagement = () => {
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [history, setHistory] = useState<BackupHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<{ backups: BackupFile[]; history: BackupHistory[] }>('/backup/list');
      setBackups(data.backups || []);
      setHistory(data.history || []);
      setLoaded(true);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao carregar backups');
    } finally {
      setLoading(false);
    }
  }, []);

  const createBackup = async () => {
    setCreating(true);
    try {
      const result = await api.post<{ message: string; filename: string; size_bytes: number }>('/backup/create');
      toast.success(`Backup criado: ${result.filename} (${fmtSize(result.size_bytes)})`);
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao criar backup. Verifique se pg_dump está instalado.');
    } finally {
      setCreating(false);
    }
  };

  const downloadBackup = (filename: string) => {
    const token = getAuthToken();
    const serverUrl = (api.getServerUrl as any)();
    const url = `${serverUrl}/api/backup/download/${encodeURIComponent(filename)}`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      })
      .catch(() => toast.error('Erro ao baixar backup'));
  };

  const deleteBackup = async (filename: string) => {
    try {
      await api.delete(`/backup/${encodeURIComponent(filename)}`);
      toast.success('Backup removido');
      setDeletingFile(null);
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao remover backup');
    }
  };

  const handleRestoreUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.sql')) {
      toast.error('Apenas arquivos .sql são aceitos');
      return;
    }
    setRestoreFile(file);
    setShowRestoreDialog(true);
  };

  const restoreBackup = async () => {
    if (!restoreFile) return;
    setRestoring(true);
    try {
      const formData = new FormData();
      formData.append('backup_file', restoreFile);
      await api.post('/backup/restore', formData);
      toast.success('Banco restaurado com sucesso! Por favor, reinicie o servidor.');
      setShowRestoreDialog(false);
      setRestoreFile(null);
    } catch (e: any) {
      toast.error(e?.message || 'Erro na restauração');
    } finally {
      setRestoring(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header actions */}
      <div className="flex gap-3 flex-wrap">
        <Button onClick={createBackup} disabled={creating} className="gap-2">
          {creating ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <HardDrive className="w-4 h-4" />}
          {creating ? 'Criando backup...' : 'Fazer Backup Agora'}
        </Button>
        <Button variant="outline" onClick={load} disabled={loading} className="gap-2">
          <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar Lista
        </Button>
        <div className="relative">
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="gap-2 border-orange-500 text-orange-600 hover:bg-orange-50"
          >
            <Upload className="w-4 h-4" />
            Restaurar Backup
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".sql"
            className="hidden"
            onChange={handleRestoreUpload}
          />
        </div>
      </div>

      {/* Backups list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-primary" />
            Backups Disponíveis
          </CardTitle>
          <CardDescription>
            Arquivos de backup armazenados localmente. Use "Fazer Backup Agora" para criar um novo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!loaded ? (
            <div className="text-center py-8">
              <Button variant="ghost" onClick={load} disabled={loading}>
                {loading ? 'Carregando...' : 'Clique para carregar backups'}
              </Button>
            </div>
          ) : backups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <HardDrive className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum backup encontrado.</p>
              <p className="text-sm">Clique em "Fazer Backup Agora" para criar o primeiro.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Arquivo</TableHead>
                  <TableHead>Tamanho</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backups.map(b => (
                  <TableRow key={b.filename}>
                    <TableCell className="font-mono text-sm">{b.filename}</TableCell>
                    <TableCell>{fmtSize(b.size_bytes)}</TableCell>
                    <TableCell>{fmtDate(b.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="outline" onClick={() => downloadBackup(b.filename)} className="gap-1.5">
                          <Download className="w-3.5 h-3.5" />
                          Download
                        </Button>
                        <Button
                          size="sm" variant="ghost"
                          onClick={() => setDeletingFile(b.filename)}
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* History */}
      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Histórico de Backups</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Arquivo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.slice(0, 20).map(h => (
                  <TableRow key={h.id}>
                    <TableCell className="font-mono text-sm">{h.filename}</TableCell>
                    <TableCell>
                      <Badge variant={h.status === 'completed' || h.status === 'restored' ? 'default' : 'destructive'}>
                        {h.status === 'completed' ? '✓ Completo' : h.status === 'restored' ? '↩ Restaurado' : '✗ Falho'}
                      </Badge>
                    </TableCell>
                    <TableCell>{fmtDate(h.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Delete confirmation */}
      <Dialog open={!!deletingFile} onOpenChange={open => { if (!open) setDeletingFile(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover Backup</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover o arquivo <span className="font-mono">{deletingFile}</span>?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingFile(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deletingFile && deleteBackup(deletingFile)}>Remover</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore confirmation — dupla confirmação */}
      <Dialog open={showRestoreDialog} onOpenChange={open => { if (!open) { setShowRestoreDialog(false); setRestoreFile(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Confirmar Restauração
            </DialogTitle>
            <DialogDescription>
              <span className="block text-base font-semibold text-foreground mb-2">⚠️ Esta é uma operação DESTRUTIVA e irreversível.</span>
              Todos os dados atuais serão <strong>substituídos</strong> pelo conteúdo do backup. Não é possível recuperar os dados depois desta operação.
              <span className="block mt-3">
                Arquivo: <span className="font-mono text-foreground">{restoreFile?.name}</span><br />
                Tamanho: {restoreFile ? fmtSize(restoreFile.size) : '—'}
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row">
            <Button variant="outline" onClick={() => { setShowRestoreDialog(false); setRestoreFile(null); }} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={restoreBackup}
              disabled={restoring}
              className="w-full sm:w-auto"
            >
              {restoring ? 'Restaurando...' : 'Confirmar — Substituir todos os dados'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
