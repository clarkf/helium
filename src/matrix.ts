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
