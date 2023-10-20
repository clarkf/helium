import { useState } from "react";

import { discover, login } from "../matrix";

interface Props {
  onConnect?: () => void;
}

export default function Connect({ onConnect }: Props): JSX.Element {
  const [host, setHost] = useState("");
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    connect(host, userId, password)
      .then(() => onConnect?.())
      .catch((e) => setError(e.toString()));
  }

  return (
    <form onSubmit={handleSubmit}>
      {error ? <div role="alert">{error}</div> : null}
      <div>
        <label htmlFor="connect-host">Host</label>
        <input
          id="connect-host"
          type="text"
          value={host}
          onChange={(e) => setHost(e.currentTarget.value)}
        />
      </div>

      <div>
        <label htmlFor="connect-user">User ID</label>
        <input
          id="connect-user"
          type="text"
          value={userId}
          onChange={(e) => setUserId(e.currentTarget.value)}
        />
      </div>

      <div>
        <label htmlFor="connect-password">Password</label>
        <input
          id="connect-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.currentTarget.value)}
        />
      </div>

      <div>
        <button type="submit">Connect</button>
      </div>
    </form>
  );
}

async function connect(
  host: string,
  user: string,
  password: string,
): Promise<void> {
  const discovery = await discover(host);
  const token = await login(discovery, user, password);

  console.debug({ discovery, token });
}
