// Every test runs as a phone unless it asks: `require("@blacksands/ui").__setWide(true)`
// (and an optional window, e.g. { width: 951, height: 669 } for the Duo sideways).
// Jest's own window is 750 x 1334, over the 600 breakpoint, so the real hook would say
// "wide" everywhere. The flag and the size reset before each test.
const mockDefault = { width: 750, height: 1334 };
let mockWide = false;
let mockSize = mockDefault;

jest.mock("@blacksands/ui", () => {
  // The real kit pulls in reanimated, moti and worklets, which only some suites stub. A
  // suite that doesn't stub them still gets the hooks below; it just has no createUI.
  let actual = {};
  try {
    actual = jest.requireActual("@blacksands/ui");
  } catch {}
  return {
    ...actual,
    // Real hooks, like the engine's (they hold state): a screen that calls them after an early
    // return then fails a loading -> loaded rerender, as it would on a device.
    useWide: () => {
      require("react").useState(0);
      return mockWide;
    },
    // The engine's halves(): the window's middle, upright when taller than wide.
    useHalves: () => (require("react").useState(0), {
      ...mockSize,
      foldX: mockSize.width / 2,
      foldY: mockSize.height / 2,
      upright: mockSize.height > mockSize.width,
    }),
    __setWide: (value, next = mockDefault) => {
      mockWide = value;
      mockSize = next;
    },
  };
});

beforeEach(() => {
  mockWide = false;
  mockSize = mockDefault;
});
