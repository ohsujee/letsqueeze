import UIKit
import Capacitor
import WebKit

class ViewController: CAPBridgeViewController {

    override func viewDidLoad() {
        super.viewDidLoad()

        // Désactive le scroll natif du WKScrollView principal.
        // Tout le scroll de l'app passe par CSS overflow:auto (scroll views séparés, non affectés).
        // Sans ça, iOS remonte le document quand le clavier s'ouvre → header disparaît.
        webView?.scrollView.contentInsetAdjustmentBehavior = .never
        webView?.scrollView.isScrollEnabled = false

        // KVO sur contentOffset : iOS appelle scrollRectToVisible: quand un input reçoit
        // le focus, ce qui change contentOffset même si isScrollEnabled = false.
        // On force le retour à zéro pour que le header reste visible.
        webView?.scrollView.addObserver(self, forKeyPath: "contentOffset", options: [.new], context: nil)

        // Notifications clavier UIKit → event JS 'native-keyboard-show/hide'.
        // Plus fiable que visualViewport : fire AVANT l'animation avec la hauteur finale exacte,
        // pas de valeurs intermédiaires, pas de race condition.
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(keyboardWillShow(_:)),
            name: UIResponder.keyboardWillShowNotification,
            object: nil
        )
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(keyboardWillHide(_:)),
            name: UIResponder.keyboardWillHideNotification,
            object: nil
        )
    }

    @objc private func keyboardWillShow(_ notification: Notification) {
        guard let keyboardFrame = notification.userInfo?[UIResponder.keyboardFrameEndUserInfoKey] as? CGRect else { return }

        let screenHeight = UIScreen.main.bounds.height
        // Espace occupé par le clavier depuis le bas de l'écran.
        // Sur iPad avec clavier flottant (pas ancré en bas), on retourne 0
        // pour ne pas décaler l'input zone inutilement.
        let isDockedAtBottom = keyboardFrame.maxY >= screenHeight - 20
        let keyboardHeight = isDockedAtBottom ? max(0, screenHeight - keyboardFrame.origin.y) : 0

        webView?.evaluateJavaScript("""
            document.documentElement.style.setProperty('--keyboard-height', '\(keyboardHeight)px');
            window.dispatchEvent(new CustomEvent('native-keyboard-show', { detail: { height: \(keyboardHeight) } }));
        """) { _, _ in }
    }

    @objc private func keyboardWillHide(_ notification: Notification) {
        webView?.evaluateJavaScript("""
            document.documentElement.style.setProperty('--keyboard-height', '0px');
            window.dispatchEvent(new CustomEvent('native-keyboard-hide'));
        """) { _, _ in }
    }

    override func observeValue(forKeyPath keyPath: String?, of object: Any?, change: [NSKeyValueChangeKey: Any]?, context: UnsafeMutableRawPointer?) {
        if keyPath == "contentOffset", let scrollView = object as? UIScrollView {
            if scrollView.contentOffset.y != 0 {
                scrollView.contentOffset = .zero
            }
        }
    }

    deinit {
        webView?.scrollView.removeObserver(self, forKeyPath: "contentOffset")
        NotificationCenter.default.removeObserver(self)
    }

    override func webViewConfiguration(for instanceConfiguration: InstanceConfiguration) -> WKWebViewConfiguration {
        let config = super.webViewConfiguration(for: instanceConfiguration)
        // Autorise la lecture audio sans geste utilisateur préalable (nécessaire pour
        // la synchronisation audio du BlindTest en mode "tous les téléphones")
        config.mediaTypesRequiringUserActionForPlayback = []
        return config
    }
}
