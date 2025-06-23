'use client';

import type { Instance } from '@lightfastai/computer';
import { Circle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface InstanceListProps {
  instances: Instance[];
  selectedInstance: Instance | null;
  onSelectInstance: (instance: Instance) => void;
  onDestroyInstance: (id: string) => void;
  onRefresh: () => void;
  loading: boolean;
}

export const InstanceList = ({
  instances,
  selectedInstance,
  onSelectInstance,
  onDestroyInstance,
  onRefresh,
  loading,
}: InstanceListProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Instances</CardTitle>
        <CardDescription>Manage your running instances</CardDescription>
        <CardAction>
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {instances.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">No instances found. Create one to get started.</div>
        ) : (
          <div className="space-y-3">
            {instances.map((instance) => (
              <div
                key={instance.id}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedInstance?.id === instance.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent'
                }`}
                onClick={() => onSelectInstance(instance)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{instance.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {instance.status} • {instance.region} • {instance.size}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Circle
                      className={`h-3 w-3 ${
                        instance.status === 'started'
                          ? 'text-green-500 fill-green-500'
                          : instance.status === 'stopped'
                            ? 'text-gray-500 fill-gray-500'
                            : 'text-yellow-500 fill-yellow-500'
                      }`}
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDestroyInstance(instance.id);
                      }}
                      disabled={loading}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Destroy
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
