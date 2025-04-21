import React from 'react';
import { Text } from 'ink';
import { AgentStatus } from '@lightfast/core';

interface AgentStatusIndicatorProps {
  status: AgentStatus;
}

export const AgentStatusIndicator: React.FC<AgentStatusIndicatorProps> = ({ status }) => {
  let color = 'gray';
  let symbol = '●';
  
  switch (status) {
    case AgentStatus.CONNECTED:
      color = 'green';
      break;
    case AgentStatus.DISCONNECTED:
      color = 'gray';
      break;
    case AgentStatus.BUSY:
      color = 'yellow';
      break;
    case AgentStatus.ERROR:
      color = 'red';
      break;
  }
  
  return <Text color={color}>{symbol}</Text>;
};
