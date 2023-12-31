/** Alias for indicating a type is a room id, e.g. !room:host */
export type RoomId = string;

/** Alias for indicating a type is a user id, e.g. @user:host */
export type UserId = string;

export interface Connection {
  discovery: DiscoveryInformation;
  token: LoginResponse;
}

export interface DiscoveryInformation {
  "m.homeserver": { base_url: string };
}

interface UserUserIdentifier {
  type: "m.id.user";
  user: string;
}

type UserIdentifier = UserUserIdentifier;

interface LoginPasswordRequest {
  type: "m.login.password";
  identifier: UserIdentifier;
  password: string;
}

export interface LoginResponse {
  access_token: string;
}

export interface SyncResponse {
  next_batch: string;
  rooms?: {
    join?: Record<
      RoomId,
      {
        state?: { events?: ClientEventWithoutRoomID[] };
      }
    >;
  };
}

export type ClientEventWithoutRoomID = Omit<ClientEvent, "room_id">;

export type ClientEvent =
  | RoomCreateEvent
  | RoomMemberEvent
  | RoomNameEvent
  | RoomCanonicalAliasEvent
  | RoomAvatarEvent
  | UnimportantEvent<"m.room.join_rules">
  | UnimportantEvent<"m.room.power_levels">
  | UnimportantEvent<"m.room.server_acl">
  | UnimportantEvent<"m.room.guest_access">
  | UnimportantEvent<"m.room.history_visibility">;

interface StateEvent<T, C, S = string> {
  type: T;
  event_id: string;
  origin_server_ts: number;
  room_id: string;
  content: C;
  state_key: S;
}

export type RoomCreateEvent = StateEvent<
  "m.room.create",
  {
    creator?: string;
    room_version?: string;
  }
>;

export type RoomMemberEvent = StateEvent<
  "m.room.member",
  {
    membership: "invite" | "join" | "knock" | "leave" | "ban";
    reason?: string;
  }
>;

export type RoomNameEvent = StateEvent<
  "m.room.name",
  {
    name: string;
  }
>;

export type RoomCanonicalAliasEvent = StateEvent<
  "m.room.canonical_alias",
  {
    alias?: string | null;
    alt_aliases?: string[];
  }
>;

// TODO handle info fields for encrypted rooms
export type RoomAvatarEvent = StateEvent<
  "m.room.avatar",
  {
    /** Will be an mxc:// url */
    url?: string;
  }
>;

// TODO
type UnimportantEvent<T extends string> = StateEvent<T, unknown>;

interface Filter {
  room?: /* RoomFilter */ {
    state?: /* StateFilter */ {
      lazy_load_members?: boolean;
    };
  };
}

/**
 * `base_url`s in `DiscoveryInformation` may or may not include a
 * trailing slash. The spec is very clear that clients are supposed to
 * expect and accommodate both.
 */
function buildUrl(discovery: DiscoveryInformation, endpoint: string): URL {
  let base = discovery["m.homeserver"].base_url;
  if (base.endsWith("/")) base = base.replace(/\/+$/, "");

  return new URL(base + endpoint);
}

/**
 * Discover a matrix server at `hostname`, using the steps from the
 * specification.
 *
 * @see https://spec.matrix.org/v1.8/client-server-api/#server-discovery
 */
export async function discover(
  hostname: string,
): Promise<DiscoveryInformation> {
  const url = new URL(`https://${hostname}/.well-known/matrix/client`);

  const response = await fetch(url.toString());

  if (response.status == 404) {
    throw new Error(
      "The specified server had no auto auto-discovery document (404).",
    );
  }

  if (response.status != 200) {
    throw new Error(
      `The discovery server returned an unexpected status code (${response.status}).`,
    );
  }

  const json = await response.json();

  // Does this match the expected shape?
  if (
    json["m.homeserver"] === undefined ||
    json["m.homeserver"].base_url === undefined
  ) {
    throw new Error(
      "The discovery server responded with invalid or incomplete information.",
    );
  }

  // Is the contained homeserver URL actually valid?
  new URL(json["m.homeserver"].base_url);

  // TODO We're supposed to attempt to read the versions manifest of
  // the discovered server here to doubly-guarantee that it's real
  // TODO We're also supposed to validate the identity server

  return json as DiscoveryInformation;
}

/**
 * @see https://spec.matrix.org/v1.8/client-server-api/#post_matrixclientv3login
 */
export async function login(
  discovery: DiscoveryInformation,
  user: string,
  password: string,
): Promise<LoginResponse> {
  const url = buildUrl(discovery, "/_matrix/client/v3/login");

  const request: LoginPasswordRequest = {
    type: "m.login.password",
    identifier: {
      type: "m.id.user",
      user,
    },
    password,
  };

  const response = await fetch(url.toString(), {
    method: "POST",
    body: JSON.stringify(request),
  });

  if (response.status !== 200) {
    throw new Error(
      `Matrix homeserver responded with an unexpected status code (${response.status}).`,
    );
  }

  return await response.json();
}

export interface SyncOptions {
  filter?: string | Filter;
}

export const FILTER_LAZY_LOAD: Filter = {
  room: {
    state: {
      lazy_load_members: true,
    },
  },
};

export async function sync(
  discovery: DiscoveryInformation,
  token: LoginResponse,
  options: SyncOptions = {},
): Promise<SyncResponse> {
  const url = buildUrl(discovery, "/_matrix/client/v3/sync");

  if (typeof options.filter === "string")
    url.searchParams.append("filter", options.filter);
  else if (options.filter !== undefined)
    url.searchParams.append("filter", JSON.stringify(options.filter));

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token.access_token}`,
    },
  });

  if (response.status !== 200) {
    throw new Error(
      `Matrix homeserver responded with an unexpected status code (${response.status}).`,
    );
  }

  return await response.json();
}

/**
 * https://spec.matrix.org/v1.8/client-server-api/#get_matrixmediav3thumbnailservernamemediaid
 */
export function getThumbnailUrl(
  connection: Connection,
  serverName: string,
  mediaId: string,
) {
  const baseUrl = buildUrl(
    connection.discovery,
    `/_matrix/media/v3/thumbnail/${serverName}/${mediaId}`,
  );
  baseUrl.searchParams.append("allow_redirect", "true");
  baseUrl.searchParams.append("height", (96).toString());
  baseUrl.searchParams.append("width", (96).toString());
  return baseUrl.toString();
}

/**
 * Parse a Matrix Content URI (mxc://).
 *
 * https://spec.matrix.org/v1.8/client-server-api/#matrix-content-mxc-uris
 */
export function parseMxcUrl(url: string) {
  /// split a string at a `needle` exactly once, returning null if
  /// `needle` is not present in `haystack`
  function partition(
    haystack: string,
    needle: string,
  ): [string, string] | null {
    const index = haystack.indexOf(needle);
    if (index === -1) return null;
    return [haystack.substring(0, index), haystack.substring(index + 1)];
  }

  // url = mxc://<server-name>/<media-id>
  const withoutProtocol = url.substring("mxc://".length); // <server-name>/<media-id>

  const partitioned = partition(withoutProtocol, "/");
  if (partitioned === null)
    throw new Error("invalid Matrix Content URI: " + url);

  const [serverName, mediaId] = partitioned;
  return { serverName, mediaId };
}
