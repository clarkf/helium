// @vitest-environment happy-dom

import {
  describe,
  it,
  vi,
  expect,
  beforeAll,
  afterAll,
  afterEach,
} from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupServer } from "msw/node";
import { rest } from "msw";

import Connect from "../../src/app/Connect";
import { resolveDiscovery, resolveEmptySync, resolveLogin } from "../handlers";

describe("<Connect />", () => {
  const server = setupServer(
    rest.get(
      "https://example.com/.well-known/matrix/client",
      resolveDiscovery("https://matrix.example.com"),
    ),
    rest.get(
      "https://404.example.com/.well-known/matrix/client",
      (_, res, ctx) => res(ctx.status(404), ctx.xml("<b>Not found!</b>")),
    ),
    rest.post(
      "https://matrix.example.com/_matrix/client/v3/login",
      resolveLogin((user, pass) => user == "user" && pass == "p@ssword"),
    ),
    rest.get(
      "https://matrix.example.com/_matrix/client/v3/sync",
      resolveEmptySync,
    ),
  );
  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
  afterAll(() => server.close());
  afterEach(() => server.resetHandlers());

  async function fillOut(host: string, userId: string, pass: string) {
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Host"), host);
    await user.type(screen.getByLabelText("User ID"), userId);
    await user.type(screen.getByLabelText("Password"), pass);
    await user.click(screen.getByRole("button"));
  }

  it("renders", () => {
    const { asFragment } = render(<Connect />);
    expect(asFragment()).toMatchSnapshot();
  });

  it("discovers the server", async () => {
    const spy = vi.fn();
    render(<Connect onConnect={spy} />);

    await fillOut("example.com", "user", "p@ssword");

    expect(spy).toHaveBeenCalledOnce();
  });

  it("displays an error on 404", async () => {
    render(<Connect />);

    await fillOut("404.example.com", "cool-user", "p@ssword");

    const err = await screen.findByRole("alert");
    expect(err).toBeVisible();
  });

  it("displays an error on invalid credentials", async () => {
    render(<Connect />);

    await fillOut("example.com", "bad-user", "pXssword");

    const err = await screen.findByRole("alert");
    expect(err).toBeVisible();
  });
});
