const { spawn } = require('child_process');

// Start the backend (Flask)
const backend = spawn('python', ['backend/app.py'], {
  stdio: 'inherit',
  shell: true
});

// Start the frontend (React)
const frontend = spawn('npm', ['run', 'start'], {
  stdio: 'inherit',
  shell: true
});

backend.on('close', (code) => {
  console.log(`Backend process exited with code ${code}`);
});

frontend.on('close', (code) => {
  console.log(`Frontend process exited with code ${code}`);
});
