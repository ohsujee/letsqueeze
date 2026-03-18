import Capacitor
import AVFoundation
import MediaPlayer

@objc(NativeAudioPlayerPlugin)
public class NativeAudioPlayerPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeAudioPlayerPlugin"
    public let jsName = "NativeAudioPlayer"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "play", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pause", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "resume", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setVolume", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getCurrentTime", returnType: CAPPluginReturnPromise),
    ]

    private var player: AVPlayer?
    private var playerItem: AVPlayerItem?

    // MARK: - Play

    @objc func play(_ call: CAPPluginCall) {
        guard let urlString = call.getString("url"),
              let url = URL(string: urlString) else {
            call.reject("Missing or invalid url")
            return
        }

        let startTime = call.getDouble("startTime") ?? 0
        let volume = Float(call.getDouble("volume") ?? 0.8)

        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }

            // Interrompre les autres apps audio (Spotify, etc.) pendant la lecture
            try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
            try? AVAudioSession.sharedInstance().setActive(true)

            // Cleanup précédent
            self.player?.pause()

            // Créer le player
            let item = AVPlayerItem(url: url)
            self.playerItem = item
            self.player = AVPlayer(playerItem: item)
            self.player?.volume = volume

            // Supprimer les contrôles Now Playing sur le lock screen
            MPNowPlayingInfoCenter.default().nowPlayingInfo = [:]

            if startTime > 0 {
                let cmTime = CMTime(seconds: startTime, preferredTimescale: 1000)
                self.player?.seek(to: cmTime) { finished in
                    if finished {
                        self.player?.play()
                    }
                    call.resolve()
                }
            } else {
                self.player?.play()
                call.resolve()
            }
        }
    }

    // MARK: - Stop

    @objc func stop(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            self?.player?.pause()
            self?.player = nil
            self?.playerItem = nil

            // Remettre mixWithOthers pour ne pas couper les autres apps au repos
            try? AVAudioSession.sharedInstance().setCategory(
                .playback, mode: .default, options: [.mixWithOthers]
            )

            call.resolve()
        }
    }

    // MARK: - Pause

    @objc func pause(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            self?.player?.pause()
            call.resolve()
        }
    }

    // MARK: - Resume

    @objc func resume(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            self?.player?.play()
            call.resolve()
        }
    }

    // MARK: - Set Volume

    @objc func setVolume(_ call: CAPPluginCall) {
        let volume = Float(call.getDouble("volume") ?? 0.8)
        DispatchQueue.main.async { [weak self] in
            self?.player?.volume = volume
            call.resolve()
        }
    }

    // MARK: - Get Current Time

    @objc func getCurrentTime(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            let time = self?.player?.currentTime().seconds ?? 0
            let isPlaying = self?.player?.rate ?? 0 > 0
            call.resolve([
                "currentTime": time,
                "isPlaying": isPlaying
            ])
        }
    }
}
