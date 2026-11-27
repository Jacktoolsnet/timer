'use strict';

// Plesk/Passenger loads its entry point with require(). The application is ESM
// and initializes its database asynchronously, so it must be loaded with import().
import('./dist/server.js').catch(() => {
  // Never expose raw errors or environment variables in hosting diagnostics.
  console.error(JSON.stringify({event:'startup_failed',message:'Application could not be loaded. Check deployment files and installed dependencies.'}));
  // Passenger keeps stdin open, so exitCode alone would leave the app Starting.
  process.exit(1);
});
