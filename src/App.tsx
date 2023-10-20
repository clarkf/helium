import Connect from "./app/Connect";

import { useApp } from "./state";

export default function App() {
  const state = useApp((s) => ({ rooms: s.rooms, connection: s.connection }));

  return (
    <>
      <FullScreen>
        <h1>Welcome to Helium</h1>
        <Connect />
        <div>
          <h4>State</h4>
          <code>
            <pre>{JSON.stringify(state, null, 4)}</pre>
          </code>
        </div>
      </FullScreen>
    </>
  );
}

function FullScreen({ children }: React.PropsWithChildren): JSX.Element {
  return (
    <div className="full-screen">
      <div>{children}</div>
    </div>
  );
}
