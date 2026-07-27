import { defineConfig } from "@playwright/test";
import { createBaseConfig } from "../../shared/playwright-config/playwright.base.config";

export default defineConfig(createBaseConfig(__dirname));
