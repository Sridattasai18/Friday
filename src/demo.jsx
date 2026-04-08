// FRIDAY v2 UI demo — delete after migration
import React, { useMemo, useState } from 'react';
import { Box, Text, render, useInput } from 'ink';
import cfonts from 'cfonts';

const C = {
  accent: '#34d399',
  bright: '#6ee7b7',
  muted: '#d1fae5',
  dim: '#4b5563',
};

const COMMANDS = [
  { name: '/add', desc: 'Add a task or habit' },
  { name: '/done', desc: 'Mark item done' },
  { name: '/skip', desc: 'Skip a habit' },
  { name: '/list', desc: 'Show all tasks' },
  { name: '/streak', desc: 'Show habit streaks' },
  { name: '/clear', desc: 'Remove completed tasks' },
  { name: '/help', desc: 'Show help' },
  { name: '/exit', desc: 'Quit F.R.I.D.A.Y' },
];

function App() {
  const [input, setInput] = useState('');
  const [echo, setEcho] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const dateText = useMemo(() => new Date().toLocaleString(), []);

  const updateSuggestions = (nextInput) => {
    if (!nextInput.startsWith('/')) {
      setShowSuggestions(false);
      setSuggestions([]);
      setSelectedIndex(0);
      return;
    }

    const filtered = COMMANDS.filter((cmd) => cmd.name.startsWith(nextInput));
    setSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
    setSelectedIndex(0);
  };

  const applySuggestion = () => {
    if (!showSuggestions || suggestions.length === 0) return false;
    const selected = suggestions[selectedIndex] || suggestions[0];
    setInput(selected.name);
    updateSuggestions(selected.name);
    return true;
  };

  useInput((keyInput, key) => {
    if (key.ctrl && keyInput === 'c') {
      process.exit(0);
    }

    if (key.backspace || key.delete) {
      const nextInput = input.slice(0, -1);
      setInput(nextInput);
      updateSuggestions(nextInput);
      return;
    }

    if (key.upArrow && showSuggestions && suggestions.length > 0) {
      setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
      return;
    }

    if (key.downArrow && showSuggestions && suggestions.length > 0) {
      setSelectedIndex((prev) => (prev + 1) % suggestions.length);
      return;
    }

    if (key.tab) {
      applySuggestion();
      return;
    }

    if (key.return) {
      if (showSuggestions && suggestions.length > 0) {
        const completed = applySuggestion();
        if (completed) return;
      }

      const submitted = input.trim();
      if (submitted) {
        setEcho(submitted);
        if (submitted === '/exit') {
          process.exit(0);
        }
      }

      setInput('');
      setShowSuggestions(false);
      setSuggestions([]);
      setSelectedIndex(0);
      return;
    }

    if (keyInput) {
      const nextInput = input + keyInput;
      setInput(nextInput);
      updateSuggestions(nextInput);
    }
  });

  return (
    <Box flexDirection="column">
      <Box>
        <Text color={C.dim}>{dateText}</Text>
        <Text color={C.dim}>  ·  </Text>
        <Text color={C.accent}>3 tasks today</Text>
      </Box>

      <Box />

      <Box flexDirection="column">
        <Text color={C.bright}>Tasks</Text>
        <Text color={C.dim}>────────────</Text>
        <Box>
          <Text color={C.accent}>[✓] </Text>
          <Text color={C.dim} strikethrough>
            Review DSA notes
          </Text>
        </Box>
        <Box>
          <Text color={C.accent}>[·] </Text>
          <Text color={C.bright}>Build Ink demo</Text>
        </Box>
        <Box>
          <Text color={C.accent}>[·] </Text>
          <Text color={C.bright}>Push Neo-folio update</Text>
        </Box>
      </Box>

      <Box />

      {echo ? (
        <Text color={C.dim}>echo: {echo}</Text>
      ) : null}

      {showSuggestions ? (
        <Box flexDirection="column" borderStyle="single" borderColor={C.dim} paddingX={1}>
          {suggestions.map((item, idx) => {
            const selected = idx === selectedIndex;
            return (
              <Text key={item.name} color={selected ? C.accent : C.dim}>
                {selected ? '› ' : '  '}
                {item.name} - {item.desc}
              </Text>
            );
          })}
        </Box>
      ) : null}

      <Box>
        <Text color={C.accent}>› </Text>
        <Text color="white">{input}</Text>
      </Box>
    </Box>
  );
}

cfonts.say('FRIDAY', {
  font: 'block',
  colors: ['#34d399'],
  background: 'transparent',
  letterSpacing: 1,
});

render(<App />);
