import UIKit
import Capacitor
import WebKit

class ViewController: CAPBridgeViewController {
    override func viewDidLoad() {
        super.viewDidLoad()

        // Empêche iOS d'ajuster automatiquement le contentInset du WKScrollView
        // quand le clavier s'ouvre. Sans ça, iOS scrolle tout le contenu vers le haut
        // au niveau natif, avant que JavaScript ne puisse l'intercepter.
        webView?.scrollView.contentInsetAdjustmentBehavior = .never
    }

    override func webViewConfiguration(for instanceDescriptor: InstanceDescriptor) -> WKWebViewConfiguration {
        let config = super.webViewConfiguration(for: instanceDescriptor)
        // Autorise la lecture audio sans geste utilisateur préalable (nécessaire pour
        // la synchronisation audio du BlindTest en mode "tous les téléphones")
        config.mediaTypesRequiringUserActionForPlayback = []
        return config
    }
}
