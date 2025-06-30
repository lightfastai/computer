'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate, getStatusBadgeColor } from '@/lib/utils';
import { type Instance } from '@/lib/api-client';
import { 
  Play, 
  Square, 
  Trash2, 
  RefreshCw, 
  Terminal, 
  FolderOpen, 
  ExternalLink,
  Loader2 
} from 'lucide-react';

interface SandboxListProps {
  instances: Instance[];
  onStart: (id: string) => Promise<void>;
  onStop: (id: string) => Promise<void>;
  onRestart: (id: string) => Promise<void>;
  onDestroy: (id: string) => Promise<void>;
  onSelectInstance: (instance: Instance) => void;
  loadingStates: Record<string, boolean>;
}

const SandboxList: React.FC<SandboxListProps> = ({
  instances,
  onStart,
  onStop,
  onRestart,
  onDestroy,
  onSelectInstance,
  loadingStates,
}) => {
  if (instances.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No sandboxes created yet.</p>
            <p className="text-sm">Create your first sandbox to get started.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {instances.map((instance) => (
        <Card key={instance.id} className="transition-all hover:shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{instance.name}</CardTitle>
                <CardDescription>
                  Created {formatDate(instance.createdAt)} • ID: {instance.id}
                </CardDescription>
              </div>
              <Badge className={getStatusBadgeColor(instance.status)}>
                {instance.status}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              {instance.status === 'stopped' && (
                <Button
                  size="sm"
                  onClick={() => onStart(instance.id)}
                  disabled={loadingStates[instance.id]}
                >
                  {loadingStates[instance.id] ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  Start
                </Button>
              )}
              
              {instance.status === 'running' && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onStop(instance.id)}
                    disabled={loadingStates[instance.id]}
                  >
                    {loadingStates[instance.id] ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                    Stop
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onSelectInstance(instance)}
                  >
                    <Terminal className="h-4 w-4" />
                    Terminal
                  </Button>
            
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onSelectInstance(instance)}
                  >
                    <FolderOpen className="h-4 w-4" />
                    Files
                  </Button>
                </>
              )}
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => onRestart(instance.id)}
                disabled={loadingStates[instance.id]}
              >
                {loadingStates[instance.id] ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Restart
              </Button>
              
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onDestroy(instance.id)}
                disabled={loadingStates[instance.id]}
              >
                {loadingStates[instance.id] ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Destroy
              </Button>
              
            </div>
            
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default SandboxList;