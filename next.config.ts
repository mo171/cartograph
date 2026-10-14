import type { NextConfig } from "next";
import { assertEnv } from "./lib/env";

assertEnv();

const nextConfig: NextConfig = {};

export default nextConfig;
