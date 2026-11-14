# The app's own module (lib/offlineMap.ts): a saved-map pack that finishes downloading after
# iOS has closed the app still lands. Settings as expo-file-system's pod, which it works beside.
Pod::Spec.new do |s|
  s.name           = 'MapPackLanding'
  s.version        = '1.0.0'
  s.summary        = 'Keeps saved-map packs that finish after iOS has closed the app'
  s.description    = s.summary
  s.license        = 'UNLICENSED'
  s.author         = 'Kiwi Guide'
  s.homepage       = 'https://kiwiguide.app'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { :git => '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES'
  }

  s.source_files = "**/*.swift"
end
