// Cleanup script deprecated
// This repository now removes uploads when a product is deleted (delete-by-id).
// The dedicated cleanup CLI was used for one-off mass cleanup; it's been deprecated
// and left here as a no-op to avoid accidental execution.

console.log('cleanup-uploads script is deprecated. File removal is handled on product delete.');
process.exit(0);
