import UIKit
import Capacitor
import WebKit
import MediaPlayer
import ObjectiveC

class ViewController: CAPBridgeViewController {

    // MARK: - Setup

    override func viewDidLoad() {
        super.viewDidLoad()

        // Désactive le scroll natif du WKScrollView principal.
        // Tout le scroll de l'app passe par CSS overflow:auto (scroll views séparés).
        webView?.scrollView.contentInsetAdjustmentBehavior = .never
        webView?.scrollView.isScrollEnabled = false

        // Évite le flash blanc au lancement avant que le dark theme JS se charge.
        webView?.isOpaque = false
        webView?.backgroundColor = UIColor(red: 0.04, green: 0.04, blue: 0.06, alpha: 1) // #0a0a0f

        // Empêche l'écran de se verrouiller pendant l'app.
        // Complète le hook JS useWakeLock (navigator.wakeLock) pour iOS 15.x
        // qui ne supporte pas la Web Wake Lock API.
        UIApplication.shared.isIdleTimerDisabled = true

        // Désactive les contrôles "Now Playing" sur l'écran de verrouillage.
        // WKWebView enregistre automatiquement l'audio BlindTest comme source
        // Now Playing → iOS affiche un faux lecteur Spotify. On supprime ça.
        MPNowPlayingInfoCenter.default().nowPlayingInfo = [:]
        let cc = MPRemoteCommandCenter.shared()
        cc.playCommand.isEnabled = false
        cc.pauseCommand.isEnabled = false
        cc.stopCommand.isEnabled = false
        cc.nextTrackCommand.isEnabled = false
        cc.previousTrackCommand.isEnabled = false
        cc.changePlaybackRateCommand.isEnabled = false
        cc.seekForwardCommand.isEnabled = false
        cc.seekBackwardCommand.isEnabled = false
        cc.changePlaybackPositionCommand.isEnabled = false

        // Une seule notification couvre TOUS les états clavier :
        // show, hide, floating iPad, hardware keyboard, rotation, QuickType bar.
        // Remplace l'ancienne paire keyboardWillShow/keyboardWillHide.
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(keyboardWillChangeFrame(_:)),
            name: UIResponder.keyboardWillChangeFrameNotification,
            object: nil
        )

        // KVO : annule le scroll automatique que iOS déclenche via scrollRectToVisible
        // quand un <input> reçoit le focus (contourne isScrollEnabled = false).
        // Résultat : zéro blink — la page ne remonte plus d'1 frame puis redescend.
        webView?.scrollView.addObserver(self, forKeyPath: "contentOffset", options: [.new], context: nil)

        // Retire la barre d'accessoires clavier (↑ ↓ ✓) au-dessus du clavier iOS.
        // Cette barre sert à naviguer entre champs de formulaire — inutile dans l'app
        // car chaque page a au plus un seul <input>.
        // Technique : swizzle inputAccessoryView sur WKContentView pour retourner nil.
        // Utilisée par des milliers d'apps Capacitor/Cordova en production (App Store safe).
        removeInputAccessoryView()
    }

    // MARK: - Input Accessory View Removal

    private func removeInputAccessoryView() {
        guard let webView = webView else { return }

        for subview in webView.scrollView.subviews {
            let className = String(describing: type(of: subview))
            guard className.hasPrefix("WKContent") else { continue }

            let newClassName = "\(className)_NoInputAccessory"
            let noAccessoryClass: AnyClass

            if let existingClass = NSClassFromString(newClassName) {
                noAccessoryClass = existingClass
            } else {
                guard let targetClass = object_getClass(subview),
                      let newClass = objc_allocateClassPair(targetClass, newClassName, 0) else { continue }

                // Override inputAccessoryView pour retourner nil
                let nilBlock: @convention(block) (Any) -> Any? = { _ in nil }
                let nilIMP = imp_implementationWithBlock(nilBlock)
                class_addMethod(newClass, #selector(getter: UIResponder.inputAccessoryView), nilIMP, "@@:")
                objc_registerClassPair(newClass)
                noAccessoryClass = newClass
            }

            object_setClass(subview, noAccessoryClass)
        }
    }

    // MARK: - Anti-blink KVO

    override func observeValue(forKeyPath keyPath: String?, of object: Any?, change: [NSKeyValueChangeKey: Any]?, context: UnsafeMutableRawPointer?) {
        if keyPath == "contentOffset",
           let sv = webView?.scrollView,
           sv.contentOffset != .zero {
            // Annule l'animation Core Animation qui déplace le contentOffset,
            // puis remet à zéro immédiatement (synchrone, sans animation).
            sv.layer.removeAllAnimations()
            sv.setContentOffset(.zero, animated: false)
            return
        }
        super.observeValue(forKeyPath: keyPath, of: object, change: change, context: context)
    }

    // MARK: - Keyboard

    @objc private func keyboardWillChangeFrame(_ notification: Notification) {
        guard let userInfo = notification.userInfo,
              let keyboardFrame = userInfo[UIResponder.keyboardFrameEndUserInfoKey] as? CGRect
        else { return }

        // Hauteur visuelle complète pour le positionnement JS
        let jsHeight = computeJsHeight(from: keyboardFrame)

        // Dispatch JS :
        //   - hauteur visuelle pour le positionnement (el.style.bottom)
        //   - --sem-input-safe-bottom=0px quand clavier ouvert pour neutraliser
        //     le padding env(safe-area-inset-bottom) qui inclurait sinon la hauteur clavier
        let isShowing = jsHeight > 0
        let eventName = isShowing ? "native-keyboard-show" : "native-keyboard-hide"
        let safeBottomJs = isShowing
            ? "document.documentElement.style.setProperty('--sem-input-safe-bottom', '0px');"
            : "document.documentElement.style.removeProperty('--sem-input-safe-bottom');"
        let js = """
            document.documentElement.style.setProperty('--keyboard-height', '\(jsHeight)px');
            \(safeBottomJs)
            window.dispatchEvent(new CustomEvent('\(eventName)', {
                detail: { height: \(jsHeight) }
            }));
        """
        webView?.evaluateJavaScript(js, completionHandler: nil)
    }

    /// Hauteur visuelle complète pour l'event JS.
    /// Compatible avec el.style.bottom côté JS (basé sur view.window pour iPad split view / Stage Manager).
    private func computeJsHeight(from keyboardFrame: CGRect) -> CGFloat {
        guard let window = view.window else { return 0 }
        let kbInWindow = window.convert(keyboardFrame, from: nil)
        guard kbInWindow.maxY >= window.bounds.height - 20 else { return 0 }
        let viewInWindow = window.convert(view.frame, from: view.superview)
        let overlap = max(0, viewInWindow.maxY - kbInWindow.minY)
        // iPad : QuickType bar (~44px) ne déclenche pas d'event
        if UIDevice.current.userInterfaceIdiom == .pad {
            let netHeight = max(0, overlap - window.safeAreaInsets.bottom)
            if netHeight < 120 { return 0 }
        }
        return overlap
    }

    // MARK: - Rotation

    override func viewWillTransition(to size: CGSize, with coordinator: UIViewControllerTransitionCoordinator) {
        super.viewWillTransition(to: size, with: coordinator)
        // keyboardWillChangeFrame re-fire automatiquement avec le nouveau frame correct.
    }

    // MARK: - Cleanup

    deinit {
        webView?.scrollView.removeObserver(self, forKeyPath: "contentOffset")
        NotificationCenter.default.removeObserver(self)
    }

    // MARK: - WKWebView Config

    override func webViewConfiguration(for instanceConfiguration: InstanceConfiguration) -> WKWebViewConfiguration {
        let config = super.webViewConfiguration(for: instanceConfiguration)
        // Autorise la lecture audio sans geste utilisateur (nécessaire pour le BlindTest)
        config.mediaTypesRequiringUserActionForPlayback = []
        return config
    }

    // MARK: - White Screen Recovery

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        // iOS 18.x : race condition au lancement — WKWebContent process tué avant que
        // la navigation soit complète. Capacitor fait reload() sur about:blank → écran blanc.
        // On recharge directement l'URL de production au lieu de laisser reload() agir.
        if let url = URL(string: "https://app.gigglz.fun") {
            webView.load(URLRequest(url: url))
        }
    }
}
