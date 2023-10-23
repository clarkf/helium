import { useApp } from "./state";

import Connect from "./app/Connect";
import Sidebar from "./app/Sidebar";

export default function App() {
  const isConnected = useApp((s) => s.connection != null);
  const isSyncing = useApp((s) => s.rooms === null);
  const state = useApp((s) => ({ rooms: s.rooms, connection: s.connection }));

  if (!isConnected) {
    return <ConnectScreen />;
  }

  if (isSyncing) {
    return <SyncingScreen />;
  }

  // We're connected and have synced
  return (
    <div className="two-column">
      <Sidebar />
      <main>
        <h4>State</h4>
        <code>
          <pre>{JSON.stringify(state, null, 4)}</pre>
        </code>
      </main>
    </div>
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
  return (
    <FullScreen>
      <h2>Syncing...</h2>
      <p>Please hold, initial synchronization is in progress.</p>
    </FullScreen>
  );
}

function FullScreen({ children }: React.PropsWithChildren): JSX.Element {
  return (
    <div className="full-screen">
      <div>{children}</div>
    </div>
  );
}
