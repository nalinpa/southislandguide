import ExpoModulesCore

// Saved-map packs download in iOS background sessions (expo-file-system, lib/offlineMap.ts),
// each under a new random name. If iOS ends the app while one is going, the pack that
// finishes afterwards has nowhere to land: nothing in the new run of the app opens a session
// by that name, so iOS throws the file away and the pack downloads again on the next open.
//
// When iOS wakes the app for such a session, this opens it again by its name and moves each
// finished pack to where the app looks for one (Caches/offline-map-packs/<file name>). The
// app unpacks it as it does any pack it finds there at the right size.
//
// ponytail: once this run has started downloads of its own (downloadsStartedHere), a session
// left over from an earlier run is left alone, as before: opening a second session under a
// name expo-file-system has open is undefined. That pack downloads again, as it did before.
public class MapPackLandingAppDelegate: ExpoAppDelegateSubscriber {
  nonisolated(unsafe) static var downloadsStartedHere = false

  // expo-file-system's listener keeps iOS's handler too, and answers only for the sessions it
  // has open; Expo answers iOS once every listener has (ExpoAppDelegateSubscriberManager).
  private static let expoAnswers = NSSelectorFromString("invokeCompletionHandlerForSessionIdentifier:")

  // The sessions opened again, by name, until iOS has handed over their events.
  private var landing: [String: URLSession] = [:]

  public func application(
    _ application: UIApplication,
    handleEventsForBackgroundURLSession identifier: String,
    completionHandler: @escaping () -> Void
  ) {
    guard !Self.downloadsStartedHere, landing[identifier] == nil else {
      completionHandler()
      return
    }
    let expo = ExpoAppDelegateSubscriberRepository.subscribers
      .compactMap { $0 as? NSObject }
      .first { $0 !== self && $0.responds(to: Self.expoAnswers) }

    let delegate = PackLanding { [weak self] in
      self?.landing[identifier] = nil
      completionHandler()
      _ = expo?.perform(Self.expoAnswers, with: identifier)
    }
    let configuration = URLSessionConfiguration.background(withIdentifier: identifier)
    landing[identifier] = URLSession(configuration: configuration, delegate: delegate, delegateQueue: .main)
  }
}

// One session's events: each finished pack moved into place, then the answer to iOS.
private final class PackLanding: NSObject, URLSessionDownloadDelegate {
  // lib/offlineMap.ts's OFFLINE_PACKS_URL, without its version, so a new set still lands.
  private static let packsAddress = "https://tiles.blacksands.app/offline-map/"

  private let done: () -> Void

  init(done: @escaping () -> Void) {
    self.done = done
  }

  // iOS deletes the file at `location` once this returns, so it is moved now.
  func urlSession(_ session: URLSession, downloadTask: URLSessionDownloadTask, didFinishDownloadingTo location: URL) {
    guard
      let address = downloadTask.originalRequest?.url?.absoluteString,
      address.hasPrefix(Self.packsAddress),
      (downloadTask.response as? HTTPURLResponse)?.statusCode == 200
    else { return }

    let files = FileManager.default
    let packs = files.urls(for: .cachesDirectory, in: .userDomainMask)[0]
      .appendingPathComponent("offline-map-packs", isDirectory: true)
    let pack = packs.appendingPathComponent((address as NSString).lastPathComponent)
    try? files.createDirectory(at: packs, withIntermediateDirectories: true)
    try? files.removeItem(at: pack)
    try? files.moveItem(at: location, to: pack)
  }

  func urlSessionDidFinishEvents(forBackgroundURLSession session: URLSession) {
    session.finishTasksAndInvalidate()
    done()
  }
}
