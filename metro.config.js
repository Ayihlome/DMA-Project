// The app shares its business logic with the website: types, seed data, inventory engine,
// store actions and analytics live in ../src/data (plus ../src/lib/format.ts).
// Metro only bundles files inside watched folders, so the shared folder is added here.
const path = require('path')
const { getDefaultConfig } = require('expo/metro-config')

const projectRoot = __dirname
const shared = path.resolve(projectRoot, '..', 'src')

const config = getDefaultConfig(projectRoot)
config.watchFolders = [shared]
// Keep Metro's default hierarchical lookup: pnpm's isolated layout stores Expo's
// transitive native modules beside Expo rather than linking all of them at the root.

module.exports = config
