'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { type Instance } from '@/lib/api-client';
import { Terminal, Send, Loader2, X } from 'lucide-react';

interface CommandTerminalProps {
  instance: Instance;
  onExecuteCommand: (instanceId: string, command: string) => Promise<{ stdout: string; stderr: string; exitCode: number }>;
}

interface CommandHistory {
  command: string;
  output: string;
  exitCode: number;
  timestamp: Date;
}

const CommandTerminal: React.FC<CommandTerminalProps> = ({ instance, onExecuteCommand }) => {
  const [command, setCommand] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [history, setHistory] = useState<CommandHistory[]>([]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const outputRef = useRef<HTMLDivElement>(null);

  // Common commands for quick access
  const commonCommands = [
    'ls -la',
    'pwd',
    'git status',
    'git log --oneline -10',
    'npm install',
    'npm start',
    'python3 --version',
    'node --version',
  ];

  const executeCommand = async (cmd: string) => {
    if (!cmd.trim()) return;

    setIsExecuting(true);
    const timestamp = new Date();

    try {
      const result = await onExecuteCommand(instance.id, cmd);
      const output = result.stdout + (result.stderr ? `\nSTDERR:\n${result.stderr}` : '');
      
      const newEntry: CommandHistory = {
        command: cmd,
        output,
        exitCode: result.exitCode,
        timestamp,
      };

      setHistory(prev => [...prev, newEntry]);
      
      // Add to command history for up/down arrow navigation
      setCommandHistory(prev => {
        const newHistory = [cmd, ...prev.filter(h => h !== cmd)];
        return newHistory.slice(0, 50); // Keep last 50 commands
      });
      
      setCommand('');
      setHistoryIndex(-1);
    } catch (error) {
      const errorEntry: CommandHistory = {
        command: cmd,
        output: `Error: ${error instanceof Error ? error.message : String(error)}`,
        exitCode: 1,
        timestamp,
      };
      setHistory(prev => [...prev, errorEntry]);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeCommand(command);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex < commandHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setCommand(commandHistory[newIndex] || '');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCommand(commandHistory[newIndex] || '');
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCommand('');
      }
    }
  };

  const clearHistory = () => {
    setHistory([]);
  };

  // Auto-scroll to bottom when new output is added
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [history]);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Terminal className="h-5 w-5" />
          Terminal - {instance.name}
        </CardTitle>
        <CardDescription>
          Execute commands on your Vercel Sandbox
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0">
        {/* Quick Commands */}
        <div className="px-6 pb-4">
          <p className="text-sm text-muted-foreground mb-2">Quick Commands:</p>
          <div className="flex flex-wrap gap-2">
            {commonCommands.map((cmd) => (
              <Button
                key={cmd}
                size="sm"
                variant="outline"
                onClick={() => executeCommand(cmd)}
                disabled={isExecuting}
                className="text-xs"
              >
                {cmd}
              </Button>
            ))}
          </div>
        </div>

        {/* Command Output */}
        <div 
          ref={outputRef}
          className="flex-1 overflow-y-auto bg-black text-green-400 font-mono text-sm p-4 mx-6 rounded border min-h-[300px] max-h-[500px]"
        >
          {history.length === 0 ? (
            <div className="text-gray-500">
              Welcome to the Vercel Sandbox terminal. Type a command and press Enter.
            </div>
          ) : (
            history.map((entry, index) => (
              <div key={index} className="mb-4">
                <div className="text-blue-400">
                  $ {entry.command}
                </div>
                {entry.output && (
                  <pre className={`whitespace-pre-wrap mt-1 ${
                    entry.exitCode !== 0 ? 'text-red-400' : 'text-green-400'
                  }`}>
                    {entry.output}
                  </pre>
                )}
                <div className="text-gray-600 text-xs mt-1">
                  Exit code: {entry.exitCode} • {entry.timestamp.toLocaleTimeString()}
                </div>
              </div>
            ))
          )}
          {isExecuting && (
            <div className="flex items-center gap-2 text-yellow-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Executing...
            </div>
          )}
        </div>

        {/* Command Input */}
        <div className="p-6 pt-4 border-t">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 bg-black text-green-400 font-mono rounded px-3 py-2 border">
              <span className="text-blue-400">$</span>
              <Input
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter command..."
                disabled={isExecuting}
                className="flex-1 bg-transparent border-none p-0 text-green-400 placeholder:text-gray-600 focus:ring-0"
              />
            </div>
            <Button
              type="submit"
              disabled={isExecuting || !command.trim()}
            >
              {isExecuting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={clearHistory}
              disabled={history.length === 0}
            >
              <X className="h-4 w-4" />
            </Button>
          </form>
          <p className="text-xs text-muted-foreground mt-2">
            Use ↑/↓ arrow keys to navigate command history
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default CommandTerminal;