const { spawn } = require('child_process');

// Use shell commands to avoid Windows spawn EINVAL
const backend = spawn('npm run start:backend', {
  stdio: 'inherit',
  shell: true
});

const frontend = spawn('npm run start:frontend', {
  stdio: 'inherit',
  shell: true
});

backend.on('close', (code) => {
  console.log(`Backend process exited with code ${code}`);
});

frontend.on('close', (code) => {
  console.log(`Frontend process exited with code ${code}`);
});
