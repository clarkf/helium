import Connect from "./app/Connect";

import { useApp } from "./state";

export default function App() {
  const isConnected = useApp((s) => s.connection != null);
  const isSyncing = useApp((s) => Object.keys(s.rooms).length < 1);
  const state = useApp((s) => ({ rooms: s.rooms, connection: s.connection }));

  if (!isConnected) {
    return <ConnectScreen />;
  }

  if (isSyncing) {
    return <SyncingScreen />;
  }

  // We're connected and have synced
  return (
    <FullScreen>
      <h4>State</h4>
      <code>
        <pre>{JSON.stringify(state, null, 4)}</pre>
      </code>
    </FullScreen>
  );
}

function ConnectScreen(): JSX.Element {
  return (
    <FullScreen>
      <h1>Welcome to Helium</h1>
      <Connect />
    </FullScreen>
  );
}

function SyncingScreen(): JSX.Element {
  return <p>Please hold, initial synchronization is in process.</p>;
}

function FullScreen({ children }: React.PropsWithChildren): JSX.Element {
  return (
    <div className="full-screen">
      <div>{children}</div>
    </div>
  );
}
