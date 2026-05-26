import type { RegistryType } from "../config/config.types.js";

import { AcrAdapter } from "./acr.adapter.js";
import { DockerRegistryAdapter } from "./docker-registry.adapter.js";
import { HarborAdapter } from "./harbor.adapter.js";
import type { RegistryAdapter } from "./registry.types.js";

export function getRegistryAdapter(type: RegistryType): RegistryAdapter {
  switch (type) {
    case "docker-registry":
      return new DockerRegistryAdapter();
    case "harbor":
      return new HarborAdapter();
    case "acr":
      return new AcrAdapter();
  }
}
