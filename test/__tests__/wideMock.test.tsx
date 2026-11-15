import { render } from "@testing-library/react-native";
import { Text } from "react-native";
import { useHalves, useWide } from "@blacksands/ui";

const { __setWide } = require("@blacksands/ui");

function Probe() {
  const h = useHalves();
  return <Text>{`${useWide() ? "wide" : "phone"} ${h.width}x${h.height} ${h.upright}`}</Text>;
}

describe("wide mock", () => {
  it("is phone by default", async () => {
    const view = await render(<Probe />);
    expect(view.getByText("phone 750x1334 true")).toBeTruthy();
  });
  it("is wide after __setWide(true)", async () => {
    __setWide(true);
    const view = await render(<Probe />);
    expect(view.getByText("wide 750x1334 true")).toBeTruthy();
  });
  it("takes a size for sideways", async () => {
    __setWide(true, { width: 951, height: 669 });
    const view = await render(<Probe />);
    expect(view.getByText("wide 951x669 false")).toBeTruthy();
  });
  it("is back to phone and 750 x 1334 before the next test", async () => {
    const view = await render(<Probe />);
    expect(view.getByText("phone 750x1334 true")).toBeTruthy();
  });
});
