/app/globals.css:3238:24
Parsing CSS source code failed
  3236 |   background: transparent;
  3237 | }
> 3238 | input::placeholder:not(.game-page *) {
       |                        ^
  3239 |   color: #9CA3AF;
  3240 |   font-weight: var(--font-normal);
  3241 | }

Pseudo-elements like '::before' or '::after' can't be followed by selectors like 'Delim('.')'

Import trace:
  Client Component Browser:
    ./app/globals.css [Client Component Browser]
    ./app/layout.js [Server Component]