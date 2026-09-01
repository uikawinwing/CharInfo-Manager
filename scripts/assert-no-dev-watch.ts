import net from 'node:net';

const DEV_WATCH_PORT = 6621;

function isPortOpen(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const socket = net.createConnection({ host: '127.0.0.1', port });
    const finish = (open: boolean) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(open);
    };

    socket.setTimeout(350);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
  });
}

async function main(): Promise<void> {
  if (await isPortOpen(DEV_WATCH_PORT)) {
    throw new Error(
      `Dev watcher detected on port ${DEV_WATCH_PORT}. Stop the existing pnpm watch before starting another watcher or a public build so dist cannot be overwritten concurrently.`,
    );
  }

  console.info('[build] no active dev watcher detected');
}

void main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
