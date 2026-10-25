# ASTERION development

This is a Korean bridge-command space simulation. Keep the home screen focused on the system map and compact resource indicators. Navigation details, trading, assets, communications, ship status and logs open in dedicated dismissible panels. Preserve existing browser saves.

## Validate and deploy

The user requested automatic deployment after completed work. Vercel is connected to the repository's `main` branch. Run `npm test`, `npm run build`, and syntax checks for changed JavaScript before committing the finished change to `main`. Check that the matching commit's Vercel status succeeds, and report the deployed result. Do not report a successful deployment based only on a successful push. If the build fails, fix it and verify the new deployment. Do not create duplicate hosting projects or deployment jobs when the existing integration works.

Production URL: https://space-gamma-wheat.vercel.app

No packages are required. Node.js 22+ supports the development server and tests. API secrets remain in server environment variables.
