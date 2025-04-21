import type { MCPAgent } from '@lightfast/core';
import { Box, Text } from 'ink';
import type React from 'react';
import { AgentStatusIndicator } from './AgentStatus';

interface DashboardProps {
  agents: MCPAgent[];
  onSelectAgent: (agentId: string | null) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ agents, onSelectAgent }) => {
  return (
    <Box flexDirection="column" borderStyle="single" padding={1}>
      <Text bold>Connected Agents</Text>

      {agents.length === 0 ? (
        <Text>No agents connected</Text>
      ) : (
        agents.map((agent) => (
          <Box key={agent.id} marginY={1}>
            <AgentStatusIndicator status={agent.status} />
            <Text>
              {' '}
              {agent.name} ({agent.type})
            </Text>
            <Box marginLeft={1}>
              <Text dimColor>[{agent.id}]</Text>
            </Box>
          </Box>
        ))
      )}
    </Box>
  );
};
