VM5020 <anonymous>:1 Error: Module [project]/node_modules/@phosphor-icons/react/dist/csr/MusicNote.es.js [app-client] (ecmascript) was instantiated because it was required from module [project]/components/transitions/GameEndTransition.jsx [app-client] (ecmascript), but the module factory is not available. It might have been deleted in an HMR update.
    at module evaluation (GameEndTransition.jsx:5:1)
    at module evaluation (index.js:8:1)
    at module evaluation (page.jsx:32:1)
    at module evaluation (page.jsx:7:1)


The above error occurred in the <ClientPageRoot> component. It was handled by the <ErrorBoundary> error boundary.

ErrorBoundary.jsx:22 ErrorBoundary caught: Error: Module [project]/node_modules/@phosphor-icons/react/dist/csr/MusicNote.es.js [app-client] (ecmascript) was instantiated because it was required from module [project]/components/transitions/GameEndTransition.jsx [app-client] (ecmascript), but the module factory is not available. It might have been deleted in an HMR update.
    at module evaluation (GameEndTransition.jsx:5:1)
    at module evaluation (index.js:8:1)
    at module evaluation (page.jsx:32:1)
    at module evaluation (page.jsx:7:1)
 
{componentStack: '\n    at ClientPageRoot (<anonymous>)\n    at Segmen…_modules_next_dist_client_aaee43fe._.js:12983:17)'}
