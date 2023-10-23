import { getThumbnailUrl, parseMxcUrl } from "../matrix";
import { useApp } from "../state";

export default function Sidebar(): JSX.Element {
  const rooms = useRooms();
  return (
    <div className="sidebar">
      <h3>Rooms</h3>
      <ul className="nav">
        {rooms.map((r) => (
          <RoomLink key={r.id} {...r} />
        ))}
      </ul>
    </div>
  );
}

function useRooms() {
  return useApp(
    (s) =>
      Object.entries(s.rooms ?? {}).map(([id, state]) => ({
        id,
        name: state.name ?? state.canonical_alias,
        avatar: state.avatar,
      })),
    // TODO: Equality
  );
}

function RoomLink({
  id,
  name,
  avatar,
}: {
  id: string;
  name: string | undefined;
  avatar: string | undefined;
}): JSX.Element {
  const label = name ?? id;

  return (
    <li key={id}>
      <a href="#tbd">
        {avatar ? <RoomAvatar url={avatar} /> : null}
        {label}
      </a>
    </li>
  );
}

function RoomAvatar({ url }: { url: string }): JSX.Element {
  const connection = useApp((s) => s.connection);
  if (!connection) throw new Error("no connection! how did we get here?");

  // handle mxc:// url
  if (url.startsWith("mxc://")) {
    const { serverName, mediaId } = parseMxcUrl(url);
    const actualUrl = getThumbnailUrl(connection, serverName, mediaId);
    return <img src={actualUrl.toString()} width={32} height={32} />;
  }

  // This probably shouldn't happen
  return <img src={url} width={32} height={32} />;
}
