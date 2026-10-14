import type { Role } from "../../roles.ts";
import { toolConventions, toolRole } from "./conventions.ts";
import type { FrameworkAdapter } from "./types.ts";

// Express has no file conventions of its own; what it has is a folder habit
// that its generators and most tutorials share. Repositories spell the folders
// both ways, so singular and plural name the same role.
const FOLDER_ROLES: Record<string, Role> = {
  route: "router",
  routes: "router",
  router: "router",
  routers: "router",
  controller: "controller",
  controllers: "controller",
  service: "service",
  services: "service",
  model: "model",
  models: "model",
  middleware: "middleware",
  middlewares: "middleware",
};

// The folder nearest the file decides, so routes/v1/middleware/auth.js is
// middleware rather than a router.
function folderRole(path: string): Role | null {
  const folders = path.split("/").slice(0, -1);
  for (let i = folders.length - 1; i >= 0; i--) {
    const role = FOLDER_ROLES[folders[i] ?? ""];
    if (role) return role;
  }
  return null;
}

export const expressAdapter: FrameworkAdapter = {
  name: "Express",
  detect: (project) => project.dependencies.has("express"),
  excludeDirectory: () => null,
  reachedBy: toolConventions,
  // A test file under routes/ is still a test.
  roleOf: (file) => toolRole(file.path) ?? folderRole(file.path),
  // A pattern is assembled at runtime from the paths each router is mounted
  // on, which can be variables, arrays or regular expressions, through any
  // depth of app.use(). Reading one exactly would mean running the app.
  routes: () => ({
    routes: [],
    omitted: [],
    withheld: "Express puts each route together at runtime from the routers and paths it's mounted on",
  }),
};
