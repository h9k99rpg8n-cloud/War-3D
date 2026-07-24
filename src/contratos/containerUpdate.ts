export type GameMode = "supervivencia" | "creativo";
export type VisualStyleId = "traditional" | "pixelar";
export type JoystickSkinId = "traditional" | "dark" | "pixel";
export type PerformanceProfileId =
  | "basico"
  | "equilibrado"
  | "alto"
  | "personalizado";
export type CraftingStationId = "inventory" | "crafting_table" | "furnace";
export type HeldItemRenderMode = "sprite" | "model";

export interface PlayerCollisionSettings {
  readonly height: number;
  readonly width: number;
  readonly eyeHeight: number;
  readonly stepHeight: number;
}

export interface WorldSettings {
  readonly width: number;
  readonly depth: number;
  readonly templateId: string;
  readonly visualStyle: VisualStyleId;
  readonly experimentalWater: boolean;
  readonly loadDistance: number;
  readonly performanceProfile: PerformanceProfileId;
  readonly playerCollision: PlayerCollisionSettings;
}

export interface WorldTemplateSelectionConfig {
  readonly availableTemplates: readonly string[];
  readonly selectionMode: "random";
}

export interface CraftingIngredient {
  readonly itemId: string;
  readonly amount: number;
  readonly role?: "material" | "fuel";
}

export interface CraftingRecipe {
  readonly id: string;
  readonly station: CraftingStationId;
  readonly ingredients: readonly CraftingIngredient[];
  readonly result: {
    readonly itemId: string;
    readonly amount: number;
  };
  readonly shapeless?: boolean;
  readonly pattern?: readonly string[];
  readonly key?: Readonly<Record<string, string>>;
}

export interface InventoryStack {
  readonly itemId: string;
  amount: number;
  readonly infinite: boolean;
}

export interface WaterInteractionComponent {
  readonly blocksFlow: boolean;
  readonly allowsWaterInside: boolean;
  readonly displaceableByWater: boolean;
  readonly receivesWaterUpdates: boolean;
}

export interface VisualAssetDefinition {
  readonly id: string;
  readonly traditionalAsset: string;
  readonly pixelAsset?: string;
  readonly fallbackAsset: string;
}

export interface LoadingTip {
  readonly id: string;
  readonly textKey: string;
  readonly requiredFeatures?: readonly string[];
}

export interface FrameBudget {
  readonly worldUpdatesMs: number;
  readonly waterUpdatesMs: number;
  readonly entityUpdatesMs: number;
  readonly meshUpdatesMs: number;
}

export interface GlobalPerformanceSettings {
  readonly profile: PerformanceProfileId;
  readonly loadDistance: number;
  readonly pixelRatio: number;
  readonly fpsLimit: 0 | 30 | 45 | 60;
  readonly dynamicResolution: boolean;
  readonly shadows: boolean;
  readonly particles: number;
  readonly activeEntities: number;
}

export interface FurnaceState {
  readonly id: string;
  inputItemId: string | null;
  inputAmount: number;
  fuelItemId: string | null;
  fuelAmount: number;
  outputItemId: string | null;
  outputAmount: number;
  progress: number;
  remainingFuelTime: number;
}

export interface SpawnEggDefinition {
  readonly id: string;
  readonly entityId: string;
  readonly displayName: string;
  readonly traditionalTexture: string;
  readonly pixelTexture?: string;
}

export interface PlayerHeldItemConfig {
  readonly visible: boolean;
  readonly renderMode: HeldItemRenderMode;
  readonly scale?: number;
  readonly position?: Readonly<{ x: number; y: number; z: number }>;
}

export interface WarBehavior<TConfig = unknown> {
  readonly id: `war:${string}`;
  readonly version: number;
  readonly category: string;
  readonly experimental: boolean;
  validate(config: TConfig): boolean;
  onRegister?(): void;
  onAttach?(context: unknown, config: TConfig): void;
  onUpdate?(context: unknown, config: TConfig): void;
  onDetach?(context: unknown): void;
}

export interface RegionAddress {
  readonly x: number;
  readonly z: number;
  readonly key: `${number}:${number}`;
}

export interface SavedWorldV3 {
  readonly versionMundo: 3;
  readonly id: string;
  readonly nombreMundo: string;
  readonly modo: GameMode;
  readonly plantillaId: string;
  readonly tamanoMundo: 64 | 96 | 128 | 192 | 256;
  readonly semilla: number;
  readonly estiloVisual: VisualStyleId;
  readonly aguaExperimental: boolean;
  readonly distanciaCarga: number;
  readonly joystickSkin: JoystickSkinId;
  readonly colisionJugador: PlayerCollisionSettings;
  readonly progreso: unknown;
}

export interface FuturePluginExtensionPoint {
  readonly id: string;
  readonly registry:
    | "behaviors"
    | "content"
    | "recipes"
    | "entities"
    | "worldTemplates";
  readonly public: false;
  readonly status: "architectural-preparation";
}
