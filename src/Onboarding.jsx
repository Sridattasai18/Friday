import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { saveConfig } from '../core/config.js';
import { getResponse } from '../core/personality.js';

const styles = ['dry', 'warm', 'casual'];

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [styleIndex, setStyleIndex] = useState(0);

  useInput((input, key) => {
    if (step === 0) {
      if (key.return) {
        if (!name.trim()) return;
        setStep(1);
        return;
      }
      if (key.backspace || key.delete) {
        setName((prev) => prev.slice(0, -1));
        return;
      }
      if (input && !key.ctrl && !key.meta) {
        setName((prev) => prev + input);
      }
      return;
    }

    if (key.upArrow) {
      setStyleIndex((prev) => (prev - 1 + styles.length) % styles.length);
      return;
    }
    if (key.downArrow) {
      setStyleIndex((prev) => (prev + 1) % styles.length);
      return;
    }
    if (key.return) {
      saveConfig({
        firstLaunch: false,
        name: name.trim(),
        greetingStyle: styles[styleIndex],
      });
      onComplete();
    }
  });

  const selectedStyle = styles[styleIndex];

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="yellow" paddingX={1}>
      <Text>  First-time setup  </Text>
      <Text>  {'-'.repeat(24)}  </Text>
      {step === 0 ? (
        <>
          <Text>  What should I call you?  </Text>
          <Box>
            <Text>  {'>'} </Text>
            <Text>{name || ''}</Text>
            <Text>▌</Text>
          </Box>
          <Text>  Press ENTER to continue  </Text>
        </>
      ) : (
        <>
          <Text>  Pick a greeting style:  </Text>
          {styles.map((style, idx) => (
            <Text key={style}>
              {idx === styleIndex ? '  › ' : '    '}
              [{style}]
            </Text>
          ))}
          <Text> </Text>
          <Text>  {getResponse('greetingPreview', { style: selectedStyle })}  </Text>
          <Text>  Press ENTER to finish  </Text>
        </>
      )}
    </Box>
  );
}
