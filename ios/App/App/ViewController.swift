import UIKit
import Capacitor

class ViewController: CAPBridgeViewController {
    override func viewDidLoad() {
        super.viewDidLoad()

        // Empêche iOS d'ajuster automatiquement le contentInset du WKScrollView
        // quand le clavier s'ouvre. Sans ça, iOS scrolle tout le contenu vers le haut
        // au niveau natif, avant que JavaScript ne puisse l'intercepter.
        webView?.scrollView.contentInsetAdjustmentBehavior = .never
    }
}
