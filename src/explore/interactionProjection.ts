// The current 3D interaction focus is projected into the mobile HUD every frame.
// This is an ephemeral view-only value; it must never affect gameplay or saves.
export const interactionProjection = {
  id: null as string | null,
  x: 0.5,
  y: 0.5,
  visible: false,
};

export function clearInteractionProjection() {
  interactionProjection.id = null;
  interactionProjection.visible = false;
}
