import { CommunicationManager } from '@lightfast/core';
import { Box, Text } from 'ink';
import type React from 'react';
import { useEffect, useState } from 'react';
import { CommandInput } from './components/CommandInput';
import { Dashboard } from './components/Dashboard';

export const App: React.FC = () => {
  const [manager] = useState(() => new CommunicationManager());
  const [agents, setAgents] = useState<ReturnType<CommunicationManager['getAgents']>>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  useEffect(() => {
    // Update agents list periodically
    const interval = setInterval(() => {
      setAgents(manager.getAgents());
    }, 1000);

    return () => clearInterval(interval);
  }, [manager]);

  const handleCommand = async (command: string) => {
    if (selectedAgent) {
      await manager.sendMessage(selectedAgent, command);
    }
  };

  return (
    <Box flexDirection="column">
      <Box borderStyle="single" padding={1} flexDirection="column">
        <Text bold>Lightfast Computer</Text>
        <Text>Integrated control for creative software</Text>
      </Box>

      <Dashboard agents={agents} onSelectAgent={setSelectedAgent} />

      <CommandInput onSubmit={handleCommand} disabled={!selectedAgent} />
    </Box>
  );
};
