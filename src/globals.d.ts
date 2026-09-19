// TypeScript 6 does not pick up Next's CSS declarations through the
// triple-slash reference alone, so a side-effect stylesheet import is an error
// without this.
declare module "*.css";
