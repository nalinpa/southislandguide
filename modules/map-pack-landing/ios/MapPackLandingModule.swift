import ExpoModulesCore

public class MapPackLandingModule: Module {
  public func definition() -> ModuleDefinition {
    Name("MapPackLanding")

    // lib/offlineMap.ts calls this before it starts downloads. From then on this run of the
    // app has its own sessions open, and iOS's wake-ups for them are expo-file-system's.
    Function("downloadsStarted") {
      MapPackLandingAppDelegate.downloadsStartedHere = true
    }
  }
}
