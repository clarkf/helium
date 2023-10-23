import { useApp } from "../state";

export default function Sidebar(): JSX.Element {
  const rooms = useRooms();
  return (
    <div className="sidebar">
      <h3>Rooms</h3>
      <ul className="nav">
        {rooms.map((r) => (
          <RoomLink key={r.id} id={r.id} name={r.name} />
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
        name: state.name,
      })),
    // TODO: Equality
  );
}

function RoomLink({
  id,
  name,
}: {
  id: string;
  name: string | undefined;
}): JSX.Element {
  const label = name ?? id;

  return (
    <li key={id}>
      <a href="#tbd">{label}</a>
    </li>
  );
}
