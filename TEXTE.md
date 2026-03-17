Cannot update a component (`MindLinkLobbyContent`) while rendering a different component (`MindLinkLobbyContent`). To locate the bad setState() call inside `MindLinkLobbyContent`, follow the stack trace as described in https://react.dev/link/setstate-in-render
page.jsx:428 ReferenceError: WAITING_DURATION is not defined
    at useActiveLink (useActiveLink.js:379:55)
    at MindLinkDefendContent (page.jsx:57:29)


The above error occurred in the <MindLinkDefendContent> component. It was handled by the <ErrorBoundary> error boundary.
ErrorBoundary.jsx:21 ErrorBoundary caught: ReferenceError: WAITING_DURATION is not defined
    at useActiveLink (useActiveLink.js:379:55)
    at MindLinkDefendContent (page.jsx:57:29)
 
{componentStack: '\n    at MindLinkDefendContent (http://localhost:30…_modules_next_dist_client_aaee43fe._.js:12983:17)'}
