import { Box, Text, useInput } from 'ink';
import type React from 'react';
import { useState } from 'react';

interface CommandInputProps {
  onSubmit: (command: string) => void;
  disabled?: boolean;
}

export const CommandInput: React.FC<CommandInputProps> = ({ onSubmit, disabled = false }) => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  useInput((input, key) => {
    if (disabled) return;

    if (key.return) {
      if (input.trim() !== '') {
        onSubmit(input);
        setHistory((prev) => [input, ...prev].slice(0, 50));
        setInput('');
        setHistoryIndex(-1);
      }
    } else if (key.backspace || key.delete) {
      setInput((prev) => prev.slice(0, -1));
    } else if (key.upArrow) {
      if (historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setInput(history[newIndex]);
      }
    } else if (key.downArrow) {
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(history[newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput('');
      }
    } else if (input) {
      setInput((prev) => prev + input);
    }
  });

  return (
    <Box flexDirection="column" borderStyle="single" padding={1}>
      <Text bold>Command Input {disabled && '(No agent selected)'}</Text>
      <Box>
        <Text color={disabled ? 'gray' : 'green'}>{'>'} </Text>
        <Text>{input}</Text>
      </Box>
    </Box>
  );
};
