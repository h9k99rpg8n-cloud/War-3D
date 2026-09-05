export type WarComponentId = `war:${string}`;
export type WarComponentType = "component" | "subcomponent" | "system" | "api";
export type WarComponentHost = object;

export interface WarComponentDefinition<TConfig = Readonly<Record<string, unknown>>> {
  readonly id: WarComponentId;
  readonly version: number;
  readonly family: string;
  readonly type: WarComponentType;
  readonly parent: WarComponentId | null;
  readonly experimental: boolean;
  validate(config: TConfig): boolean;
  onRegister?(): void;
  onAttach?(host: WarComponentHost, config: TConfig): void;
}

export interface WarComponentAttachment<TConfig = Readonly<Record<string, unknown>>> {
  readonly definicion: WarComponentDefinition<TConfig>;
  readonly host: WarComponentHost;
  readonly configuracion: TConfig;
}

export type PreviewMode = "2d" | "3d";
export type PreviewCameraMovement = "static" | "horizontal" | "orbit";
export type Preview3DContent =
  | "block"
  | "entity"
  | "player"
  | "structure"
  | "terrain"
  | "world"
  | "skin"
  | "object";

export interface PreviewPixelConfig {
  readonly width: number;
  readonly height: number;
  readonly imageSmoothing: false;
}

export interface PreviewCameraConfig {
  readonly distance: number;
  readonly movement: PreviewCameraMovement;
}

export interface CreationPreviewContract {
  readonly mode: PreviewMode;
  readonly content3D?: Preview3DContent;
  readonly pixel: PreviewPixelConfig;
  readonly camera: PreviewCameraConfig;
}
