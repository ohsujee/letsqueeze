import UIKit
import Capacitor
import WebKit

class ViewController: CAPBridgeViewController {

    // MARK: - Setup

    override func viewDidLoad() {
        super.viewDidLoad()

        // Désactive le scroll natif du WKScrollView principal.
        // Tout le scroll de l'app passe par CSS overflow:auto (scroll views séparés).
        webView?.scrollView.contentInsetAdjustmentBehavior = .never
        webView?.scrollView.isScrollEnabled = false

        // Une seule notification couvre TOUS les états clavier :
        // show, hide, floating iPad, hardware keyboard, rotation, QuickType bar.
        // Remplace l'ancienne paire keyboardWillShow/keyboardWillHide.
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(keyboardWillChangeFrame(_:)),
            name: UIResponder.keyboardWillChangeFrameNotification,
            object: nil
        )
    }

    // MARK: - Keyboard

    @objc private func keyboardWillChangeFrame(_ notification: Notification) {
        guard let userInfo = notification.userInfo,
              let keyboardFrame = userInfo[UIResponder.keyboardFrameEndUserInfoKey] as? CGRect,
              let duration = userInfo[UIResponder.keyboardAnimationDurationUserInfoKey] as? Double,
              let curveRaw = userInfo[UIResponder.keyboardAnimationCurveUserInfoKey] as? UInt
        else { return }

        // Deux valeurs distinctes :
        //   insetsHeight → pour additionalSafeAreaInsets (sans safe-area existante, évite double-comptage)
        //   jsHeight     → pour el.style.bottom côté JS (hauteur visuelle complète, rétrocompat)
        let insetsHeight = computeInsetsHeight(from: keyboardFrame)
        let jsHeight = computeJsHeight(from: keyboardFrame)

        let safeDuration = duration > 0 ? duration : 0.25
        let animOptions = UIView.AnimationOptions(rawValue: curveRaw << 16)

        // Réduit le safe area inférieur en sync avec l'animation clavier.
        // env(safe-area-inset-bottom) en CSS augmente du même montant.
        // iOS voit l'input au-dessus du clavier → pas de scrollRectToVisible → zéro blink.
        UIView.animate(
            withDuration: safeDuration,
            delay: 0,
            options: [animOptions, .beginFromCurrentState]
        ) {
            self.additionalSafeAreaInsets.bottom = insetsHeight
            self.view.layoutIfNeeded()
        }

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

    /// Hauteur pour additionalSafeAreaInsets.
    /// Soustrait window.safeAreaInsets.bottom pour éviter le double-comptage :
    /// additionalSafeAreaInsets AJOUTE au safe area existant → env(safe-area-inset-bottom) = physique + insetsHeight.
    private func computeInsetsHeight(from keyboardFrame: CGRect) -> CGFloat {
        guard let window = view.window else { return 0 }
        let kbInWindow = window.convert(keyboardFrame, from: nil)
        // Clavier flottant ou non ancré au bas de l'écran → pas d'inset
        guard kbInWindow.maxY >= window.bounds.height - 20 else { return 0 }
        let viewInWindow = window.convert(view.frame, from: view.superview)
        let overlap = viewInWindow.maxY - kbInWindow.minY
        let safeBottom = window.safeAreaInsets.bottom
        let height = max(0, overlap - safeBottom)
        // iPad + hardware keyboard : QuickType bar (~44px) ne déclenche pas d'inset
        if UIDevice.current.userInterfaceIdiom == .pad && height < 120 { return 0 }
        return height
    }

    /// Hauteur visuelle complète pour l'event JS.
    /// Compatible avec el.style.bottom côté JS (même logique que l'ancien UIScreen.main.bounds.height
    /// mais basé sur view.window pour iPad split view / Stage Manager).
    private func computeJsHeight(from keyboardFrame: CGRect) -> CGFloat {
        guard let window = view.window else { return 0 }
        let kbInWindow = window.convert(keyboardFrame, from: nil)
        guard kbInWindow.maxY >= window.bounds.height - 20 else { return 0 }
        let viewInWindow = window.convert(view.frame, from: view.superview)
        let overlap = max(0, viewInWindow.maxY - kbInWindow.minY)
        // iPad : même seuil QuickType que computeInsetsHeight
        if UIDevice.current.userInterfaceIdiom == .pad {
            let netHeight = max(0, overlap - window.safeAreaInsets.bottom)
            if netHeight < 120 { return 0 }
        }
        return overlap
    }

    // MARK: - Rotation

    override func viewWillTransition(to size: CGSize, with coordinator: UIViewControllerTransitionCoordinator) {
        super.viewWillTransition(to: size, with: coordinator)
        // Reset l'inset pendant la transition de rotation.
        // keyboardWillChangeFrame re-fire automatiquement avec le nouveau frame correct.
        coordinator.animate(alongsideTransition: { _ in
            if self.additionalSafeAreaInsets.bottom > 0 {
                self.additionalSafeAreaInsets.bottom = 0
            }
        })
    }

    // MARK: - Cleanup

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    // MARK: - WKWebView Config

    override func webViewConfiguration(for instanceConfiguration: InstanceConfiguration) -> WKWebViewConfiguration {
        let config = super.webViewConfiguration(for: instanceConfiguration)
        // Autorise la lecture audio sans geste utilisateur (nécessaire pour le BlindTest)
        config.mediaTypesRequiringUserActionForPlayback = []
        return config
    }
}
