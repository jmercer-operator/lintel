import { defineConfig, globalIgnores } from "eslint/config";
import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

export default defineConfig([
  globalIgnores([".next/**", "node_modules/**", "out/**", "next-env.d.ts"]),
  ...coreWebVitals,
  ...typescript,
  {
    rules: {
      // TODO: pre-existing demo components trip the new React 19 strict
      // hooks rules (setState-in-effect, component-in-render). Downgrade to
      // warnings until those components are refactored in a UI checkpoint.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/purity": "warn",
    },
  },
]);
