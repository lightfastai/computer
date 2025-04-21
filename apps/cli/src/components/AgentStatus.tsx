import type { AgentStatus } from '@lightfast/core/src/schemas';
import { Text } from 'ink';
import type React from 'react';

interface AgentStatusIndicatorProps {
  status: AgentStatus;
}

export const AgentStatusIndicator: React.FC<AgentStatusIndicatorProps> = ({ status }) => {
  let color = 'gray';
  const symbol = '●';

  switch (status) {
    case 'connected':
      color = 'green';
      break;
    case 'disconnected':
      color = 'gray';
      break;
    case 'busy':
      color = 'yellow';
      break;
    case 'error':
      color = 'red';
      break;
  }

  return <Text color={color}>{symbol}</Text>;
};
