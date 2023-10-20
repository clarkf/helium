import Connect from "./app/Connect";

import "./App.css";
import { useApp } from "./state";

export default function App() {
  const state = useApp((s) => ({ rooms: s.rooms, connection: s.connection }));

  return (
    <>
      <h1>Helium</h1>

      <Connect />

      <div>
        <h4>State</h4>
        <code>
          <pre>{JSON.stringify(state, null, 4)}</pre>
        </code>
      </div>
    </>
  );
}
