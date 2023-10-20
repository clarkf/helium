// @vitest-environment happy-dom

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

import App from "../src/App";

describe("<App />", () => {
  it("renders", () => {
    const { asFragment } = render(<App />);
    expect(asFragment()).toMatchSnapshot();
  });
});
