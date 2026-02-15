import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, ClipboardList } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDateFR, formatTimeFR } from '@/lib/formatters';
import { useAuth } from '@/hooks/useAuth';

interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
  profiles: { full_name: string; email: string } | null;
}

export default function AuditLogs() {
  const { role } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('audit_logs')
        .select('*, profiles!audit_logs_user_id_fkey(full_name, email)')
        .order('created_at', { ascending: false })
        .limit(100);
      if (data) setLogs(data as unknown as AuditLog[]);
      setLoading(false);
    };
    load();
  }, []);

  if (role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Accès réservé aux administrateurs</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Journal d'Audit</h1>
        <p className="text-muted-foreground text-sm mt-1">Historique des actions des utilisateurs</p>
      </div>

      {logs.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="p-12 text-center">
            <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Aucun log d'audit pour le moment</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs font-medium uppercase tracking-wide">Date</TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wide">Utilisateur</TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wide">Action</TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wide">Entité</TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wide">Détails</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm text-muted-foreground font-mono">
                      {formatDateFR(log.created_at)} {formatTimeFR(log.created_at)}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {log.profiles?.full_name || log.profiles?.email || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">{log.action}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{log.entity_type}</TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono max-w-48 truncate">
                      {log.details ? JSON.stringify(log.details) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
