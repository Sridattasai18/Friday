#!/usr/bin/env node
import('../src/app.jsx').catch((err) => {
  console.error('Failed to start F.R.I.D.A.Y:', err);
  process.exit(1);
});
